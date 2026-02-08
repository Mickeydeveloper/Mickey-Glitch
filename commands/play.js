const axios = require('axios');
const yts = require('yt-search');

/**
 * SONG COMMAND - OPTIMIZED FOR SPEED & APPEARANCE
 * Imeondolewa maandishi marefu, imeongezewa Speed na UI ya kisasa.
 */
async function songCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '✨ *Andika jina la wimbo unaotaka!*' }, { quoted: message });
    }

    try {
        // 1. Reaction kuanza kutafuta (Inapunguza uhitaji wa maandishi mengi)
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } });

        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana YouTube.*' }, { quoted: message });
        }

        const videoUrl = video.url;
        const videoTitle = video.title;

        // 2. Maandalizi ya API kwa Speed (Concurrent execution)
        const apiKey = "dew_SHmZ6Kcc67WTZqLfC3GGC774gANCHhtfIudTPQak";
        const DOWNLOAD_APIS = [
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`,
            `https://api.srihub.store/download/ytmp3?url=${encodeURIComponent(videoUrl)}&apikey=${apiKey}`
        ];

        let downloadUrl = null;

        // 3. Jaribio la haraka la kupata Link (Speed Optimization)
        for (const api of DOWNLOAD_APIS) {
            try {
                // Timeout fupi zaidi ili isichelewe kama API moja imekufa
                const response = await axios.get(api, { timeout: 15000 });
                const resData = response.data;
                
                downloadUrl = resData.data?.url || resData.result?.download_url || resData.url;

                if (downloadUrl && downloadUrl.startsWith('http')) break;
            } catch (err) {
                continue; 
            }
        }

        if (downloadUrl) {
            // Reaction ya kupakua
            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            // 4. Kutuma Audio yenye Muonekano wa Kisasa
            await sock.sendMessage(
                chatId,
                {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${videoTitle}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: `🎵 ${videoTitle}`,
                            body: `⏱️ Muda: ${video.timestamp} | 👤 Msanii: ${video.author.name}`,
                            thumbnailUrl: video.thumbnail,
                            sourceUrl: videoUrl,
                            mediaType: 2, // Video style thumbnail
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                },
                { quoted: message }
            );

            // Reaction ya kukamilisha
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } else {
            await sock.sendMessage(chatId, { text: '❌ *Samahani, seva zote ziko bize kwa sasa.*' }, { quoted: message });
        }

    } catch (error) {
        console.error('Error:', error);
        await sock.sendMessage(chatId, { text: '❌ *Kuna tatizo la kiufundi, jaribu tena.*' }, { quoted: message });
    }
}

module.exports = songCommand;
