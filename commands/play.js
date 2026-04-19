const axios = require('axios');
const yts = require('yt-search');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '🎵 *Andika jina la wimbo!*\nMfano: .play Adele Hello' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Haikupatikana!*' });

        const vid = videos[0];
        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;

        const res = await axios.get(api);
        const dlUrl = res.data?.data?.audio || res.data?.data?.video; // Priority iwe audio
        
        if (!dlUrl) return sock.sendMessage(chatId, { text: '❌ *API Error!*' });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // FIX: Pakua file kwanza kuwa Buffer badala ya kutuma URL pekee
        const response = await axios.get(dlUrl, { 
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const audioBuffer = Buffer.from(response.data);

        // Tuma audio ikiwa imekamilika
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mp4', // Mp4 aac ni bora kwa preview kadi
            fileName: `${vid.title}`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: vid.title,
                    body: `Mickey Infor Tech | ${vid.timestamp}`,
                    thumbnailUrl: vid.thumbnail,
                    sourceUrl: vid.url,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Server ya API ina matatizo kwa sasa.' });
    }
}

module.exports = songCommand;
