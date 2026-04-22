/**
 * video.js - YouTube Video Downloader (Compact & Stylish)
 */

const yts = require('yt-search');
const axios = require('axios');

async function videoCommand(sock, chatId, message, args) {
    try {
        const rawText = Array.isArray(args) ? args.join(' ') : "";
        const query = rawText.trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: '╭━━━━〔 *MICKEY VIDEO* 〕━━━━┈⊷\n┃ 📝 `.video [jina la video]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: message });
        }

        // React kutafuta
        await sock.sendMessage(chatId, { react: { text: '🎬', key: message.key } }).catch(() => {});

        // 1. SEARCH YOUTUBE
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });

        // 2. COMPACT CAPTION
        const caption = `╭━━━━〔 *WATCHING* 〕━━━━┈⊷\n` +
            `┃ 🎥 \`${v.title}\`\n` +
            `┃ ⏳ \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: message });

        // 3. DOWNLOAD LOGIC (Nayan API)
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 60000 });

        // JSON Path fix kulingana na muundo wako
        const resData = res.data?.data?.data || res.data?.data || res.data;
        const videoUrl = resData.high || resData.low || resData.url;

        if (!videoUrl) throw new Error();

        // 4. SEND VIDEO
        await sock.sendMessage(chatId, {
            video: { url: videoUrl },
            caption: `✅ \`${v.title}\``,
            mimetype: 'video/mp4'
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu! Jaribu tena baadae.*' });
    }
}

module.exports = videoCommand;
