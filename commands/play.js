/**
 * play.js - NAYAN ONLY (HIGH QUALITY)
 * Uses: /alldown API
 * Sends: buffer via axios
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

    await sock.sendMessage(chatId, {
        react: { text: '🔍', key: message.key }
    }).catch(() => {});

    try {
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n┃ 🎵 ${v.title}\n┃ ⏳ ${v.timestamp}\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`
        }, { quoted: message });

        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 30000 });

        const data = res.data?.data?.data;
        if (!data) throw new Error("Invalid API response");

        let audioUrl = data.high || data.low;
        if (!audioUrl) throw new Error("Hakuna HIGH wala LOW quality URLs!");

        // Download audio as buffer
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const audioBuffer = Buffer.from(audioRes.data);

        // Send audio buffer
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mp3',   // tumia 'audio/mp3' badala ya 'audio/mpeg'
            fileName: `${data.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error("❌ PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});
        await sock.sendMessage(chatId, {
            text: `❌ *Audio Error!*\n\n_Sababu: ${err.message}_`
        }, { quoted: message });
    }
}

module.exports = playCommand;
