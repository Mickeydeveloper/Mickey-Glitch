const axios = require('axios');
const yts = require('yt-search');
const { sendButtons } = require('gifted-btns');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '🎵 *Write the name of the song!*\nExample: .play Adele Hello' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Not found!*' });

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
*Choose download format:*`;

        const playButtons = [
            { id: `play_audio_${encodeURIComponent(vid.title)}`, text: '🎵 AUDIO (MP3)' },
            { id: `play_video_${encodeURIComponent(vid.title)}`, text: '🎥 VIDEO (MP4)' },
            { id: `play_search_${encodeURIComponent(query)}`, text: '🔍 MORE RESULTS' }
        ];

        await sendButtons(sock, chatId, {
            title: '🎧 MUSIC DOWNLOADER',
            text: playText,
            footer: 'Mickey Glitch Tech',
            image: { url: vid.thumbnail },
            buttons: playButtons
        }, { quoted: message });

    } catch (err) {
        console.error("PLAY ERROR:", err);
        await sock.sendMessage(chatId, { text: '❌ *Search failed!*' }, { quoted: message });
    }
}

module.exports = songCommand;
