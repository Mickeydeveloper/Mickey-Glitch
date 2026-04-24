/**
 * play.js - NAYAN API (FIXED WITH BUFFER)
 * Uses mp4 audio stream (working)
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
        // 🔎 Search
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });
        }

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

        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        }).catch(() => {});

        // =========================
        // 🔥 NAYAN API
        // =========================
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 30000 });

        const data = res.data?.data?.data;

        if (!data) throw new Error("Invalid API response");

        // 🎯 chukua low (ndogo = faster)
        const audioUrl = data.low || data.high;

        if (!audioUrl) throw new Error("No download URL");

        // =========================
        // 🔥 DOWNLOAD BUFFER
        // =========================
        const audioRes = await axios({
            method: 'get',
            url: audioUrl,
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*'
            }
        });

        const buffer = Buffer.from(audioRes.data);

        // =========================
        // 🎵 SEND AUDIO (MP4 AUDIO)
        // =========================
        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mp4',
            fileName: `${data.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error('Play Error:', err.message);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: '❌ *Audio imegoma (API au format issue)*'
        }, { quoted: message });
    }
}

module.exports = playCommand;