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
        // 1. React kutafuta (Search react)
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const search = await yts(query);
        const vid = search.videos[0];
        if (!vid) return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });

        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;
        const res = await axios.get(api);
        const dlUrl = res.data?.data?.audio || res.data?.data?.video;

        if (!dlUrl) {
            return sock.sendMessage(chatId, { text: '❌ *API imefeli kupata link!*' });
        }

        // 2. React kupakua (Download react)
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 3. Tuma Audio na Preview Card (Send w/ Ad Preview)
        await sock.sendMessage(chatId, {
            audio: { url: dlUrl },
            mimetype: 'audio/mp4', // Bora zaidi kwa preview cards
            ptt: false,
            fileName: `${vid.title}`,
            contextInfo: {
                externalAdReply: {
                    title: vid.title,
                    body: `Channel: ${vid.author.name}`,
                    thumbnailUrl: vid.thumbnail,
                    sourceUrl: vid.url,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        }, { quoted: message });

        // 4. React imekamilika (Success react)
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERR:", err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: `🚨 *Hitilafu:* ${err.message}` });
    }
}

module.exports = songCommand;
