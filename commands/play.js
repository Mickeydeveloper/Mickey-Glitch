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
        // 1. Reaction ya kutafuta
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });

        const vid = videos[0];
        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;

        const res = await axios.get(api);
        // Hakikisha tunapata audio link sahihi
        const dlUrl = res.data?.data?.audio || res.data?.data?.video;
        
        if (!dlUrl) {
            return sock.sendMessage(chatId, { text: '❌ *API imeshindwa kupata audio!*' });
        }

        // 2. Reaction ya kupakua
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 3. Tuma Audio (Marekebisho ya stabilitiy yapo hapa)
        await sock.sendMessage(chatId, {
            audio: { url: dlUrl },
            mimetype: 'audio/mpeg', // MPEG ni stable zaidi kwa wapokeaji wote
            fileName: `${vid.title}.mp3`,
            ptt: false,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: vid.title,
                    body: `Mickey Info Tech | ${vid.timestamp}`,
                    thumbnailUrl: vid.thumbnail,
                    mediaType: 2, // Ibadilishe kuwa 2 kwa audio
                    showAdAttribution: true,
                    renderLargerThumbnail: true,
                    sourceUrl: vid.url
                }
            }
        }, { quoted: message });

        // 4. Reaction ya kumaliza
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        // Kama API ya kwanza ikifeli, unaweza kuongeza ujumbe hapa
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu imetokea!* Huenda wimbo ni mkubwa sana au server ina tatizo.' });
    }
}

module.exports = songCommand;
