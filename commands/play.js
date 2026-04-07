const axios = require('axios');
const yts = require('yt-search');
const { sendButtons } = require('gifted-btns');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '🎵 *Andika jina la wimbo!*' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Haikupatikana!*' });

        const vid = videos[0];
        
        // --- SEHEMU YA KUPATA JSON KUTOKA NAYAN API ---
        const res = await axios.get(`https://api.nayan-video-downloader.com/api/ytpv?url=${encodeURIComponent(vid.url)}`);
        const data = res.data; 

        if (!data.status) return sock.sendMessage(chatId, { text: '❌ API imeshindwa (Failed)!' });

        const playText = `🎵 *SONG FOUND*\n\n📝 *Title:* ${vid.title}\n⏱️ *Dur:* ${vid.timestamp}`;

        // 1. Tuma Menu/Buttons
        await sendButtons(sock, chatId, {
            title: '🎧 MUSIC DOWNLOADER',
            text: playText,
            footer: 'Mickey Glitch Tech',
            image: { url: vid.thumbnail },
            buttons: [
                { id: `audio_${vid.url}`, text: '🎵 MP3' },
                { id: `video_${vid.url}`, text: '🎥 MP4' }
            ]
        }, { quoted: message });

        // 2. SEHEMU YA KUTUMA AUDIO (FIXED)
        // Tumia audio/mp4 na ptt: false ili iplay kama music file
        await sock.sendMessage(chatId, { 
            audio: { url: data.audio }, // Link toka Nayan JSON
            mimetype: 'audio/mp4',      // Hii ni muhimu ili iplay (Playable)
            ptt: false,                 // Weka true kama unataka iwe kama Voice Note
            fileName: `${vid.title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: vid.title,
                    body: vid.author.name,
                    thumbnailUrl: vid.thumbnail,
                    sourceUrl: vid.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!*' }, { quoted: message });
    }
}

module.exports = songCommand;
