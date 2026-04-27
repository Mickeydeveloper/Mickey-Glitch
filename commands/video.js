/**
 * video.js - MIKI VIDEO (ULTRA-ADAPTIVE)
 * Inatafuta URL ya video popote ilipo kwenye JSON hata ikibadilika
 */

const yts = require('yt-search');
const axios = require('axios');

async function videoCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;

    if (!query) {
        return sock.sendMessage(chatId, {
            text: '╭━━━━〔 *MICKEY VIDEO* 〕━━━━┈⊷\n┃ 📝 `.video [jina la video]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷'
        }, { quoted: message });
    }

    // Reaction (itikia)
    await sock.sendMessage(chatId, {
        react: { text: '🎬', key: message.key }
    }).catch(() => {});

    try {
        // 1. YouTube Search
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });
        }

        // 2. Info ya Video
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: `╭━━━━〔 *VIDEO DOWNLOADING* 〕━━━━┈⊷\n┃ 🎬 *Title:* ${v.title}\n┃ ⏳ *Duration:* ${v.timestamp}\n┃ 👁️ *Views:* ${v.views}\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`
        }, { quoted: message });

        // 3. API Call - Adaptive Logic
        let videoUrl = null;

        try {
            // Kutumia endpoint ya alldown kama JSON uliyotuma
            const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
            const res = await axios.get(api, { timeout: 30000 });

            const rawData = res.data;

            // SMART EXTRACTION: Inatafuta link kwa mpangilio
            if (rawData?.data?.data?.high) {
                videoUrl = rawData.data.data.high;
            } else if (rawData?.data?.high) {
                videoUrl = rawData.data.high;
            } else if (rawData?.data?.data?.low) {
                videoUrl = rawData.data.data.low;
            } else {
                // Kama JSON imebadilika kabisa, tafuta link yoyote ya download
                const allLinks = JSON.stringify(rawData).match(/https?:\/\/[^\s"']+/g);
                videoUrl = allLinks?.find(l => l.includes('download') || l.includes('ymcdn') || l.includes('nayan'));
            }

            if (!videoUrl) throw new Error("Link ya video haijaonekana kwny JSON.");

        } catch (apiErr) {
            throw new Error(`API Connection Failed: ${apiErr.message}`);
        }

        // 4. Download Video (Buffer)
        // Kumbuka: Video ni kubwa, nimeongeza timeout hadi 2min
        const videoRes = await axios.get(videoUrl, { 
            responseType: 'arraybuffer', 
            timeout: 120000, 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Referer': 'https://nayan-video-downloader.vercel.app/'
            } 
        });

        // 5. Tuma Video kwny WhatsApp
        await sock.sendMessage(chatId, {
            video: Buffer.from(videoRes.data),
            mimetype: 'video/mp4',
            caption: `✅ *${v.title}*\n\nEnjoy your video!`,
            fileName: `${v.title}.mp4`
        }, { quoted: message });

        // Success Reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error("❌ VIDEO ERROR:", err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
        
        await sock.sendMessage(chatId, {
            text: `❌ *Video Error!*\n\n_Sababu: ${err.message}_`
        }, { quoted: message });
    }
}

module.exports = videoCommand;
