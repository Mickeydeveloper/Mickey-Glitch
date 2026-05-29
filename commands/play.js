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

// Function to get audio from Nayan AllDown API
async function getAudioFromAllDown(ytUrl) {
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
            
            if (!videoUrl) throw new Error('No download URL');
            
            const fileRes = await tryRequest(() => axios.get(videoUrl, {
                ...AXIOS_DEFAULTS,
                responseType: 'arraybuffer'
            }));
            
            return {
                buffer: Buffer.from(fileRes.data),
                title: data.title,
                thumbnail: data.thumbnail,
                source: 'Nayan AllDown',
                mimeType: 'audio/mp4'
            };
        }
        throw new Error('API response invalid');
    } catch (err) {
        throw new Error(`AllDown failed: ${err.message}`);
    }
}

// Function to get audio from Nayan YouTube API
async function getAudioFromYoutubeAPI(ytUrl) {
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
            
            let bestAudio = null;
            let priority = 0;
            
            for (const format of formats) {
                if (format.type === 'audio') {
                    let p = 0;
                    if (format.formatId === '251') p = 100;
                    else if (format.formatId === '250') p = 90;
                    else if (format.formatId === '249') p = 85;
                    else if (format.formatId === '140') p = 80;
                    else if (format.formatId === '139') p = 70;
                    
                    if (p > priority) {
                        priority = p;
                        bestAudio = format;
                    }
                }
            }
            
            if (!bestAudio) {
                for (const format of formats) {
                    if (format.type === 'video_with_audio' && format.mimeType?.includes('mp4')) {
                        bestAudio = format;
                        break;
                    }
                }
            }
            
            if (bestAudio?.url) {
                const fileRes = await tryRequest(() => axios.get(bestAudio.url, {
                    ...AXIOS_DEFAULTS,
                    responseType: 'arraybuffer'
                }));
                
                return {
                    buffer: Buffer.from(fileRes.data),
                    title: title,
                    thumbnail: thumbnail,
                    author: author,
                    quality: bestAudio.quality || bestAudio.label,
                    source: 'Nayan YouTube API',
                    mimeType: 'audio/mp4'
                };
            }
        }
        throw new Error('No audio format found');
    } catch (err) {
        throw new Error(`YouTube API failed: ${err.message}`);
    }
}

async function getYoutubeAudio(ytUrl) {
    try {
        console.log('[PLAY] Trying AllDown API...');
        return await getAudioFromAllDown(ytUrl);
    } catch (allDownErr) {
        console.log('[PLAY] AllDown failed, trying YouTube API...');
        try {
            return await getAudioFromYoutubeAPI(ytUrl);
        } catch (ytErr) {
            throw new Error('All APIs failed');
        }
    }
}

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: '🎵 *Play Music*\n\n📝 .play song name\n🔗 .play youtube_url' 
            });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let videoUrl = query;
        let videoInfo = null;
        let thumbnailUrl = '';

        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const searchResults = await yts(query);
            const videos = searchResults?.videos;
            
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { text: '❌ Song not found' });
            }

            videoInfo = videos[0];
            videoUrl = videoInfo.url;
            thumbnailUrl = videoInfo.thumbnail;
            
            const infoText = `🎵 *${videoInfo.title}*\n⏱️ ${videoInfo.timestamp} | 👤 ${videoInfo.author.name}\n👁️ ${(videoInfo.views || 0).toLocaleString()}\n\n⬇️ Downloading...`;
            
            if (thumbnailUrl) {
                await sock.sendMessage(chatId, {
                    image: { url: thumbnailUrl },
                    caption: infoText
                });
            } else {
                await sock.sendMessage(chatId, { text: infoText });
            }
        } else {
            await sock.sendMessage(chatId, { text: '⬇️ Processing...' });
        }

        const processMsg = await sock.sendMessage(chatId, { text: '⏳ Loading...' });

        const audioData = await getYoutubeAudio(videoUrl);

        await sock.sendMessage(chatId, { delete: processMsg.key });

        // Send thumbnail as normal image (if available and not sent yet)
        if (audioData.thumbnail && !thumbnailUrl) {
            await sock.sendMessage(chatId, {
                image: { url: audioData.thumbnail },
                caption: `🎵 *${audioData.title.substring(0, 50)}*\n📡 ${audioData.source}`
            });
        }

        // Send audio
        const audioMessage = {
            audio: audioData.buffer,
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: `${audioData.title.substring(0, 40)}.mp4`
        };

        await sock.sendMessage(chatId, audioMessage);
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '❌ Error: Try again later' });
    }
}

module.exports = playCommand;