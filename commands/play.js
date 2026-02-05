const axios = require('axios');
const yts = require('yt-search');

/**
 * SONG COMMAND - MODERNISED (Srihub API Integrated)
 * Kazi: Kutafuta na kutuma audio kutoka YouTube kwa kutumia Srihub
 */
async function songCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '❌ *Tafadhali andika jina la wimbo!* \n\nMfano: .song Bado Nakupenda' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // 1. Tafuta video YouTube
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            return sock.sendMessage(chatId, { text: '❌ *Samahani, wimbo huo haujapatikana.*' }, { quoted: message });
        }

        const videoUrl = video.url;
        const videoTitle = video.title;

        await sock.sendMessage(chatId, { text: `🎵 *Inatayarisha:* ${videoTitle}\n⏳ _Tafadhali subiri..._` }, { quoted: message });

        // 2. Orodha ya API (Srihub ikiwa ya kwanza)
        const apiKey = "dew_SHmZ6Kcc67WTZqLfC3GGC774gANCHhtfIudTPQak";
        const DOWNLOAD_APIS = [
            `https://api.srihub.store/download/ytmp3?url=${encodeURIComponent(videoUrl)}&apikey=${apiKey}`,
            `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`
        ];

        let downloadUrl = null;

        // 3. Mchakato wa kutafuta Link (Retry Logic)
        for (const api of DOWNLOAD_APIS) {
            try {
                const response = await axios.get(api, { timeout: 45000 });
                const data = response.data;

                // Kuchuja data kulingana na muundo wa SRIHUB (data.result.download_url)
                // Na pia miundo mingine kama backup
                downloadUrl = data?.result?.download_url || 
                              data?.result?.url || 
                              data?.url || 
                              data?.data?.download;

                if (downloadUrl && downloadUrl.startsWith('http')) {
                    break; 
                }
            } catch (err) {
                console.log(`Seva ya ${api.split('/')[2]} imeshindwa, tunajaribu nyingine...`);
                continue; 
            }
        }

        // 4. Kama tumepata Link, tuma Audio
        if (downloadUrl) {
            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            await sock.sendMessage(
                chatId,
                {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${videoTitle}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: videoTitle,
                            body: `Msanii: ${video.author.name} | Loft Quantum`,
                            thumbnailUrl: video.thumbnail,
                            sourceUrl: videoUrl,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                },
                { quoted: message }
            );

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } else {
            await sock.sendMessage(chatId, { text: '❌ *Imeshindwa kupata audio. Seva zote zimekataa.*' }, { quoted: message });
        }

    } catch (error) {
        console.error('Song Command Error:', error);
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu ya kiufundi imetokea.*' }, { quoted: message });
    }
}

module.exports = songCommand;
