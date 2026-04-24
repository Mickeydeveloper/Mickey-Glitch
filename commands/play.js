/**
 * play.js - FINAL FIX (Formats API - Direct Googlevideo)
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
        // 🔎 SEARCH
        const search = await yts(query);
        const v = search.videos[0];

        if (!v) {
            return sock.sendMessage(chatId, { text: '❌ Sikuipata!' });
        }

        // 🎧 INFO
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: `🎵 ${v.title}\n⏳ ${v.timestamp}`
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        }).catch(() => {});

        // =========================
        // 🔥 CALL NEW API
        // =========================
        const api = `https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 30000 });

        const formats = res.data?.data?.data?.formats;

        if (!formats || !formats.length) {
            throw new Error("No formats found");
        }

        // =========================
        // 🎯 CHAGUA FORMAT YENYE AUDIO
        // =========================
        const format =
            formats.find(f => f.type === "video_with_audio") || formats[0];

        const audioUrl = format.url;

        if (!audioUrl) throw new Error("No valid URL");

        console.log("Selected format:", format.label);

        // =========================
        // 🎵 SEND DIRECT (NO DOWNLOAD)
        // =========================
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mp4',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (err) {
        console.error("PLAY ERROR:", err);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        });

        await sock.sendMessage(chatId, {
            text: '❌ *Imeshindikana kupata audio (format issue au network)*'
        }, { quoted: message });
    }
}

module.exports = playCommand;