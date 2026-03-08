const axios = require('axios');
const yts = require('yt-search');

async function lyricsCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: '✏️ Andika jina la wimbo.\nMfano: .lyrics Adele Hello' }, { quoted: message });

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // Optional: You can search YouTube to get exact video for metadata
        const { videos } = await yts(query);
        if (!videos.length) return sock.sendMessage(chatId, { text: '❌ Wimbo haupatikani!' });

        const vid = videos[0];

        // Call lyrics API
        const res = await axios.get(`https://api-aswin-sparky.koyeb.app/api/lyrics?title=${encodeURIComponent(vid.title)}`, { timeout: 15000 });
        const lyrics = res.data?.lyrics;

        if (!lyrics) return sock.sendMessage(chatId, { text: '❌ Lyrics hazipatikani!' });

        // Send lyrics in manageable chunks
        const chunkSize = 4000;
        for (let i = 0; i < lyrics.length; i += chunkSize) {
            await sock.sendMessage(chatId, { text: lyrics.slice(i, i + chunkSize) }, { quoted: message });
        }

    } catch (err) {
        console.log("LYRICS ERROR:", err.message.slice(0,50));
        await sock.sendMessage(chatId, { text: '🚨 Hitilafu imetokea kwenye lyrics!' });
    }
}

module.exports = lyricsCommand;