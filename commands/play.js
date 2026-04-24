/**
 * play.js - NAYAN ONLY (HIGH QUALITY)
 * Uses: /alldown API
 * Sends: buffer via axios
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;

    // ❌ No input
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
            return sock.sendMessage(chatId, {
                text: '❌ *Sikuipata!*'
            }, { quoted: message });
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

        // =========================
        // 🔥 CALL NAYAN API
        // =========================
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        console.log("📡 API Request:", api);
        
        const res = await axios.get(api, { timeout: 30000 });
        console.log("✅ API Response Status:", res.status);

        const data = res.data?.data?.data;
        if (!data) {
            console.error("❌ No data in response:", res.data);
            throw new Error("Invalid API response");
        }

        // 🎯 JARIBU HIGH KWANZA (Try high first)
        let audioUrl = null;
        let quality = null;

        if (data.high) {
            audioUrl = data.high;
            quality = "HIGH 🔊";
        } else if (data.low) {
            audioUrl = data.low;
            quality = "LOW 📻";
        }

        if (!audioUrl) throw new Error("❌ Hakuna HIGH wala LOW quality URLs!");

        console.log(`✅ Final URL (${quality}):`, audioUrl);

        // =========================
        // 🎵 DOWNLOAD BUFFER VIA AXIOS
        // =========================
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const audioBuffer = Buffer.from(audioRes.data);

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${data.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // ✅ Success
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error("❌ PLAY ERROR:", err.message);
        console.error("Full Error:", err);
        console.error("API Response:", err.response?.data);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: `❌ *Audio Error!*\n\n_Sababu: ${err.message}_`
        }, { quoted: message });
    }
}

module.exports = playCommand;
