const axios = require('axios');
const yts = require('yt-search');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '🎵 *Please provide a song name!*\nExample: .play Adele Hello' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Song not found!*' });

        const vid = videos[0];
        const url = vid.url;

        // --- FIXED AUDIO DOWNLOAD LOGIC ---
        try {
            // Using a reliable API to get the direct MP3 link
            const res = await axios.get(`https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(url)}`);
            
            // Extract the download URL from the specific API response structure
            const downloadUrl = res.data.result.downloadUrl || res.data.result;

            await sock.sendMessage(chatId, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mpeg', // CRITICAL: This fixes the "File Error" on WhatsApp
                fileName: `${vid.title}.mp3`,
                ptt: false 
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

        } catch (downloadErr) {
            console.error("DOWNLOAD ERROR:", downloadErr.message);
            await sock.sendMessage(chatId, { 
                text: `❌ *Download Failed:* The server is currently busy. Please try again later.\n\nTitle: ${vid.title}` 
            }, { quoted: message });
        }

    } catch (err) {
        console.error("SYSTEM ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *An error occurred!* Please try again.' }, { quoted: message });
    }
}

module.exports = songCommand;
