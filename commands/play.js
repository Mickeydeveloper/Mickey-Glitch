/**
 * play.js - Mickey Music (Fixed & Robust API)
 * Export format: module.exports = playCommand;
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);
        const query = args.join(' ');

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 Tumia: `.play [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } }).catch(() => {});

        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuupata wimbo huu!*' });
        }

        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } }).catch(() => {});

        const caption = `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 \`${v.title}\`\n` +
            `┃ ⏳ \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } }).catch(() => {});

        // API Request kwa muundo wa JSON uliotoa
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api);

        // --- JSON ROBUST PICKER ---
        let audioUrl = res.data?.data?.data?.high || 
                       res.data?.data?.data?.low || 
                       res.data?.data?.url || 
                       res.data?.url;

        if (!audioUrl) throw new Error("Link not found in JSON");

        // --- BUFFER DOWNLOAD WITH HEADERS (FIX KWA ERROR) ---
        const audioRes = await axios({
            method: 'get',
            url: audioUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://nayan-video-downloader.vercel.app/'
            }
        });

        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('Play Error:', err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu!* Link ya audio imekataliwa na server. Jaribu tena baadae.' 
        }, { quoted: message });
    }
}

module.exports = playCommand;
