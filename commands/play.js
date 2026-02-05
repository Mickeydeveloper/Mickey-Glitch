const axios = require('axios');
const yts = require('yt-search');

/**
 * SONG COMMAND - MODERNISED & ULTRA-STABLE
 * Kazi: Kutafuta na kutuma audio kutoka YouTube
 */
async function songCommand(sock, chatId, message) {
    // 1. Pata maelezo ya ombi
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '❌ *Tafadhali andika jina la wimbo!* \n\nMfano: .song Love Nwantiti' }, { quoted: message });
    }

    try {
        // Alama ya kutafuta
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // 2. Tafuta video YouTube
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            return sock.sendMessage(chatId, { text: '❌ *Samahani, wimbo huo haujapatikana YouTube.*' }, { quoted: message });
        }

        const videoUrl = video.url;
        const videoTitle = video.title;

        // Ujumbe wa kuanza download
        const infoMessage = `🎵 *${videoTitle}*\n\n⏳ _Seva inatayarisha audio yako, tafadhali subiri kidogo..._`;
        await sock.sendMessage(chatId, { text: infoMessage }, { quoted: message });

        // 3. Orodha ya API za kudownload (Zimepangwa kwa ufanisi)
        const DOWNLOAD_APIS = [
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`,
            `https://api.giftedtech.my.id/api/download/dlmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://apis-malvin.vercel.app/download/dlmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://widipe.com/download/ytdl?url=${encodeURIComponent(videoUrl)}`
        ];

        let downloadUrl = null;

        // 4. Mchakato wa kutafuta Link ya Audio (Retry Logic)
        for (const api of DOWNLOAD_APIS) {
            try {
                // Tunapeana hadi sekunde 60 kwa kila API
                const response = await axios.get(api, { 
                    timeout: 60000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });

                const data = response.data;
                // Kuchuja link kulingana na muundo wa JSON wa API mbalimbali
                downloadUrl = data?.result?.download_url || 
                              data?.data?.download || 
                              data?.result?.url || 
                              data?.url || 
                              data?.result ||
                              data?.data?.mp3;

                if (downloadUrl && downloadUrl.startsWith('http')) {
                    break; // Tumefanikiwa kupata link!
                }
            } catch (err) {
                console.log(`Seva ilifeli, tunajaribu seva nyingine...`);
                continue; // Jaribu API inayofuata kwenye list
            }
        }

        // 5. Kama tumepata Link, tuma Audio
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
                            body: `Muda: ${video.timestamp} | Pakua Imekamilika`,
                            thumbnailUrl: video.thumbnail,
                            sourceUrl: videoUrl,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                },
                { quoted: message }
            );

            // Alama ya kumaliza
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } else {
            // Kama zote zimefeli
            await sock.sendMessage(chatId, { text: '❌ *Seva zote za download ziko bize kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.*' }, { quoted: message });
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        }

    } catch (error) {
        console.error('General Error:', error);
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu ya mfumo imetokea.*' }, { quoted: message });
    }
}

module.exports = songCommand;
