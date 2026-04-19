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
        // 1. React (Tafuta)
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const search = await yts(query);
        const vid = search.videos[0];
        if (!vid) return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });

        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;
        const res = await axios.get(api);
        const dlUrl = res.data?.data?.audio || res.data?.data?.video;

        if (!dlUrl) {
            return sock.sendMessage(chatId, { text: '❌ *API imeshindwa kupata link ya audio!*' });
        }

        // 2. React (Pakua Audio kwenda kwenye Buffer)
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // Pakua file kwanza (Buffer method)
        const response = await axios.get(dlUrl, { 
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' } // Husaidia API zisigome
        });
        const audioBuffer = Buffer.from(response.data);

        // 3. Tuma Audio (Using Buffer + Ad Preview)
        await sock.sendMessage(chatId, {
            audio: audioBuffer, 
            mimetype: 'audio/mp4', // Inaplay vizuri zaidi na preview card
            ptt: false,
            fileName: `${vid.title}.mp3`,
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

        // 4. React (Tayari)
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: `🚨 *Hitilafu:* ${err.message}` });
    }
}

module.exports = songCommand;
