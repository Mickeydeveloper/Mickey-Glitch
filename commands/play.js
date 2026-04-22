/**
 * play.js - YouTube Music (Compact & Buffer)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━〔 *MICKEY MUSIC* 〕━━━┈⊷\n┃ 📝 `.play [song name]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: message });
        }

        const query = args.join(' ');
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });

        // Stylish & Compact Caption
        const caption = `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 \`${v.title}\`\n` +
            `┃ ⏳ \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: message });

        // API Request (Nayan)
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api);
        
        // Exact JSON Path kutoka ulichotuma
        const audioUrl = res.data.data.data.high || res.data.data.data.low;

        if (!audioUrl) throw new Error();

        // Buffer & Send
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ *API Error! Jaribu tena.*' });
    }
}

module.exports = playCommand;
