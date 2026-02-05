const axios = require('axios');
const yts = require('yt-search');

/**
 * SONG COMMAND - Ultra Stable Version
 */
async function songCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '❌ Tafadhali andika jina la wimbo!' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // 1. Search Video
        const search = await yts(query);
        const video = search.videos[0];
        if (!video) return sock.sendMessage(chatId, { text: '❌ Wimbo haupatikani!' });

        const videoUrl = video.url;
        await sock.sendMessage(chatId, { text: `⏳ *${video.title}* inatafutwa kwenye seva...` }, { quoted: message });

        // 2. Orodha ya API (Kuanzia zako hadi za dharura)
        const ALL_APIS = [
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`,
            `https://apis-malvin.vercel.app/download/dlmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.giftedtech.my.id/api/download/dlmp3?url=${encodeURIComponent(videoUrl)}`, // Backup imara
            `https://api.dreaded.site/api/ytdl/audio?url=${encodeURIComponent(videoUrl)}`,
            `https://widipe.com/download/ytdl?url=${encodeURIComponent(videoUrl)}` // Backup nyingine
        ];

        let downloadUrl = null;
        let success = false;

        // 3. Jaribu kila API moja baada ya nyingine (Hata kama inachelewa)
        for (let i = 0; i < ALL_APIS.length; i++) {
            try {
                console.log(`Jaribio la Seva ${i + 1}...`);
                
                const res = await axios.get(ALL_APIS[i], { 
                    timeout: 60000, // Inasubiri hadi dakika 1 kwa kila seva
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36'
                    }
                });

                const data = res.data;
                // Kuchuja kila aina ya jibu kutoka kwa API tofauti
                downloadUrl = data?.result?.download_url || 
                              data?.data?.download || 
                              data?.result?.url || 
                              data?.url || 
                              data?.result ||
                              data?.data?.mp3;

                if (downloadUrl && downloadUrl.startsWith('http')) {
                    success = true;
                    break; 
                }
            } catch (err) {
                console.log(`Seva ${i + 1} imefeli, ikihamia inayofuata...`);
                continue; 
            }
        }

        if (!success) {
            return sock.sendMessage(chatId, { text: '❌ Seva zote zipo chini kwa sasa. Tafadhali jaribu tena baada ya dakika 5.' }, { quoted: message });
        }

        // 4. Tuma Audio
        await sock.sendMessage(
            chatId,
            {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: `Msanii: ${video.author.name}`,
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

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu kubwa imetokea. Jaribu wimbo mwingine.' }, { quoted: message });
    }
}

module.exports = songCommand;
