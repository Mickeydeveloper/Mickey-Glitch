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

        // 3. API Call - New YouTube API Structure
        let videoUrl = null;
        let selectedQuality = null;

        try {
            const api = `https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(v.url)}`;
            const res = await axios.get(api, { timeout: 30000 });

            // Check if API request was successful (accept 200 or true)
            const topStatus = res.data?.status;
            if (topStatus !== 200 && topStatus !== true) {
                throw new Error(`API Error - Invalid status: ${topStatus}`);
            }

            // Check if API data processing was successful
            if (!res.data?.data || !res.data.data.status) {
                const error = res.data?.data?.error || 'API processing failed';
                throw new Error(error);
            }

            // Extract formats array from nested structure
            const formats = res.data?.data?.data?.formats;
            
            if (!Array.isArray(formats) || formats.length === 0) {
                console.error("❌ API Response:", res.data);
                throw new Error("No formats available in API response");
            }

            // Sort by quality: prefer video_with_audio, then highest quality video
            const videoFormats = formats.filter(f => f.type === 'video_with_audio' || f.type === 'video');
            const bestFormat = videoFormats.length > 0 ? videoFormats[0] : formats[0];

            videoUrl = bestFormat?.url;
            selectedQuality = bestFormat?.quality || 'unknown';

            if (!videoUrl || !videoUrl.startsWith('http')) {
                console.error("❌ Formats available:", formats.map(f => ({ type: f.type, quality: f.quality })));
                throw new Error("Video URL not found in formats");
            }
        } catch (apiErr) {
            console.error("❌ API Error:", apiErr.message);
            throw new Error(`API Error: ${apiErr.message}`);
        }

        if (!videoUrl) {
            throw new Error("Failed to extract video URL");
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
