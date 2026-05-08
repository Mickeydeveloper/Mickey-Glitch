const yts = require('yt-search');
const axios = require('axios');

// Function to get audio URL from multiple APIs
async function getAudioUrl(videoUrl) {
    const apis = [
        // API 1: apiskeith.top/download/ytmp3
        async () => {
            const apiUrl = `https://apiskeith.top/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            if (res.data?.status && res.data?.result) {
                return res.data.result;
            }
            throw new Error("API 1 failed");
        },
        // API 2: apiskeith.top/download/mp3
        async () => {
            const apiUrl = `https://apiskeith.top/download/mp3?url=${encodeURIComponent(videoUrl)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            if (res.data?.success && res.data?.downloadURL) {
                return res.data.downloadURL;
            }
            throw new Error("API 2 failed");
        },
        // API 3: eliteprotech-apis.zone.id/ytdown
        async () => {
            const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(videoUrl)}&format=mp3`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            // Check for common response patterns
            if (res.data?.downloadUrl || res.data?.url || res.data?.audio) {
                return res.data.downloadUrl || res.data.url || res.data.audio;
            }
            throw new Error("API 3 failed");
        },
        // Fallback: Original nayan API
        async () => {
            const apiUrl = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(videoUrl)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            const audioUrl = res.data?.data?.data?.audio || res.data?.data?.audio;
            if (audioUrl) {
                return audioUrl;
            }
            throw new Error("Fallback API failed");
        }
    ];

    for (const api of apis) {
        try {
            const audioUrl = await api();
            if (audioUrl) {
                return audioUrl;
            }
        } catch (err) {
            console.log(`API attempt failed: ${err.message}`);
            continue;
        }
    }

    throw new Error("All APIs failed to provide audio URL");
}

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
            caption: `🎵 *Title:* ${v.title}\n👤 *Author:* ${v.author.name}\n⏲️ *Dur:* ${v.timestamp}`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } }).catch(() => {});

        // Get audio URL from multiple APIs with fallback
        const audioUrl = await getAudioUrl(v.url);

        // Download audio as buffer
        const response = await axios({
            method: 'get',
            url: audioUrl,
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });
        const buffer = Buffer.from(response.data, 'binary');

        // Send as audio
        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error("PLAY COMMAND ERROR:", err.message);
        await sock.sendMessage(chatId, {
            text: `❌ *Audio Download Failed!*\n\n_Sababu: ${err.message}_\n\n_Jaribu tena au tuma link moja kwa moja_`
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = videoCommand;