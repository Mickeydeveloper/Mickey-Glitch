const axios = require('axios');
const { getBuffer } = require('../lib/myfunc');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
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

function collectAllUrls(obj, out = new Set()) {
    if (!obj) return out;
    const urlRegex = /https?:\/\/[^\s\"'<>]+/ig;
    if (typeof obj === 'string') {
        let m;
        while ((m = urlRegex.exec(obj)) !== null) out.add(m[0]);
        return out;
    }
    if (Array.isArray(obj)) {
        for (const item of obj) collectAllUrls(item, out);
        return out;
    }
    if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) collectAllUrls(obj[key], out);
        return out;
    }
    return out;
}

function isImageUrl(u) {
    return /\.(jpe?g|png|webp|gif|bmp)(?:\?|$)/i.test(u);
}

function isVideoLike(u) {
    return /\.(mp4|webm|m3u8|mov|ts|3gp|mkv)(?:\?|$)/i.test(u) || /(video|play|download|mp4|nowm)/i.test(u);
}

async function validateVideoUrl(url) {
    try {
        // Try HEAD first
        const head = await axios.head(url, { ...AXIOS_DEFAULTS, timeout: 5000, maxRedirects: 5, validateStatus: s => s >= 200 && s < 400 });
        const ct = (head.headers['content-type'] || '').toLowerCase();
        if (ct.startsWith('video') || ct.includes('octet-stream')) return true;
    } catch (e) {
        // ignore, try GET stream
    }

    try {
        const r = await axios.get(url, { ...AXIOS_DEFAULTS, responseType: 'stream', timeout: 8000, maxRedirects: 5 });
        const ct = (r.headers['content-type'] || '').toLowerCase();
        if (r.data && typeof r.data.destroy === 'function') r.data.destroy();
        if (ct.startsWith('video') || ct.includes('octet-stream')) return true;
    } catch (e) {
        // failed to fetch
    }

    return false;
}

async function getTiktokDownload(url) {
    const apiUrl = `https://nayan-video-downloader.vercel.app/tikdown?url=${encodeURIComponent(url)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (!res || !res.data || !res.data.data || !res.data.data.status) throw new Error('No response from TikTok API');

    const d = res.data.data.data;

    // The video URL is directly in d.video
    const videoUrl = d.video;
    if (!videoUrl) throw new Error('Could not find video URL in API response');

    return { url: videoUrl, meta: d };
}

async function tiktokCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();
        if (!url || !url.includes('tiktok.com')) {
            return await sock.sendMessage(chatId, { text: '❌ Weka link ya TikTok. Mfano: .tiktok https://www.tiktok.com/@user/video/123' }, { quoted: message });
        }
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });
        let videoUrl;
        try {
            videoUrl = await getTiktokDownload(url);
        } catch (err) {
            return await sock.sendMessage(chatId, { text: '❌ API imeshindwa. Jaribu tena baadaye.' }, { quoted: message });
        }
        if (!videoUrl) {
            return await sock.sendMessage(chatId, { text: '❌ Imeshindwa kupata video.' }, { quoted: message });
        }
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
        // Stream video directly to WhatsApp
        try {
            await sock.sendMessage(chatId, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption: `✅ *TikTok Video Downloader*\n\n🔗 *Source:* ${url}`,
                contextInfo: {
                    externalAdReply: {
                        title: 'TikTok Video',
                        body: 'TikTok Downloader',
                        thumbnailUrl: '',
                        sourceUrl: url,
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
        console.error("TIKTOK ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = tiktokCommand;
