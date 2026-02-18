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
        
        // ✅ Enhanced First Message with Preview
        const firstMsg = `
🎵 *SONG FOUND*

*🎤 Title:* ${vid.title}
⏱️ *Duration:* ${vid.timestamp}
👁️ *Views:* ${vid.views.toLocaleString()}
📅 *Channel:* ${vid.author?.name || 'Unknown'}

📥 *Downloading audio...*
Please wait a moment...
`;

        const firstMsgRes = await sock.sendMessage(chatId, { 
            text: firstMsg,
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

        const DOWNLOAD_APIS = [
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(vid.url)}`,
            `https://api.srihub.store/download/ytmp3?url=${encodeURIComponent(vid.url)}&apikey=dew_SHmZ6Kcc67WTZqLfC3GGC774gANCHhtfIudTPQak`
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

            // ✅ Enhanced Audio Message with Premium Ad Look
            await sock.sendMessage(chatId, {
                audio: { url: dlUrl },
                mimetype: 'audio/mpeg',
                fileName: `${vid.title}.mp3`,
                ptt: false,
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 999,
                    externalAdReply: {
                        title: `🎵 ${vid.title}`,
                        body: `Duration: ${vid.timestamp} | Ready to play`,
                        thumbnailUrl: vid.thumbnail,
                        sourceUrl: vid.url,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    },
                    mentionedJid: []
                }
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
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
