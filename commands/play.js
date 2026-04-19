const axios = require('axios');
const yts = require('yt-search');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '🎵 *Andika jina la wimbo!*\nMfano: .play Diamond-Zuwena' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // Tafuta wimbo YouTube
        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });

        const vid = videos[0];
        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;

        // 1. Tuma kwanza Thumbnail kama picha halisi (Sio ad preview)
        const infoTxt = `🎵 *WIMBO UMEPATIKANA*\n\n` +
                        `📌 *Title:* ${vid.title}\n` +
                        `⏳ *Duration:* ${vid.timestamp}\n` +
                        `👤 *Channel:* ${vid.author.name}\n` +
                        `🔗 *Link:* ${vid.url}\n\n` +
                        `*Tafadhali subiri, audio inapakuliwa...*`;

        await sock.sendMessage(chatId, { 
            image: { url: vid.thumbnail }, 
            caption: infoTxt 
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 2. Pata link ya kupakulia (Download link) kwa timeout ya s60
        const res = await axios.get(api, { timeout: 60000 });
        const dlUrl = res.data?.data?.video || res.data?.data?.audio;

        if (!dlUrl) {
            return sock.sendMessage(chatId, { text: '❌ *API imeshindwa kutoa link ya audio.*' });
        }

        // 3. Tuma audio (Fixing timeout error)
        // Tunatumia try-catch hapa ndani ili kama ikileta "timeout" lakini audio imetumwa, isitume msg ya error
        try {
            await sock.sendMessage(chatId, {
                audio: { url: dlUrl },
                mimetype: 'audio/mp4',
                fileName: `${vid.title}.mp3`,
                ptt: false
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } catch (sendErr) {
            // Kama audio imeshatumwa, usijali kuhusu timeout ya connection
            console.error("Audio Send Warning:", sendErr.message);
        }

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        // Usitume error message kama ni timeout ya kawaida lakini data ilishafika
        if (!err.message.includes('timeout')) {
            await sock.sendMessage(chatId, { text: `🚨 *Hitilafu:* ${err.message}` }, { quoted: message });
        }
    }
}

module.exports = songCommand;
