const { sendGiftedButtons } = require('gifted-btns');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// Logic ya Audio inayosoma JSON { status, result }
async function getAudioMp4Url(ytUrl) {
    // Hapa tumia API inayotoa mp3/m4a lakini tutaituma kama audio/mp4
    const api = `https://apiskeith.top/download/ytmp3?url=${encodeURIComponent(ytUrl)}`;
    const res = await axios.get(api, AXIOS_DEFAULTS);
    
    // Inasoma muundo wako wa JSON: { status: true, result: "https://..." }
    if (res.data?.status && res.data?.result) {
        return res.data.result;
    }
    throw new Error('Audio API failed to return link');
}

// Function ya ku-handle utumaji wa Audio (Iite kwenye case yako ya .getaudio)
async function handleAudioDownload(sock, chatId, vUrl, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } });

        const audioLink = await getAudioMp4Url(vUrl);

        await sock.sendMessage(chatId, {
            audio: { url: audioLink },
            mimetype: 'audio/mp4', // Hapa ndipo tulipoibadilisha iwe mp4
            ptt: false, // Weka true kama unataka iwe kama Voice Note
            fileName: 'miki_audio.mp4'
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) {
        console.error(e);
        sock.sendMessage(chatId, { text: "❌ Audio error: " + e.message });
    }
}

// Main Video/Audio Command (Inayotuma Buttons)
async function playCommand(sock, chatId, message, args) {
    const q = Array.isArray(args) ? args.join(' ') : args;
    if (!q) return sock.sendMessage(chatId, { text: 'Unataka nikutafutie nini?' });

    try {
        const s = await yts(q);
        const v = s?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ Sijapata kitu!' });

        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎵 AUDIO (MP4)",
                    id: `.getaudio ${v.url}`
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎥 VIDEO (MP4)",
                    id: `.getvideo ${v.url}`
                })
            }
        ];

        await sendGiftedButtons({
            sock: sock,
            chatId: chatId,
            body: `*${v.title}*\n\n⏲️ *Dur:* ${v.timestamp}\n👤 *Author:* ${v.author.name}`,
            footer: "Mickey Glitch",
            title: "DOWNLOAD OPTIONS",
            media: { image: { url: v.thumbnail } },
            buttons: buttons,
            quoted: message
        });

    } catch (err) {
        sock.sendMessage(chatId, { text: 'Error: ' + err.message });
    }
}

module.exports = { playCommand, handleAudioDownload };
