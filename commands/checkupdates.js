const axios = require('axios');
const yts = require('yt-search');
const { sendButtons } = require('gifted-btns');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    // 1. Kupata jina la mtumiaji na query
    const pushName = message.pushName || 'User';
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: `Hello *${pushName}*, 🎵 *Andika jina la wimbo!*\nExample: .play Adele Hello` }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Haikupatikana!*' });

        const vid = videos[0];

        const playText = `
🎵 *SONG FOUND*
━━━━━━━━━━━━━━━━━━━━━━
📝 *Title:* ${vid.title}
👤 *Channel:* ${vid.author.name}
⏱️ *Duration:* ${vid.timestamp}
👁️ *Views:* ${vid.views}
📅 *Uploaded:* ${vid.ago}
━━━━━━━━━━━━━━━━━━━━━━
*Chagua format ya kudownload:*`;

        const playButtons = [
            { id: `.audio ${vid.url}`, text: '🎵 AUDIO (MP3)' },
            { id: `.video ${vid.url}`, text: '🎥 VIDEO (MP4)' },
            { id: `.repo`, text: '📦 BOT REPO' }
        ];

        await sendButtons(sock, chatId, {
            title: '🎧 MUSIC DOWNLOADER',
            text: playText,
            footer: 'Mickey Glitch Tech',
            image: { url: vid.thumbnail },
            buttons: playButtons
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' }, { quoted: message });
    }
}

// Hii ndio sehemu muhimu iliyorekebishwa ili bot isilete error
module.exports = songCommand;
