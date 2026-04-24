/**
 * play.js - Mickey Music (Exact JSON Path Fix)
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

        const caption = `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 \`${v.title}\`\n` +
            `┃ ⏳ \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: message });

        // 3. Reaction: Download 📥
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } }).catch(() => {});

        // API Request kulingana na JSON yako
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api);
        
        // --- EXACT JSON PATH FIX ---
        // Muundo wako: res.data -> data (object) -> data (object) -> high
        let audioUrl = res.data.data.data.high || res.data.data.data.low;

        if (!audioUrl) throw new Error("Link missed");

        // 4. Download Buffer (With Headers)
        const audioRes = await axios({
            method: 'get',
            url: audioUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        const buffer = Buffer.from(audioRes.data, 'binary');

        // Tuma Audio
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
        await sock.sendMessage(chatId, { 
            text: '❌ *API imeshindwa kutoa audio. Jaribu tena!*' 
        }, { quoted: message });
    }
}

module.exports = playCommand;
