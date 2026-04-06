const { sendButtons } = require('gifted-btns');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, { text: '❌ *Unatafuta nini?*\nMfano: .play Diamond Platnumz' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // 1. Tafuta Video YouTube
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Video haikupatikana!' }, { quoted: message });
        }

        const v = videos[0]; // Chukua video ya kwanza
        const videoUrl = v.url;

        // 2. Tengeneza Ujumbe wa Maelezo (Ad Style)
        const caption = `
🎵 *YOUTUBE DOWNLOADER* 🎵
━━━━━━━━━━━━━━━━━━━━━━
📝 *Title:* ${v.title}
⏳ *Duration:* ${v.timestamp}
👀 *Views:* ${v.views.toLocaleString()}
📅 *Uploaded:* ${v.ago}
━━━━━━━━━━━━━━━━━━━━━━
*Chagua aina ya file unalotaka hapa chini:* 👇`;

        // 3. Tuma Button (Video & Audio)
        // Tunatuma URL ndani ya ID ili handler yetu iweze kuitumia
        await sendButtons(sock, chatId, {
            title: '🎥 MICKEY MEDIA DOWNLOADER',
            text: caption,
            footer: 'Mickey Glitch Technology',
            image: { url: v.thumbnail },
            buttons: [
                { id: `.ytvideo ${videoUrl}`, text: '🎬 VIDEO (MP4)' },
                { id: `.ytaudio ${videoUrl}`, text: '🎵 AUDIO (MP3)' }
            ]
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("YT ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena.' });
    }
}

module.exports = videoCommand;
