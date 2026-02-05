const axios = require('axios');

const SETTINGS = {
    owner: 'Mickey',
    ytKey: process.env.YOUTUBE_API_KEY || 'AIzaSyDV11sdmCCdyyToNU-XRFMbKgAA4IEDOS0'
};

/* Updated Working APIs. 
   Note: I've added a few more stable ones.
*/
const PROVIDERS = [
    url => `https://api.giftedtech.my.id/api/download/dlmp3?url=${url}`,
    url => `https://api.siputzx.my.id/api/dwnld/ytmp3?url=${url}`,
    url => `https://api.zenkey.my.id/api/download/ytmp3?url=${url}`,
    url => `https://widipe.com/download/ytdl?url=${url}`
];

/**
 * Enhanced Downloader with Headers
 */
async function getDownloadUrl(youtubeUrl) {
    const encodedUrl = encodeURIComponent(youtubeUrl);
    
    for (const provider of PROVIDERS) {
        try {
            const endpoint = provider(encodedUrl);
            
            // Adding headers is the key to preventing "Failed" errors
            const response = await axios.get(endpoint, { 
                timeout: 12000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
                }
            });

            const data = response.data;
            
            // Flexible parsing logic to handle different API structures
            const link = 
                data?.result?.download_url || 
                data?.result?.url || 
                data?.data?.url || 
                data?.data?.mp3 || 
                data?.url ||
                data?.dl; // Some APIs use 'dl'

            if (link && link.startsWith('http')) return link;
        } catch (e) {
            console.error(`Provider failed: ${e.message}`);
            continue; 
        }
    }
    throw new Error("No working download link found. Please try again in a moment.");
}

/**
 * Main Command
 */
const songCommand = async (sock, chatId, message) => {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    const query = text.split(" ").slice(1).join(" ");

    if (!query) return sock.sendMessage(chatId, { text: "⚠️ Please provide a song name or link." });

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        // Search Logic
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${SETTINGS.ytKey}`;
        const searchRes = await axios.get(searchUrl);
        const video = searchRes.data.items?.[0];

        if (!video) {
            return sock.sendMessage(chatId, { text: "❌ Video not found on YouTube." });
        }

        const videoId = video.id.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const title = video.snippet.title;

        // Fetching Audio
        const audioLink = await getDownloadUrl(videoUrl);

        // Sending Audio
        await sock.sendMessage(chatId, {
            audio: { url: audioLink },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `Downloaded for ${SETTINGS.owner}`,
                    thumbnailUrl: video.snippet.thumbnails.high.url,
                    sourceUrl: videoUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}` });
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
    }
};

module.exports = songCommand;
