const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastErr = err;
            if (i < attempts) await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw lastErr;
}

// Get video from Nayan AllDown API
async function getVideoFromAllDown(ytUrl) {
    let videoId = '';
    if (ytUrl.includes('youtu.be/')) {
        videoId = ytUrl.split('youtu.be/')[1].split('?')[0];
    } else if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        videoId = urlParams.get('v');
    }

    if (!videoId) throw new Error('Invalid URL');

    const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data) {
            const data = res.data.data;
            const videoUrl = data.high || data.low;
            
            if (!videoUrl) throw new Error('No video URL');
            
            const fileRes = await tryRequest(() => axios.get(videoUrl, {
                ...AXIOS_DEFAULTS,
                responseType: 'arraybuffer'
            }));
            
            return {
                buffer: Buffer.from(fileRes.data),
                title: data.title,
                thumbnail: data.thumbnail,
                source: 'Nayan AllDown'
            };
        }
        throw new Error('API response invalid');
    } catch (err) {
        throw new Error(`AllDown failed: ${err.message}`);
    }
}

// Get video from Nayan YouTube API (best quality)
async function getVideoFromYoutubeAPI(ytUrl) {
    let videoId = '';
    if (ytUrl.includes('youtu.be/')) {
        videoId = ytUrl.split('youtu.be/')[1].split('?')[0];
    } else if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        videoId = urlParams.get('v');
    }

    if (!videoId) throw new Error('Invalid URL');

    const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const title = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;
            const author = res.data.data.data.author;
            
            // Find best video format (highest quality)
            let bestVideo = null;
            let bestQuality = 0;
            
            // Priority: 2160p > 1440p > 1080p > 720p > 480p > 360p
            const qualityPriority = {
                '2160p': 100,
                '1440p': 90,
                '1080p': 80,
                '720p': 70,
                '480p': 60,
                '360p': 50,
                '240p': 40,
                '144p': 30
            };
            
            for (const format of formats) {
                if (format.type === 'video_only' || format.type === 'video_with_audio') {
                    let quality = format.quality || format.label || '';
                    let priority = 0;
                    
                    // Check quality from label or quality field
                    for (const [q, p] of Object.entries(qualityPriority)) {
                        if (quality.includes(q)) {
                            priority = p;
                            break;
                        }
                    }
                    
                    // Prefer video_with_audio over video_only
                    if (format.type === 'video_with_audio') {
                        priority += 5;
                    }
                    
                    if (priority > bestQuality) {
                        bestQuality = priority;
                        bestVideo = format;
                    }
                }
            }
            
            if (bestVideo?.url) {
                const fileRes = await tryRequest(() => axios.get(bestVideo.url, {
                    ...AXIOS_DEFAULTS,
                    responseType: 'arraybuffer'
                }));
                
                return {
                    buffer: Buffer.from(fileRes.data),
                    title: title,
                    thumbnail: thumbnail,
                    author: author,
                    quality: bestVideo.quality || bestVideo.label,
                    source: 'Nayan YouTube API'
                };
            }
        }
        throw new Error('No video format found');
    } catch (err) {
        throw new Error(`YouTube API failed: ${err.message}`);
    }
}

// Main function - tries AllDown first, then YouTube API
async function getYoutubeVideo(ytUrl) {
    try {
        console.log('[VIDEO] Trying AllDown API...');
        return await getVideoFromAllDown(ytUrl);
    } catch (allDownErr) {
        console.log('[VIDEO] AllDown failed, trying YouTube API...');
        try {
            return await getVideoFromYoutubeAPI(ytUrl);
        } catch (ytErr) {
            throw new Error('All APIs failed');
        }
    }
}

// Video Command - Download MP4
async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: '🎥 *Download Video*\n\n📝 .video song name\n🔗 .video youtube_url' 
            });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let videoUrl = query;
        let videoInfo = null;
        let thumbnailUrl = '';

        // Search if not YouTube URL
        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const searchResults = await yts(query);
            const videos = searchResults?.videos;
            
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { text: '❌ Video not found' });
            }

            videoInfo = videos[0];
            videoUrl = videoInfo.url;
            thumbnailUrl = videoInfo.thumbnail;
            
            const infoText = `🎥 *${videoInfo.title}*\n⏱️ ${videoInfo.timestamp} | 👤 ${videoInfo.author.name}\n👁️ ${(videoInfo.views || 0).toLocaleString()}\n\n⬇️ Downloading video...`;
            
            if (thumbnailUrl) {
                await sock.sendMessage(chatId, {
                    image: { url: thumbnailUrl },
                    caption: infoText
                });
            } else {
                await sock.sendMessage(chatId, { text: infoText });
            }
        } else {
            await sock.sendMessage(chatId, { text: '⬇️ Processing video...' });
        }

        const processMsg = await sock.sendMessage(chatId, { text: '⏳ Loading...' });

        const videoData = await getYoutubeVideo(videoUrl);

        await sock.sendMessage(chatId, { delete: processMsg.key });

        // Send thumbnail as normal image (if available and not sent yet)
        if (videoData.thumbnail && !thumbnailUrl) {
            await sock.sendMessage(chatId, {
                image: { url: videoData.thumbnail },
                caption: `🎥 *${videoData.title.substring(0, 50)}*\n🎚️ ${videoData.quality || 'HD'}\n📡 ${videoData.source}`
            });
        }

        // Send video
        const videoMessage = {
            video: videoData.buffer,
            mimetype: 'video/mp4',
            caption: `✅ *${videoData.title.substring(0, 50)}*\n📡 ${videoData.source}`,
            fileName: `${videoData.title.substring(0, 40)}.mp4`
        };

        await sock.sendMessage(chatId, videoMessage);
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[VIDEO] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '❌ Error: Try again later' });
    }
}

// Handle video download for button responses
async function handleVideoDownload(sock, chatId, ytUrl, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        const videoData = await getYoutubeVideo(ytUrl);

        await sock.sendMessage(chatId, {
            video: videoData.buffer,
            mimetype: 'video/mp4',
            caption: `✅ Video ready!\n> Mickey Glitch`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await sock.sendMessage(chatId, { text: "❌ Download failed: " + e.message }, { quoted: message });
    }
}

// Handle audio download for button responses
async function handleAudioDownload(sock, chatId, ytUrl, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
        
        // Reuse the audio function from play.js or implement here
        const { getYoutubeAudio } = require('./play.js');
        const audioData = await getYoutubeAudio(ytUrl);
        
        await sock.sendMessage(chatId, {
            audio: audioData.buffer,
            mimetype: 'audio/mp4',
            ptt: false
        }, { quoted: message });
        
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await sock.sendMessage(chatId, { text: "❌ Download failed: " + e.message }, { quoted: message });
    }
}

module.exports = videoCommand;
module.exports.handleAudioDownload = handleAudioDownload;
module.exports.handleVideoDownload = handleVideoDownload;
module.exports.getYoutubeVideo = getYoutubeVideo;