const axios = require('axios');
const yts = require('yt-search');

async function songCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: '🎵 *Andika jina la wimbo!*\n\nMfano: .play Adele Hello' });

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const { videos } = await yts(query);
        if (!videos.length) return sock.sendMessage(chatId, { text: '❌ *Wimbo haupatikani!*\n\nJaribu kupiga upya na jina sahihi.' });

        const vid = videos[0];
        
        // Show loading message
        await sock.sendMessage(chatId, { text: '📥 *Downloading audio...*' }, { quoted: message });

        const DOWNLOAD_APIS = [
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(vid.url)}`,
            `https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(vid.url)}`
        ];

        let dlUrl = null;
        for (const api of DOWNLOAD_APIS) {
            try {
                const res = await axios.get(api, { timeout: 35000 });
                dlUrl = res.data.data?.url || res.data.result?.download_url || res.data.url;
                if (dlUrl) break;
            } catch { continue; }
        }

        if (dlUrl) {
            // Show recording status
            await sock.sendPresenceUpdate('recording', chatId);

            // Send combined info text and audio
            try {
                const infoMsg = `🎵 *${vid.title}*
⏱️ ${vid.timestamp} | 👁️ ${vid.views.toLocaleString()} views
📍 ${vid.author?.name || 'Unknown'}`;

                await sock.sendMessage(chatId, {
                    audio: { url: dlUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${vid.title}.mp3`,
                    ptt: false,
                    caption: infoMsg,
                    contextInfo: {
                        externalAdReply: {
                            title: '🎶 Music Player',
                            body: vid.title,
                            thumbnailUrl: vid.thumbnail,
                            sourceUrl: vid.url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            } catch (err) {
                console.log('Audio send error:', err.message);
                await sock.sendMessage(chatId, { text: '⚠️ *Audio send failed on this device.*\n\nTry again or download manually.' });
            }
        } else {
            await sock.sendMessage(chatId, { text: '❌ *Downloadi ifshindwe!*\n\nKaribuni tena baada ya dakika chache.' });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu imetokea!*\n\nJaribu tena au tumia jina tofauti.' });
    } finally {
        // Stop recording status
        await sock.sendPresenceUpdate('paused', chatId);
    }
}

module.exports = songCommand;
