/**
 * play.js - YouTube Music (Simple Audio Version)
 * Optimized for Mickey Glitch
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, m, text, options) {
    try {
        const query = typeof text === 'string' ? text.trim() : "";

        if (!query || query.length < 1) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━〔 *🎵 MICKEY MUSIC PLAYER* 〕━━━┈⊷\n┃\n┃ 📝 *Usage:* `.play [song name]`\n┃ 🎤 *Example:* `.play Essence Wizkid`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: m });
        }

        await sock.sendPresenceUpdate('composing', chatId).catch(() => {});
        await sock.sendMessage(chatId, { react: { text: '🔍', key: m.key } }).catch(() => {});

        const search = await yts(query);
        const v = search?.videos?.[0];
        
        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } }).catch(() => {});
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata nyimbo hii!* 🎵' }, { quoted: m });
        }

        const formatViews = (views) => {
            if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
            if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
            return views.toString();
        };

        const caption = `╔═══════════════════════╗\n` +
            `║  🎵 *PLAYING NOW* 🎵  ║\n` +
            `╚═══════════════════════╝\n\n` +
            `🎤 *Artist:* \`${v.author.name}\`\n` +
            `📌 *Title:* \`${v.title}\`\n` +
            `⏱️ *Duration:* \`${v.timestamp}\`\n` +
            `👁️ *Views:* \`${formatViews(v.views)}\`\n` +
            `📅 *Published:* \`${v.ago}\`\n\n` +
            `🔄 *Inapakuliwa (Downloading)...* ⬇️\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `_🎧 Powered by Mickey Glitch 🎧_`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: m });
        await sock.sendMessage(chatId, { react: { text: '📥', key: m.key } }).catch(() => {});

        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 45000 });

        let audioUrl = res.data?.data?.main_url || 
                       res.data?.data?.audio?.high || 
                       res.data?.data?.audio?.low || 
                       res.data?.data?.url ||
                       (res.data?.data?.links && res.data.data.links[0]?.url);

        if (!audioUrl) {
            throw new Error('Audio link not found');
        }

        // --- HAPA NIMEONDOA EXTERNAL AD REPLY ---
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl }, 
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: m });

        await sock.sendMessage(chatId, { react: { text: '🎵', key: m.key } }).catch(() => {});

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '⚠️', key: m.key } }).catch(() => {});

        let errorMsg = '❌ *Imeshindwa kupakua.*\n_Jaribu tena badaaye..._';
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m }).catch(() => {});
    }
}

module.exports = playCommand;
