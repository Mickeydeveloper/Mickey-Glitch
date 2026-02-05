const axios = require('axios');
const yts = require('yt-search');

/**
 * SONG COMMAND - Toleo la Subira (Haitoi Kosa Haraka)
 */
async function songCommand(sock, chatId, message) {
    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '❌ Tafadhali andika jina la wimbo!' }, { quoted: message });
    }

    try {
        // 1. Tafuta Video
        const search = await yts(query);
        const video = search.videos[0];
        if (!video) return sock.sendMessage(chatId, { text: '❌ Wimbo haupatikani!' });

        const videoUrl = video.url;
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        
        const statusMsg = await sock.sendMessage(chatId, { 
            text: `⏳ *${video.title}*\n\nSeva inatayarisha audio yako. Tafadhali subiri kidogo...` 
        }, { quoted: message });

        // 2. Orodha ya API za Uhakika
        const APIS = [
            `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(videoUrl)}`,
            `https://apis-malvin.vercel.app/download/dlmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.giftedtech.my.id/api/download/dlmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
            `https://api.dreaded.site/api/ytdl/audio?url=${encodeURIComponent(videoUrl)}`
        ];

        let downloadUrl = null;

        // 3. Mfumo wa Majaribio ya Kurudia (Retry System)
        for (const api of APIS) {
            let retries = 2; // Itajaribu kila seva mara 2 ikifeli
            while (retries > 0 && !downloadUrl) {
                try {
                    const res = await axios.get(api, { 
                        timeout: 80000, // Inasubiri hadi sekunde 80 (Zaidi ya dakika 1)
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    const data = res.data;
                    downloadUrl = data?.result?.download_url || data?.data?.download || data?.result?.url || data?.url || data?.result;

                    if (downloadUrl && downloadUrl.startsWith('http')) break;
                } catch (e) {
                    retries--;
                    if (retries > 0) await new Promise(resolve => setTimeout(resolve, 3000)); // Subiri sekunde 3 kabla ya kurudia
                }
            }
            if (downloadUrl) break;
        }

        if (!downloadUrl) {
            return sock.sendMessage(chatId, { text: '❌ Samahani, seva zote zimelemewa baada ya majaribio kadhaa. Jaribu tena baadae kidogo.' }, { quoted: message });
        }

        // 4. Tuma Audio (Inasubiri mpaka itume kikamilifu)
        await sock.sendMessage(
            chatId,
            {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: `Tayari kupakuliwa!`,
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: videoUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            },
            { quoted: message }
        );

        // Futa reaction ya mwanzo na weka tiki
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('Final Error Handler:', err);
        await sock.sendMessage(chatId, { text: '❌ Imeshindikana kukamilisha ombi lako kwa sasa.' }, { quoted: message });
    }
}

module.exports = songCommand;
