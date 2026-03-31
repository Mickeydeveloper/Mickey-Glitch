const lyricsFinder = require('@chen4520/lyrics-finder'); // Imetumia jina jipya
const yts = require('yt-search');

async function lyricsCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: '✏️ Andika jina la wimbo.\nMfano: .lyrics Adele Hello' }, { quoted: message });

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const { videos } = await yts(query);
        if (!videos.length) return sock.sendMessage(chatId, { text: '❌ Wimbo haupatikani!' });

        const vid = videos[0];
        const songTitle = vid.title;

        // MATUMIZI YA @chen4520/lyrics-finder:
        // Inahitaji jina la wimbo pekee au (artist, title)
        let lyrics = await lyricsFinder(songTitle); 

        if (!lyrics || lyrics.length < 10) { // Kama imerudisha tupu au text fupi sana
            return sock.sendMessage(chatId, { text: `❌ Lyrics za *${songTitle}* hazijapatikana.` });
        }

        const head = `*LYRICS:* ${songTitle.toUpperCase()}\n\n`;
        const fullText = head + lyrics;

        const chunkSize = 4000;
        for (let i = 0; i < fullText.length; i += chunkSize) {
            await sock.sendMessage(chatId, { 
                text: fullText.slice(i, i + chunkSize) 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("LYRICS ERROR:", err.message.slice(0, 50));
        await sock.sendMessage(chatId, { text: '🚨 Hitilafu imetokea kwenye mfumo wa lyrics!' });
    }
}

module.exports = lyricsCommand;
