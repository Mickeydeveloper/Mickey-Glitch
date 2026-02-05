const axios = require('axios');

/**
 * Configuration & API List
 */
const SETTINGS = {
    owner: 'Mickey',
    ytKey: process.env.YOUTUBE_API_KEY || 'AIzaSyDV11sdmCCdyyToNU-XRFMbKgAA4IEDOS0'
};

const PROVIDERS = [
    url => `https://apis-malvin.vercel.app/download/dlmp3?url=${url}`,
    url => `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${url}`,
    url => `https://api.dreaded.site/api/ytdl/audio?url=${url}`
];

/**
 * Sequential Downloader: Tries providers one by one
 */
async function getDownloadUrl(youtubeUrl) {
    for (const provider of PROVIDERS) {
        try {
            const endpoint = provider(encodeURIComponent(youtubeUrl));
            const { data } = await axios.get(endpoint, { timeout: 10000 });
            
            // Extract link using optional chaining
            const link = data?.result?.download_url || data?.result?.url || data?.data?.url || data?.url;
            
            if (link && link.startsWith('http')) return link;
        } catch (e) {
            continue; // Move to next provider if this one fails
        }
    }
    throw new Error("All download providers failed.");
}

/**
 * The Command Function
 */
const songCommand = async (sock, chatId, message) => {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    const query = text.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: "⚠️ Please provide a song name." });

    try {
        // 1. Search Logic
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${SETTINGS.ytKey}`;
        const searchRes = await axios.get(searchUrl);
        const video = searchRes.data.items[0];

        if (!video) throw new Error("Video not found.");

        const { videoId } = video.id;
        const { title, thumbnails } = video.snippet;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // 2. Visual Feedback
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        // 3. Fetch Audio Link
        const audioLink = await getDownloadUrl(videoUrl);

        // 4. Send Result
        await sock.sendMessage(chatId, {
            audio: { url: audioLink },
            mimetype: 'audio/mpeg',
            fileName: `${title.substring(0, 20)}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `By ${SETTINGS.owner}`,
                    thumbnailUrl: thumbnails.high.url,
                    sourceUrl: videoUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}` });
    }
};

module.exports = songCommand;
