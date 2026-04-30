const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;
    if (!query) return;

    await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } }).catch(() => {});

    try {
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });

        // Tuma Thumbnail
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: `🎵 *Title:* ${v.title}\n👤 *Author:* ${v.author.name}`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } }).catch(() => {});

        let audioUrl = null;

        // --- JARIBIO LA 1: alldown API ---
        try {
            const res1 = await axios.get(`https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`);
            // Kulingana na JSON yako: data.data.high (au low kama mbadala)
            audioUrl = res1.data?.data?.data?.high || res1.data?.data?.data?.low;
        } catch (e) {
            console.log("Alldown failed, switching to ytdown...");
        }

        // --- JARIBIO LA 2: ytdown API (Fallback) ---
        if (!audioUrl) {
            try {
                const res2 = await axios.get(`https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(v.url)}`);
                // Kulingana na JSON yako ya pili: data.data.audio
                audioUrl = res2.data?.data?.data?.audio;
            } catch (e) {
                throw new Error("API zote mbili zimefeli.");
            }
        }

        if (!audioUrl) throw new Error("Sikuweza kupata link ya audio kwnye API.");

        // TUMA AUDIO
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error("DEBUG:", err.message);
        await sock.sendMessage(chatId, {
            text: `❌ *Error!*\n\n_Sababu: ${err.message}_`
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = playCommand;
