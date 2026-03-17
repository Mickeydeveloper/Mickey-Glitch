const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 2) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

// API MPYA (Nayan Video Downloader) - Imara zaidi
async function getNayanVideo(youtubeUrl) {
    const apiUrl = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    
    if (res?.data?.status && res?.data?.data?.video) {
        return {
            download: res.data.data.video_hd || res.data.data.video,
            title: res.data.data.title,
            thumbnail: res.data.data.thumb
        };
    }
    throw new Error('Nayan API returned no video');
}

// Fallback API (Hansa)
async function getHansaVideo(youtubeUrl) {
    const apiUrl = `https://apis-starlights-team.koyeb.app/starlight/youtube-mp4?url=${encodeURIComponent(youtubeUrl)}&format=360p`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.result?.download_url) {
        return {
            download: res.data.result.download_url,
            title: res.data.result.title,
            thumbnail: res.data.result.thumbnail
        };
    }
    throw new Error('Hansa API failed');
}

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, { text: '❌ *Unataka video gani?*\nMfano: .video Diamond Platnumz' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        let videoUrl = searchQuery;
        let videoTitle = '';
        let videoThumbnail = '';

        // Kama siyo link, tafuta YouTube
        if (!searchQuery.startsWith('http')) {
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Video haikupatikana!' }, { quoted: message });
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // Jaribu Nayan kwanza, kisha Hansa kama fallback
        let videoData;
        try {
            videoData = await getNayanVideo(videoUrl);
        } catch (e) {
            videoData = await getHansaVideo(videoUrl);
        }

        const finalTitle = videoData.title || videoTitle || 'Video';

        // Stream video directly to WhatsApp
        try {
            await sock.sendMessage(chatId, {
                video: { url: videoData.download },
                mimetype: 'video/mp4',
                fileName: `${finalTitle}.mp4`,
                caption: `✅ *Mickey Infor Technology*\n\n🎬 *Title:* ${finalTitle}\n🔗 *Source:* ${videoUrl}`,
                contextInfo: {
                    externalAdReply: {
                        title: finalTitle,
                        body: 'Video Downloader',
                        thumbnailUrl: videoData.thumbnail || videoThumbnail,
                        sourceUrl: videoUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(chatId, { text: '🚨 *Hitilafu ya kutuma!* Jaribu tena baadae.' });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("VIDEO ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = videoCommand;
