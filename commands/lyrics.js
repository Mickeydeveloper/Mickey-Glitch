const axios = require('axios');
const yts = require('yt-search');

async function lyricsCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: '✏️ Andika jina la wimbo.\nMfano: .lyrics Adele Hello' }, { quoted: message });

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // Tafuta metadata sahihi ya wimbo kupitia YT
        const { videos } = await yts(query);
        if (!videos.length) return sock.sendMessage(chatId, { text: '❌ Wimbo haupatikani!' });

        const vid = videos[0];
        const title = encodeURIComponent(vid.title);

        // Tunatumia API ya umma (Public API) isiyohitaji Key
        const res = await axios.get(`https://api.lyrics.ovh/v1/${title}`, { timeout: 10000 });
        const lyrics = res.data?.lyrics;

        if (!lyrics) {
            return sock.sendMessage(chatId, { text: `❌ Lyrics za *${vid.title}* hazijapatikana kwenye database.` });
        }

        const head = `*LYRICS:* ${vid.title.toUpperCase()}\n\n`;
        const fullText = head + lyrics;

        // Tuma kwa vipande (chunks) kama ni ndefu
        const chunkSize = 4000;
        for (let i = 0; i < fullText.length; i += chunkSize) {
            await sock.sendMessage(chatId, { 
                text: fullText.slice(i, i + chunkSize) 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("LYRICS API ERROR:", err.message);
        // Kama API ya kwanza ikifeli, unaweza kuweka ujumbe huu:
        await sock.sendMessage(chatId, { text: '🚨 Samahani, sikuweza kupata lyrics kwa sasa.' });
    }
}

module.exports = lyricsCommand;
