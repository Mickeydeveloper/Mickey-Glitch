/**
 * play.js - ULTIMATE VERSION
 * Nayan API + Direct URL + ytdl fallback
 */

const yts = require('yt-search');
const axios = require('axios');
const ytdl = require('ytdl-core');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;

    if (!query) {
        return sock.sendMessage(chatId, {
            text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 `.play [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷'
        }, { quoted: message });
    }

    // 🔍 Searching
    await sock.sendMessage(chatId, {
        react: { text: '🔍', key: message.key }
    }).catch(() => {});

    try {
        // 🔎 Search YouTube
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });
        }

        // 🎧 Found
        await sock.sendMessage(chatId, {
            react: { text: '🎧', key: message.key }
        }).catch(() => {});

        // 🖼️ Info
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption:
                `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
                `┃ 🎵 ${v.title}\n` +
                `┃ ⏳ ${v.timestamp}\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`
        }, { quoted: message });

        // 📥 Downloading
        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        }).catch(() => {});

        let audioUrl = null;

        // =========================
        // 🔥 1. NAYAN API (PRIMARY)
        // =========================
        try {
            const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
            const res = await axios.get(api, { timeout: 30000 });

            const data = res.data?.data?.data;

            if (data?.low || data?.high) {
                audioUrl = data.low || data.high;
            }

        } catch (e) {
            console.log("Nayan API failed:", e.message);
        }

        // =========================
        // 🎵 2. SEND DIRECT URL (BEST)
        // =========================
        if (audioUrl && audioUrl.startsWith('http')) {
            await sock.sendMessage(chatId, {
                audio: { url: audioUrl },
                mimetype: 'audio/mp4',
                fileName: `${v.title}.mp3`,
                ptt: false
            }, { quoted: message });

        } else {
            // =========================
            // 🔁 3. FALLBACK: YTDL
            // =========================
            console.log("Switching to ytdl fallback...");

            const stream = ytdl(v.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });

            await sock.sendMessage(chatId, {
                audio: stream,
                mimetype: 'audio/mpeg',
                fileName: `${v.title}.mp3`,
                ptt: false
            }, { quoted: message });
        }

        // ✅ Success
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error('Play Error:', err);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: '❌ *Imeshindikana kupata audio (API + fallback zote zimegoma)*'
        }, { quoted: message });
    }
}

module.exports = playCommand;