const axios = require('axios');
const yts = require('yt-search');

/**
 * SONG COMMAND - Inayotumia API nyingi kwa ufanisi wa hali ya juu
 */
async function songCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '❌ Tafadhali andika jina la wimbo au link ya YouTube!' }, { quoted: message });
    }

    try {
        // 1. React kuonyesha bot imeanza
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // 2. Search Video YouTube (yt-search)
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            return sock.sendMessage(chatId, { text: '❌ Wimbo haujapatikana YouTube!' }, { quoted: message });
        }

        const videoUrl = video.url;
        const videoTitle = video.title;

        // 3. Orodha ya API zako (Zimepangwa kuanza na uliyopenda zaidi)
        const MP3_APIS = [
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`,
            `https://apis-malvin.vercel.app/download/dlmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.dreaded.site/api/ytdl/audio?url=${encodeURIComponent(videoUrl)}`,
            `https://jawad-tech.vercel.app/download/ytmp3?url=${encodeURIComponent(videoUrl)}`
        ];

        // 4. Mfumo wa kutafuta link (Itajaribu moja baada ya nyingine mpaka ipate)
        let downloadUrl = null;
        await sock.sendMessage(chatId, { text: `📥 Unapakuliwa: *${videoTitle}*...` }, { quoted: message });

        for (const api of MP3_APIS) {
            try {
                const res = await axios.get(api, { timeout: 15000 });
                const data = res.data;
                
                // Kutafuta link kwenye kila muundo wa JSON wa API hizi
                downloadUrl = data?.result?.download_url || data?.data?.download || data?.result?.url || data?.url || data?.result;
                
                if (downloadUrl && downloadUrl.startsWith('http')) break; // Tukipata link, tunatoka kwenye loop
            } catch (e) {
                continue; // Ikifeli hii, jaribu inayofuata
            }
        }

        if (!downloadUrl) {
            throw new Error('Seva zote za download ziko chini kwa sasa.');
        }

        // 5. Tuma Audio kwa Mtumiaji
        await sock.sendMessage(
            chatId,
            {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${videoTitle}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: videoTitle,
                        body: `Muda: ${video.timestamp} | Slowed & Reverb`,
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: videoUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            },
            { quoted: message }
        );

        // 6. Reaction ya mafanikio
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('ERROR:', err.message);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu: ${err.message}` }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

module.exports = songCommand;
