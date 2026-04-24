/**
 * play.js - Mickey Music (Compact & Real-time Info)
 * Export format: module.exports = playCommand;
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;
    
    if (!query) {
        return sock.sendMessage(chatId, { 
            text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 `.play [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
        }, { quoted: message });
    }

    // 1. Reaction: Search 🔍
    await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } }).catch(() => {});

    try {
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });
        }

        // 2. Reaction: Found 🎧
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } }).catch(() => {});

        // Compact Caption (Title & Time Only)
        const caption = `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 \`${v.title}\`\n` +
            `┃ ⏳ \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: message });

        // 3. Reaction: Download 📥
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } }).catch(() => {});

        // API Request (Nayan JSON Path Fixed)
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api);
        
        let audioUrl = res.data?.data?.data?.high || 
                       res.data?.data?.data?.low || 
                       res.data?.data?.url;

        if (!audioUrl) throw new Error("Link missing");

        // 4. Download Buffer & Send
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // 5. Reaction: Success ✅
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('Play Error:', err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
        await sock.sendMessage(chatId, { text: '❌ *API Error! Jaribu tena baadae.*' });
    }
}

module.exports = playCommand;
