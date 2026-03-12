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
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) {
            return sock.sendMessage(chatId, {
                text: '❌ *Wimbo haupatikani!*'
            });
        }

        const vid = videos[0];

        // Kutumia API uliyotuma (Nayan Video Downloader)
        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;

        // Request data kutoka kwa API
        const res = await axios.get(api, { timeout: 20000 });

        // Kuchukua audio pekee (path: res.data.data.audio)
        const dlUrl = res.data?.data?.audio;

        if (!dlUrl) {
            return sock.sendMessage(chatId, { text: '❌ *Audio haikupatikana kwenye API!*' });
        }

        // Status ya recording (voice note style)
        try { await sock.sendPresenceUpdate('recording', chatId); } catch {}

        // Kutuma audio kama file la mp3 (audio/mpeg)
        await sock.sendMessage(chatId, {
            audio: { url: dlUrl },
            mimetype: 'audio/mpeg',
            fileName: `${vid.title}.mp3`,
            ptt: false, // Weka true kama unataka iende kama Voice Note
            contextInfo: {
                externalAdReply: {
                    title: vid.title,
                    body: `⏱️ ${vid.timestamp} • 👁️ ${vid.views?.toLocaleString() || 0} views`,
                    thumbnailUrl: vid.thumbnail,
                    sourceUrl: vid.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.log("PLAY ERROR:", err.message.slice(0, 50));
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu imetokea wakati wa kudownload!*' });
    } finally {
        try { await sock.sendPresenceUpdate('paused', chatId); } catch {}
    }
}

module.exports = songCommand;
