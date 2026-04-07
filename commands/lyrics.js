const axios = require('axios');
const yts = require('yt-search');

async function lyricsCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: '✏️ Write the name of the song.\nExample: .lyrics Adele Hello' }, { quoted: message });

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // Search for correct song metadata via YT
        const { videos } = await yts(query);
        if (!videos.length) return sock.sendMessage(chatId, { text: '❌ Song not available!' });

        const vid = videos[0];
        const title = encodeURIComponent(vid.title);

        // We use a public API (Public API) that doesn't require Key
        const res = await axios.get(`https://api.lyrics.ovh/v1/${title}`, { timeout: 10000 });
        const lyrics = res.data?.lyrics;

        if (!lyrics) {
            return sock.sendMessage(chatId, { text: `❌ Lyrics for *${vid.title}* not found in database.` });
        }

        const head = `*LYRICS:* ${vid.title.toUpperCase()}\n\n`;
        const fullText = head + lyrics;

        // Send in chunks if it's long
        const chunkSize = 4000;
        for (let i = 0; i < fullText.length; i += chunkSize) {
            await sock.sendMessage(chatId, { 
                text: fullText.slice(i, i + chunkSize) 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("LYRICS API ERROR:", err.message);
        // If the first API fails, you can put this message:
        await sock.sendMessage(chatId, { text: '🚨 Sorry, I couldn\'t get lyrics right now.' });
    }
}

module.exports = lyricsCommand;
