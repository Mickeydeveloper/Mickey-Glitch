/**
 * commands/video.js - Mickey Video Downloader
 * Export format: module.exports = videoCommand;
 */

const yts = require('yt-search');
const axios = require('axios');

async function videoCommand(sock, chatId, m, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";

        // Tunakata neno la kwanza (.video) na kuchukua jina la video lilobaki
        const args = msgText.trim().split(/\s+/).slice(1);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: '╭━━━━〔 *🎬 MICKEY VIDEO* 〕━━━━┈⊷\n┃\n┃ 📝 *Usage:* `.video [jina la video]`\n┃ 🎥 *Example:* `.video kofia`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: m });
        }

        // 1. Reaction ya kuanza utafutaji (Search)
        await sock.sendMessage(chatId, { react: { text: '🔍', key: m.key } }).catch(() => {});

        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } }).catch(() => {});
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata video hii!* 🎥' }, { quoted: m });
        }

        // 2. Reaction ya kupata matokeo (Found)
        await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});

        const formatViews = (views) => {
            if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
            if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
            return views.toString();
        };

        const caption = `╔═══════════════════════╗\n` +
            `║  🎬 *VIDEO DOWNLOAD* 🎬  ║\n` +
            `╚═══════════════════════╝\n\n` +
            `🎥 *Channel:* \`${v.author.name}\`\n` +
            `📌 *Title:* \`${v.title}\`\n` +
            `⏱️ *Duration:* \`${v.timestamp}\`\n` +
            `👁️ *Views:* \`${formatViews(v.views)}\`\n\n` +
            `🔄 *Inapakuliwa...* ⬇️\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `_📺 Karibu kidogo... 📺_`;

        // Tuma picha (Thumbnail) bila link
        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: m });

        // 3. Reaction ya kuanza kudownload (Downloading)
        await sock.sendMessage(chatId, { react: { text: '⬇️', key: m.key } }).catch(() => {});

        // API Request (Nayan API)
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 60000 });

        // KUSOMA JSON: Tunafuata muundo uleule (res.data.data.data.high)
        const videoUrl = res.data?.data?.data?.high || res.data?.data?.data?.low;

        if (!videoUrl) throw new Error('Video link not found in JSON');

        // 4. Tuma Video
        await sock.sendMessage(chatId, {
            video: { url: videoUrl },
            caption: `✅ *Tayari!* 🎬\n\n*${v.title}*`,
            mimetype: 'video/mp4'
        }, { quoted: m });

        // Reaction ya kumaliza (Success)
        await sock.sendMessage(chatId, { react: { text: '🎬', key: m.key } }).catch(() => {});

    } catch (err) {
        console.error('[VIDEO] Error:', err.message);
        await sock.sendMessage(chatId, { react: { text: '⚠️', key: m.key } }).catch(() => {});
        await sock.sendMessage(chatId, { text: `❌ *Error:* Imeshindwa kupakua video kutoka server.` }, { quoted: m });
    }
}

module.exports = videoCommand;
