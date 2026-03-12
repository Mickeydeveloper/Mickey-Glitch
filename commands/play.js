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
        
        // TRICK: Tumia link ya VIDEO badala ya AUDIO kwasababu video link iko stable zaidi
        const dlUrl = res.data?.data?.video || res.data?.data?.audio;

        if (!dlUrl) return sock.sendMessage(chatId, { text: '❌ *API Error!*' });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 2. Download kama Buffer
        const audioData = await axios({
            method: 'get',
            url: dlUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://nayan-video-downloader.vercel.app/'
            }
        });

        const finalBuffer = Buffer.from(audioData.data, 'binary');

        try { await sock.sendPresenceUpdate('recording', chatId); } catch {}

        // 3. TUMA KAMA AUDIO (WhatsApp ita-extract sauti kutoka kwenye video buffer)
        await sock.sendMessage(chatId, {
            audio: finalBuffer, 
            mimetype: 'audio/mp4', // Tumia mp4 hapa hata kama ni audio, inasaidia kuplay
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

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = songCommand;
