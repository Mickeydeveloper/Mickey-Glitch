const { sendGiftedButtons } = require('gifted-btns');
const yts = require('yt-search');
const axios = require('axios');

/**
 * 1. MP4 Downloader Logic
 * Inajaribu API tofauti (Nayan & Keith)
 */
async function getVideoUrl(url) {
    const apis = [
        // API ya Nayan (Inatoa MP4 direct)
        async () => {
            const res = await axios.get(`https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(url)}`);
            return res.data?.data?.data?.video || res.data?.data?.video;
        },
        // API ya Keith (MP4)
        async () => {
            const res = await axios.get(`https://apiskeith.top/download/mp4?url=${encodeURIComponent(url)}`);
            if (res.data?.success) return res.data.downloadURL;
            throw new Error("Keith Fail");
        }
    ];

    for (const api of apis) {
        try {
            const link = await api();
            if (link) return link;
        } catch (e) { continue; }
    }
    throw new Error("APIs zote zimefeli kutoa MP4");
}

/**
 * 2. Main Command
 */
async function videoCommand(sock, chatId, message, args) {
    const q = Array.isArray(args) ? args.join(' ') : args;
    if (!q) return sock.sendMessage(chatId, { text: 'Weka jina la video!' });

    // React 🎬
    await sock.sendMessage(chatId, { react: { text: '🎬', key: message.key } });

    try {
        const s = await yts(q);
        const v = s?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ Sikuipata!' });

        // TUMA BUTTONS KUTUMIA GIFTED-BTNS
        // Tunatuma buttons mbili: Moja ya Audio na moja ya Video
        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎵 AUDIO",
                    id: `.myaudio ${v.url}`
                }),
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎥 VIDEO",
                    id: `.myvideo ${v.url}`
                }),
            }
        ];

        // Kutuma kwa npm ya gifted-btns
        await sendGiftedButtons({
            sock: sock,
            chatId: chatId,
            body: `🎬 *Title:* ${v.title}\n⏲️ *Dur:* ${v.timestamp}\n👁️ *Views:* ${v.views}`,
            footer: "Miki Video Downloader",
            title: "DOWNLOAD OPTIONS",
            media: {
                image: { url: v.thumbnail }
            },
            buttons: buttons,
            quoted: message
        });

    } catch (err) {
        console.error("ERROR:", err.message);
        sock.sendMessage(chatId, { text: `❌ Hitilafu: ${err.message}` });
    }
}

/**
 * 3. Handling Downloader (Kwa matumizi ya case zako)
 */
async function handleDownload(sock, chatId, vUrl, type) {
    try {
        if (type === 'video') {
            const downloadUrl = await getVideoUrl(vUrl);
            await sock.sendMessage(chatId, {
                video: { url: downloadUrl },
                mimetype: 'video/mp4',
                caption: "✅ Tayari imekamilika!"
            });
        }
    } catch (e) {
        sock.sendMessage(chatId, { text: "Download failed!" });
    }
}

module.exports = { videoCommand, getVideoUrl, handleDownload };
