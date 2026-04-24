/**
 * play.js - Mickey Music (Nayan JSON Optimized)
 * Export format: module.exports = playCommand;
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        // Hakikisha tunapata maneno ya utafutaji (Search Query)
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);
        const query = args.join(' ');

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 Tumia: `.play [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: message });
        }

        // 1. Reaction ya kuanza utafutaji
        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } }).catch(() => {});

        const search = await yts(query);
        const v = search?.videos?.[0];
        
        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuupata wimbo huu!*' });
        }

        // 2. Reaction ya kupata matokeo
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } }).catch(() => {});

        const caption = `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 *Title:* \`${v.title}\`\n` +
            `┃ ⏳ *Time:* \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷\n\n*Inashusha audio...* 📥`;

        // TUMA PREVIEW (Picha na Maelezo tu, Bila Link wala Buttons)
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: caption
        }, { quoted: message });

        // 3. Reaction ya kuanza kudownload
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } }).catch(() => {});

        // API Request kulingana na JSON uliyotoa
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 60000 });
        
        // KUSOMA JSON: Tunafuata muundo: res.data -> data -> data -> high
        const audioUrl = res.data?.data?.data?.high || res.data?.data?.data?.low;

        if (!audioUrl) {
            throw new Error("Download link missing from JSON");
        }

        // 4. Download Audio Buffer
        const audioRes = await axios.get(audioUrl, { 
            responseType: 'arraybuffer',
            timeout: 120000 
        });
        const buffer = Buffer.from(audioRes.data, 'binary');

        // TUMA AUDIO
        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // 5. Reaction ya kumaliza
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('Play Error:', err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu!* Imeshindwa kupata audio kutoka kwa server.' 
        }, { quoted: message });
    }
}

module.exports = playCommand;
