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

        // 1. Pata data kutoka API
        const res = await axios.get(api);
        const dlUrl = res.data?.data?.video || res.data?.data?.audio;
        if (!dlUrl) return sock.sendMessage(chatId, { text: '❌ *API Error!*' });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 2. Stream audio directly to WhatsApp (avoid full buffer)
        try {
            await sock.sendMessage(chatId, {
                audio: { url: dlUrl },
                mimetype: 'audio/mp4',
                fileName: `${vid.title}.mp3`,
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: vid.title,
                        body: `Mickey Infor Tech | ${vid.timestamp}`,
                        thumbnailUrl: vid.thumbnail,
                        sourceUrl: vid.url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(chatId, { text: '🚨 *Hitilafu ya kutuma!* Jaribu tena baadae.' });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = songCommand;
