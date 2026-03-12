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

        // 1. Pata link ya audio
        const res = await axios.get(api);
        const dlUrl = res.data?.data?.audio;

        if (!dlUrl) return sock.sendMessage(chatId, { text: '❌ *API Error!*' });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 2. DOWNLOAD KWA KUTUMIA HEADERS NA RESPONSE TYPE SAHIHI
        const audioData = await axios({
            method: 'get',
            url: dlUrl,
            responseType: 'arraybuffer', // Hii ni muhimu sana
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://nayan-video-downloader.vercel.app/',
                'Accept': '*/*'
            }
        });

        const finalBuffer = Buffer.from(audioData.data, 'binary');

        try { await sock.sendPresenceUpdate('recording', chatId); } catch {}

        // 3. TUMA AUDIO KAMA FILE (Hii inaondoa kosa la "not available")
        await sock.sendMessage(chatId, {
            audio: finalBuffer, // Tunatuma data halisi (buffer), siyo link
            mimetype: 'audio/mpeg',
            fileName: `${vid.title}.mp3`,
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
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Labda file ni kubwa sana au server ina busy.' });
    } finally {
        try { await sock.sendPresenceUpdate('paused', chatId); } catch {}
    }
}

module.exports = songCommand;
