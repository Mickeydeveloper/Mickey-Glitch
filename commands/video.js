const yts = require('yt-search');
const axios = require('axios');

async function videoCommand(sock, chatId, m, text, options) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: '╭━━━━〔 *🎬 MICKEY VIDEO* 〕━━━━┈⊷\n┃\n┃ 📝 *Usage:* `.video [video name]`\n┃ 🎥 *Example:* `.video Essence Music Video`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: m.key } }).catch(() => {});
        await sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } }).catch(() => {});
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata video hii!* 🎥' }, { quoted: m });
        }

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
            `👁️ *Views:* \`${formatViews(v.views)}\`\n` +
            `📅 *Published:* \`${v.ago}\`\n\n` +
            `🔄 *Inakudownload...* ⬇️\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `_📺 Karibu kidogo... 📺_`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: m });

        await sock.sendMessage(chatId, { react: { text: '⬇️', key: m.key } }).catch(() => {});

        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 60000 });

        console.log('[VIDEO] API Response:', JSON.stringify(res.data, null, 2));

        const resData = res.data?.data?.data || res.data?.data || res.data;
        const videoUrl = resData.high || resData.low || resData.url;

        if (!videoUrl) throw new Error('Video link not found');

        await sock.sendMessage(chatId, {
            video: { url: videoUrl },
            caption: `✅ *Karibu!* 🎬\n\n_${v.title}_`,
            mimetype: 'video/mp4'
        }, { quoted: m });

        await sock.sendMessage(chatId, { react: { text: '🎬', key: m.key } }).catch(() => {});

    } catch (err) {
        console.error('[VIDEO] Error:', err);

        await sock.sendMessage(chatId, { react: { text: '⚠️', key: m.key } }).catch(() => {});
        
        let errorMsg = '❌ *Hitilafu! Jaribu tena baadae.*';
        if (err.message.includes('timeout')) {
            errorMsg = '⏱️ *API imechelewa. Jaribu tena badaaye.*';
        } else if (err.message.includes('Video link')) {
            errorMsg = '🔗 *Download link imeshindwa. Jaribu video nyingine.*';
        } else {
            errorMsg = `⚠️ *Error:* ${err.message}`;
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m }).catch(() => {});
    }
}

module.exports = videoCommand;
