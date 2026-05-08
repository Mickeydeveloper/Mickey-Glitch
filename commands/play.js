const { sendGiftedButtons } = require('gifted-btns');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_CONF = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

// --- API FUNCTIONS ---

async function getMp4Download(ytUrl, type = 'video') {
    // Aina ya API inayosoma JSON: { status, result }
    const endpoint = type === 'video' ? 'mp4' : 'ytmp3';
    const api = `https://apiskeith.top/download/${endpoint}?url=${encodeURIComponent(ytUrl)}`;
    const res = await axios.get(api, AXIOS_CONF);
    
    if (res.data?.status && res.data?.result) {
        return res.data.result;
    }
    throw new Error(`${type.toUpperCase()} API failed`);
}

// --- MAIN COMMANDS ---

async function playCommand(sock, chatId, message, args) {
    try {
        const q = Array.isArray(args) ? args.join(' ') : args;
        if (!q) return sock.sendMessage(chatId, { text: 'Ingiza jina la wimbo/video!' });

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        const s = await yts(q);
        const v = s?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ Sikuipata!' });

        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ display_text: "🎵 AUDIO (MP4)", id: `.getaudio ${v.url}` })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ display_text: "🎥 VIDEO (MP4)", id: `.getvideo ${v.url}` })
            }
        ];

        await sendGiftedButtons({
            sock,
            chatId,
            body: `🎬 *Title:* ${v.title}\n⏲️ *Dur:* ${v.timestamp}\n👤 *Author:* ${v.author.name}`,
            footer: "Mickey Glitch",
            title: "DOWNLOAD MENU",
            media: { image: { url: v.thumbnail } },
            buttons,
            quoted: message
        });

    } catch (err) {
        console.error(err);
        sock.sendMessage(chatId, { text: 'Error: ' + err.message });
    }
}

// --- HANDLERS (Kwa ajili ya button clicks) ---

async function handleAudio(sock, chatId, vUrl, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } });
        const link = await getMp4Download(vUrl, 'audio');
        await sock.sendMessage(chatId, {
            audio: { url: link },
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: 'miki.mp4'
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) { sock.sendMessage(chatId, { text: "❌ Audio error" }); }
}

async function handleVideo(sock, chatId, vUrl, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '🎥', key: message.key } });
        const link = await getMp4Download(vUrl, 'video');
        await sock.sendMessage(chatId, {
            video: { url: link },
            mimetype: 'video/mp4',
            caption: '> *Mickey Glitch*'
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) { sock.sendMessage(chatId, { text: "❌ Video error" }); }
}

// MUHIMU: Export kama object
module.exports = { playCommand, handleAudio, handleVideo };
