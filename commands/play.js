const axios = require('axios');
const yts = require('yt-search');

async function songCommand(sock, chatId, message) {
    // Guard: Check if socket is ready
    if (!sock || typeof sock.sendMessage !== 'function') {
        return;
    }

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
            `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(vid.url)}`,
            `https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(vid.url)}`
        ];

        let dlUrl = null;
        for (const api of DOWNLOAD_APIS) {
            try {
                const res = await axios.get(api, { timeout: 35000 });
                
                if (api.includes('/alldown')) {
                    // /alldown endpoint - try direct audio URL
                    dlUrl = res.data?.audio || res.data?.download_url || res.data?.url || 
                           res.data?.data?.audio || res.data?.data?.download_url || res.data?.data?.url;
                } else if (api.includes('/youtube')) {
                    // /youtube endpoint - parse formats array for best audio quality
                    if (res.data?.data?.formats && Array.isArray(res.data.data.formats)) {
                        // Filter for audio formats only
                        const audioFormats = res.data.data.formats.filter(format => format.type === 'audio');
                        if (audioFormats.length > 0) {
                            // Sort by bitrate descending to get highest quality
                            audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                            // Pick the highest quality audio format
                            dlUrl = audioFormats[0].url;
                        }
                    }
                    // Fallback to other paths
                    if (!dlUrl) {
                        dlUrl = res.data?.url || res.data?.download_url || res.data?.audio ||
                               res.data?.result?.url || res.data?.result?.download_url || res.data?.result?.audio ||
                               res.data?.data?.url || res.data?.data?.download_url || res.data?.data?.audio;
                    }
                } else {
                    // Fallback for other APIs
                    dlUrl = res.data?.data?.url || res.data?.result?.download_url || res.data?.url ||
                           res.data?.download_url || res.data?.audio;
                }
                
                if (dlUrl) break;
            } catch (error) {
                console.log(`API ${api} failed:`, error.message.slice(0, 50));
                continue;
            }
        }

        if (dlUrl) {
            // Show recording status (safe)
            try {
                await sock.sendPresenceUpdate('recording', chatId);
            } catch (e) {
                // Silent
            }

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
                console.log('Audio error:', err.message.slice(0, 50));
                await sock.sendMessage(chatId, { text: '⚠️ *Audio send failed on this device.*\n\nTry again or download manually.' });
            }
        } else {
            await sock.sendMessage(chatId, { text: '❌ *Downloadi ifshindwe!*\n\nKaribuni tena baada ya dakika chache.' });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu imetokea!*\n\nJaribu tena au tumia jina tofauti.' });
    } finally {
        // Stop recording status (safe)
        try {
            await sock.sendPresenceUpdate('paused', chatId);
        } catch (e) {
            // Silent
        }
    }
}

module.exports = songCommand;
