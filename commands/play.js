/**
 * play.js - MIKI MUSIC (JSON ADAPTIVE)
 * Inasoma link hata kama haina extension (.mp3/.mp4)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;
    if (!query) return;

    await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } }).catch(() => {});

    try {
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });

        // Tuma Thumbnail
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: `🎵 *Title:* ${v.title}\n👤 *Author:* ${v.author.name}`
        }, { quoted: message });

        // 1. Fetch JSON kutoka API
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 15000 });

        // 2. SMART EXTRACTION (Inatafuta link kwny JSON popote ilipo)
        let audioUrl = null;
        const rawData = res.data;

        // Angalia structure uliyotuma (res.data.data.data.high)
        if (rawData?.data?.data?.high) {
            audioUrl = rawData.data.data.high;
        } else if (rawData?.data?.high) {
            audioUrl = rawData.data.high;
        } else {
            // Kama structure imebadilika, search link yoyote ya 'download'
            const searchLinks = JSON.stringify(rawData).match(/https?:\/\/[^\s"']+/g);
            audioUrl = searchLinks?.find(link => link.includes('download') || link.includes('ymcdn'));
        }

        if (!audioUrl) throw new Error("Link ya audio haikupatikana kwny JSON.");

        // 3. DOWNLOAD AUDIO (Muhimu: Headers lazima ziwepo)
        const audioRes = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

        // 4. TUMA WHATSAPP
        await sock.sendMessage(chatId, {
            audio: Buffer.from(audioRes.data),
            mimetype: 'audio/mp4',
            fileName: `${v.title}.mp3`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error("DEBUG ERROR:", err.message);
        await sock.sendMessage(chatId, {
            text: `❌ *Audio Error!*\n\n_Sababu: ${err.message}_`
        }, { quoted: message });
    }
}

module.exports = playCommand;
