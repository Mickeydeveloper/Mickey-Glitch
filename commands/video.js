/**
 * playvideo.js - NAYAN VIDEO PLAYER
 * Uses: /alldown API (high quality video)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playVideoCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;

    // ❌ No input
    if (!query) {
        return sock.sendMessage(chatId, {
            text: '╭━━━━〔 *MICKEY VIDEO* 〕━━━━┈⊷\n┃ 📝 `.video [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷'
        }, { quoted: message });
    }

    // 🔍 Searching
    await sock.sendMessage(chatId, {
        react: { text: '🔍', key: message.key }
    }).catch(() => {});

    try {
        // 🔎 YouTube search
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, {
                text: '❌ *Sikuipata video!*'
            }, { quoted: message });
        }

        // 🎧 Found
        await sock.sendMessage(chatId, {
            react: { text: '🎬', key: message.key }
        }).catch(() => {});

        // 🖼️ Info
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption:
                `╭━━━━〔 *PLAY VIDEO* 〕━━━━┈⊷\n` +
                `┃ 🎬 ${v.title}\n` +
                `┃ ⏳ ${v.timestamp}\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`
        }, { quoted: message });

        // 📥 Downloading
        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        }).catch(() => {});

        // =========================
        // 🔥 CALL NAYAN API
        // =========================
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 30000 });

        const data = res.data?.data?.data;

        if (!data) throw new Error("Invalid API response");

        // 🎯 JARIBU HIGH KWANZA (Try high first)
        let videoUrl = null;
        let quality = null;

        if (data.high && data.high.length > 0) {
            videoUrl = data.high;
            quality = "HIGH 📹";
            console.log("✅ Using HIGH quality:", videoUrl);
        } else if (data.low && data.low.length > 0) {
            // Fallback to LOW if HIGH fails
            videoUrl = data.low;
            quality = "LOW 📺";
            console.log("⚠️ HIGH failed, using LOW quality:", videoUrl);
        }

        if (!videoUrl) throw new Error("❌ Hakuna HIGH wala LOW quality URLs!");

        console.log(`✅ Final URL (${quality}):`, videoUrl);

        // =========================
        // 🎬 SEND VIDEO
        // =========================
        await sock.sendMessage(chatId, {
            video: { url: videoUrl },
            caption: `🎬 ${data.title}`,
            mimetype: 'video/mp4'
        }, { quoted: message });

        // ✅ Success
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error("VIDEO ERROR:", err.message);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: '❌ *Imeshindikana kupakua video kutoka API!*'
        }, { quoted: message });
    }
}

module.exports = playVideoCommand;