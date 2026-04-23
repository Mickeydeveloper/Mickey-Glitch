/**
 * play.js - YouTube Music with Interactive Buttons & Better Info Card
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, m, text, options) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━〔 *🎵 MICKEY MUSIC PLAYER* 〕━━━┈⊷\n┃\n┃ 📝 *Usage:* `.play [song name]`\n┃ 🎤 *Example:* `.play Essence Wizkid`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: m });
        }

        // Show "searching" status
        await sock.sendPresenceUpdate('composing', chatId).catch(() => {});
        
        // React: searching
        await sock.sendMessage(chatId, { react: { text: '🔍', key: m.key } }).catch(() => {});

        const query = args.join(' ');
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } }).catch(() => {});
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata nyimbo hii!* 🎵' }, { quoted: m });
        }

        // React: found
        await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});

        // PREMIUM SONG CARD - Enhanced UI
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
            `🔄 *Inakudownload...* ⬇️\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `_🎧 Enjoy your music! 🎧_`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: m });

        // API Request
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 30000 });
        
        // --- JSON PICKER (Try multiple paths) ---
        let audioUrl = res.data?.data?.data?.high || 
                       res.data?.data?.data?.low || 
                       res.data?.data?.high || 
                       res.data?.data?.url;

        if (!audioUrl) throw new Error('Audio link not found in API response');

        // React: downloading
        await sock.sendMessage(chatId, { react: { text: '⬇️', key: m.key } }).catch(() => {});

        // Buffer & Send
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const buffer = Buffer.from(audioRes.data, 'binary');

        // Clean filename
        const fileName = v.title.replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 100) + '.mp3';

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: fileName,
            ptt: false
        }, { quoted: m });

        // React: success with music note
        await sock.sendMessage(chatId, { react: { text: '🎵', key: m.key } }).catch(() => {});

    } catch (err) {
        console.error('[PLAY] Error:', err.message);
        
        // React: error
        await sock.sendMessage(chatId, { react: { text: '⚠️', key: m.key } }).catch(() => {});
        
        let errorMsg = '❌ *Kusoma imeshindwa*\n\n_Jaribu tena badaaye..._';
        if (err.message.includes('timeout')) {
            errorMsg = '⏱️ *API imechelewa.*\n\n_Jaribu nyimbo nyingine au subiri..._';
        } else if (err.message.includes('Audio link')) {
            errorMsg = '🔗 *Download link imeshindwa.*\n\n_Jaribu song nyingine..._';
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m }).catch(() => {});
    }
}

module.exports = playCommand;