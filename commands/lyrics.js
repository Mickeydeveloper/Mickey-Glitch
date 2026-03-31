const lyricsFinder = require('lyrics-finder');
const yts = require('yt-search');

async function lyricsCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: '✏️ Andika jina la wimbo.\nMfano: .lyrics Adele Hello' }, { quoted: message });

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // Tafuta metadata ya wimbo kwanza kupitia YT
        const { videos } = await yts(query);
        if (!videos.length) return sock.sendMessage(chatId, { text: '❌ Wimbo haupatikani!' });

        const vid = videos[0];
        const songTitle = vid.title;

        // Pata lyrics kwa kutumia scraping (No API Key needed)
        // Tunapita "" kwenye artist ili itafute kwa jina la wimbo moja kwa moja
        let lyrics = await lyricsFinder("", songTitle);

        if (!lyrics) {
            return sock.sendMessage(chatId, { text: `❌ Lyrics za *${songTitle}* hazijapatikana.` });
        }

        // Muundo safi (Premium Look) bila urembo mwingi
        const head = `*LYRICS:* ${songTitle.toUpperCase()}\n\n`;
        const fullText = head + lyrics;

        // Tuma lyrics kwa vipande (chunks) kama ni ndefu sana
        const chunkSize = 4000;
        for (let i = 0; i < fullText.length; i += chunkSize) {
            await sock.sendMessage(chatId, { 
                text: fullText.slice(i, i + chunkSize) 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("LYRICS ERROR:", err.message.slice(0, 50));
        await sock.sendMessage(chatId, { text: '🚨 Hitilafu imetokea wakati wa kutafuta lyrics!' });
    }
}

module.exports = lyricsCommand;
