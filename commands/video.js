/**
 * video.js - MIKI VIDEO (DYNAMIC VERSION)
 * Inatafuta URL ya video popote ilipo kwenye JSON
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

    // React kuonyesha shughuli imeanza
    await sock.sendMessage(chatId, {
        react: { text: '🎬', key: message.key }
    }).catch(() => {});

    try {
        // 1. YouTube Search (Tafuta video)
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });
        }

        // 2. Info ya Video kabla ya kutuma
        const infoText = `╭━━━━〔 *VIDEO DOWNLOADING* 〕━━━━┈⊷\n┃ 🎬 *Title:* ${v.title}\n┃ ⏳ *Duration:* ${v.timestamp}\n┃ 👁️ *Views:* ${v.views}\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
        
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: infoText
        }, { quoted: message });

        // 3. API Call (Tumia API ileile ya /alldown)
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 30000 });

        /**
         * DYNAMIC URL FINDER (Video Version)
         * Inatafuta mp4 au link ya video kwenye JSON
         */
        const findVideoUrl = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            
            // Kagua keys za video kwa mpangilio wa ubora
            const keys = ['high', 'video', 'url', 'link', 'download', 'low'];
            for (let key of keys) {
                // Hakikisha ni string, inaanza na http, na siyo audio pekee
                if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
                    // Baadhi ya API zinaweka tag ya mp4, tunaihitaji
                    return obj[key];
                }
            }

            for (let key in obj) {
                const found = findVideoUrl(obj[key]);
                if (found) return found;
            }
            return null;
        };

        const videoUrl = findVideoUrl(res.data);

        if (!videoUrl) {
            console.error("❌ API Response:", res.data);
            throw new Error("Link ya video haijapatikana kwny API.");
        }

        // 4. Download Video kama Buffer
        const videoRes = await axios.get(videoUrl, { 
            responseType: 'arraybuffer', 
            timeout: 100000, // Video inachukua muda mrefu kidogo
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const videoBuffer = Buffer.from(videoRes.data);

        // 5. Tuma Video sasa
        await sock.sendMessage(chatId, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: `✅ *${v.title}* imekamilika!`,
            fileName: `${v.title}.mp4`
        }, { quoted: message });

        // Success Reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error("❌ VIDEO ERROR:", err.message);
        
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: `❌ *Video Error!*\n\n_Sababu: ${err.message}_`
        }, { quoted: message });
    }
}

module.exports = videoCommand;
