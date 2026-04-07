const axios = require('axios');
const yts = require('yt-search');
const { sendButtons } = require('gifted-btns');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    // 1. Kupata jina la wimbo toka kwa user
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '🎵 *Andika jina la wimbo!*\nEx: .play Adele Hello' }, { quoted: message });
    }

    try {
        // Reaction ya kutafuta
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // 2. Kutafuta wimbo YouTube
        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });

        const vid = videos[0];
        const url = vid.url;

        // 3. Kupiga Nayan API (Kudownload)
        // Hapa tunatumia muundo wa JSON uliouulizia
        const res = await axios.get(`https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(url)}`);
        const data = res.data;

        // Kwenye Nayan, mara nyingi link ya audio iko kwenye data.data au data.links
        // Tunachukua audio link (mfano: data.data.mp3 au data.links[0])
        const audioLink = data.data?.mp3 || data.data?.audio || data.links?.[0]?.url;

        if (!audioLink) {
            return sock.sendMessage(chatId, { text: '❌ *Imeshindwa kupata link ya audio!*' });
        }

        const playText = `
🎵 *SONG FOUND*
━━━━━━━━━━━━━━━━━━━━━━
📝 *Title:* ${vid.title}
👤 *Channel:* ${vid.author.name}
⏱️ *Duration:* ${vid.timestamp}
━━━━━━━━━━━━━━━━━━━━━━
*Mickey Glitch Tech - Downloader*`;

        const playButtons = [
            { id: `.play ${query}`, text: '🔄 REPLAY' },
            { id: `.menu`, text: '📜 MENU' }
        ];

        // 4. Tuma Buttons na Picha
        await sendButtons(sock, chatId, {
            title: '🎧 AUDIO DOWNLOADER',
            text: playText,
            footer: 'Mickey Glitch Tech',
            image: { url: vid.thumbnail },
            buttons: playButtons
        }, { quoted: message });

        // 5. Tuma Audio (Hapa ndipo inapoplay)
        await sock.sendMessage(chatId, { 
            audio: { url: audioLink }, 
            mimetype: 'audio/mp4', // Hii inafanya iplay (Playable)
            ptt: false,            // false = Music file, true = Voice Note
            fileName: `${vid.title}.mp3`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("API ERR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu ya API!* Jaribu tena baadae.' }, { quoted: message });
    }
}

module.exports = songCommand;
