const axios = require('axios');
const cheerio = require('cheerio');
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

function extractYoutubeVideoId(ytUrl) {
    if (!ytUrl) return '';

    if (ytUrl.includes('youtu.be/')) {
        return ytUrl.split('youtu.be/')[1].split('?')[0];
    }

    if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        return urlParams.get('v') || '';
    }

    return '';
}

class YouTubeMP4Downloader {
    constructor() {
        this.baseUrl = 'https://youtubemp4.to';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Accept-Language': 'id-ID,id;q=0.9',
            Referer: `${this.baseUrl}/HAOT/`,
            Origin: this.baseUrl
        };
    }

    async fetchCookies() {
        try {
            const res = await axios.head(`${this.baseUrl}/HAOT/`, { headers: this.headers });
            return res.headers['set-cookie'] ? res.headers['set-cookie'].join('; ') : '';
        } catch {
            return '';
        }
    }

    async downloadVideo(url) {
        const cookies = await this.fetchCookies();
        const headers = {
            ...this.headers,
            Cookie: cookies,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        };

        try {
            const { data } = await axios.post(
                `${this.baseUrl}/download_ajax/`,
                new URLSearchParams({ url }).toString(),
                { headers }
            );
            return this.parseDownloadPage(data);
        } catch (error) {
            console.error('[VIDEO] [YouTubeMP4] ajax fetch failed:', error.message);
            return null;
        }
    }

    parseDownloadPage(data) {
        const $ = cheerio.load(data?.result || '');
        const title = $('.meta h2').text().trim() || 'Unknown';
        const thumbnail = $('.poster img').attr('src') || '';
        const allFormats = [];

        $('.results-other table tbody tr').each((_, el) => {
            const qualityText = $(el).find('td').eq(0).text().trim();
            const sizeText = $(el).find('td').eq(1).text().trim();
            const linkUrl = $(el).find('td a').attr('href') || '';

            if (linkUrl) {
                allFormats.push({ quality: qualityText, size: sizeText, link: linkUrl });
            }
        });

        const audioFormats = allFormats.filter(f => /audio|mp3|kbps|kbit/i.test(f.quality));
        const videoFormats = allFormats.filter(f => {
            if (/audio|mp3|kbps|kbit/i.test(f.quality)) return false;
            const match = f.quality.match(/\d+/);
            if (match) return ['480', '720', '1080'].includes(match[0]);
            return false;
        });

        return { title, thumbnail, audio: audioFormats[0] || null, video: videoFormats };
    }
}

async function getVideoFromYouTubeMP4Scraper(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL for YouTubeMP4 scraper');

    const downloader = new YouTubeMP4Downloader();
    const result = await downloader.downloadVideo(ytUrl);

    const bestVideo = result?.video?.[0];
    if (!bestVideo?.link) {
        throw new Error('YouTubeMP4 scraper returned no video link');
    }

    const fileRes = await tryRequest(() => axios.get(bestVideo.link, {
        headers: AXIOS_DEFAULTS.headers,
        responseType: 'arraybuffer'
    }));

    return {
        buffer: Buffer.from(fileRes.data),
        title: result.title || 'Unknown Title',
        thumbnail: result.thumbnail,
        quality: bestVideo.quality || 'MP4',
        source: 'YouTubeMP4.to'
    };
}

// Get video from Nayan AllDown API
async function getVideoFromAllDown(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);

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
    const videoId = extractYoutubeVideoId(ytUrl);

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

// Main function - tries YouTubeMP4 scraper first, then AllDown, then YouTube API
async function getYoutubeVideo(ytUrl) {
    try {
        console.log('[VIDEO] Trying YouTubeMP4 scraper...');
        return await getVideoFromYouTubeMP4Scraper(ytUrl);
    } catch (scraperErr) {
        console.log(`[VIDEO] YouTubeMP4 failed: ${scraperErr.message}, trying AllDown API...`);
        try {
            return await getVideoFromAllDown(ytUrl);
        } catch (allDownErr) {
            console.log(`[VIDEO] AllDown failed: ${allDownErr.message}, trying YouTube API...`);
            try {
                return await getVideoFromYoutubeAPI(ytUrl);
            } catch (ytErr) {
                throw new Error(`All download sources failed: ${ytErr.message}`);
            }
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