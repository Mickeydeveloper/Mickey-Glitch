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

// Function ya kupata data kutoka kwenye API mpya
async function getTiktokDownload(url) {
    // API URL mpya uliyotoa
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
    
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    
    // Kukagua kama data imerudi (muundo: res.data.status na res.data.data)
    if (!res || !res.data || !res.data.status || !res.data.data) {
        throw new Error('No response from TikTok API');
    }

    const d = res.data.data;

    // Video URL ipo kwenye d.video kulingana na JSON yako
    const videoUrl = d.video;
    if (!videoUrl) throw new Error('Could not find video URL in API response');

    return { 
        url: videoUrl, 
        title: d.title, 
        nickname: d.author?.nickname,
        thumbnail: d.thumbnail 
    };
}

async function tiktokCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('tiktok.com')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Weka link ya TikTok. Mfano: .tiktok https://www.tiktok.com/@user/video/123' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        let tikData;
        try {
            tikData = await getTiktokDownload(url);
        } catch (err) {
            console.error("API Error:", err.message);
            return await sock.sendMessage(chatId, { text: '❌ API imeshindwa (Error). Jaribu tena baadaye.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // Kutuma video kwenda WhatsApp
        try {
            await sock.sendMessage(chatId, {
                video: { url: tikData.url },
                mimetype: 'video/mp4',
                caption: `✅ *TikTok Downloader*\n\n👤 *Author:* ${tikData.nickname || 'N/A'}\n📝 *Title:* ${tikData.title || 'No Title'}\n🔗 *Source:* ${url}`,
                contextInfo: {
                    externalAdReply: {
                        title: 'TikTok Video Downloaded',
                        body: tikData.nickname,
                        thumbnailUrl: tikData.thumbnail,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        } catch (err) {
            console.error("Send Error:", err.message);
            await sock.sendMessage(chatId, { text: '🚨 *Hitilafu ya kutuma!* Video inaweza kuwa kubwa sana au link imekufa.' });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("TIKTOK CMD ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = tiktokCommand;
