const axios = require('axios');
const yts = require('yt-search');

async function songCommand(sock, chatId, message) {
    if (!sock || typeof sock.sendMessage !== 'function') return;

    const textBody =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        '';

    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, {
            text: '🎵 *Andika jina la wimbo!*\n\nMfano: .play Adele Hello'
        }, { quoted: message });
    }

    try {
        // React: Inatafuta
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) {
            return sock.sendMessage(chatId, { text: '❌ *Wimbo haupatikani!*' });
        }

        const vid = videos[0];
        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;

        // 1. Pata download link kutoka API
        const res = await axios.get(api, { timeout: 15000 });
        const dlUrl = res.data?.data?.audio;

        if (!dlUrl) {
            return sock.sendMessage(chatId, { text: '❌ *Download link haikupatikana!*' });
        }

        // React: Inadownload (Hapa ndipo tunatengeneza Buffer ili iplay)
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 2. Download audio data kama Buffer
        const response = await axios({
            method: 'get',
            url: dlUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const audioBuffer = Buffer.from(response.data, 'binary');

        // Status: Recording (Inaonyesha juu "recording audio...")
        try { await sock.sendPresenceUpdate('recording', chatId); } catch {}

        // 3. Tuma audio Buffer kwa WhatsApp
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${vid.title}.mp3`,
            ptt: false, // Weka true kama unataka iende kama Voice Note (VN)
            contextInfo: {
                externalAdReply: {
                    title: vid.title,
                    body: `Mickey Infor Tech • ${vid.timestamp}`,
                    thumbnailUrl: vid.thumbnail,
                    sourceUrl: vid.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // React: Imekamilika
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu imetokea!* Jaribu tena baadae.' });
    } finally {
        try { await sock.sendPresenceUpdate('paused', chatId); } catch {}
    }
}

module.exports = songCommand;
