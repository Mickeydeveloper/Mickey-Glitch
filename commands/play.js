/**
 * play.js - Mickey Music (Stable Dual API Version)
 * Fixed: Audio not sending / API parsing / Buffer crash
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;

    // ❌ Hakuna query
    if (!query) {
        return sock.sendMessage(chatId, {
            text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 `.play [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷'
        }, { quoted: message });
    }

    // 🔍 Reaction: Searching
    await sock.sendMessage(chatId, {
        react: { text: '🔍', key: message.key }
    }).catch(() => {});

    try {
        // 🔎 Search YouTube
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });
        }

        // 🎧 Reaction: Found
        await sock.sendMessage(chatId, {
            react: { text: '🎧', key: message.key }
        }).catch(() => {});

        // 🖼️ Send Thumbnail + Info
        const caption =
            `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 ${v.title}\n` +
            `┃ ⏳ ${v.timestamp}\n` +
            `┃ 👤 ${v.author.name}\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption
        }, { quoted: message });

        // 📥 Reaction: Downloading
        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        }).catch(() => {});

        let audioUrl = null;

        // =========================
        // 🔹 API 1: DANSCOT (FIXED)
        // =========================
        try {
            const danscotApi = `https://api.danscot.dev/api/youtube/downl/?url=${encodeURIComponent(v.url)}&fmt=mp3`;
            const resD = await axios.get(danscotApi, { timeout: 30000 });

            audioUrl =
                resD.data?.result?.url ||
                resD.data?.data?.download ||
                null;

        } catch (e) {
            console.log("Danscot API failed:", e.message);
        }

        // =========================
        // 🔹 API 2: NAYAN (AUDIO ONLY)
        // =========================
        if (!audioUrl) {
            try {
                const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
                const resN = await axios.get(nayanApi, { timeout: 30000 });

                audioUrl =
                    resN.data?.data?.audio?.url ||
                    resN.data?.data?.audio ||
                    null;

            } catch (e) {
                console.log("Nayan API failed:", e.message);
            }
        }

        // =========================
        // ❌ Kama API zote zimefail
        // =========================
        if (!audioUrl) throw new Error("All APIs failed");

        // =========================
        // 🎵 SEND AUDIO (NO BUFFER)
        // =========================
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // ✅ Success Reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error('Play Error:', err);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: '❌ *Imeshindikana kupakua audio. Jaribu tena baadae!*'
        }, { quoted: message });
    }
}

module.exports = playCommand;