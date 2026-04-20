const yts = require('yt-search');
const ruhend = require('ruhend-scraper');

async function videoCommand(sock, chatId, message, args) {
    try {
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || "";

        if (!body) return;

        // Kupata search query
        let searchQuery = "";
        if (Array.isArray(args) && args.length > 0) {
            searchQuery = args.join(' ').trim();
        } else {
            searchQuery = body.split(' ').slice(1).join(' ').trim();
        }

        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase();

        if (command === 'video') {
            if (!searchQuery) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ *Unatafuta nini?*\n\n*Mfano:* .video Mario oluwa' 
                }, { quoted: message });
            }

            // 1. Reaction ya kutafuta (Searching reaction)
            await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

            // 2. Tafuta video YouTube
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Video haijapatikana!' });
            }

            const v = videos[0];
            const videoUrl = v.url;

            // 3. Reaction ya kupakua (Downloading reaction)
            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            // 4. Pakua video kutumia ruhend-scraper
            const res = await ruhend.ytmp4(videoUrl);

            if (res.status && res.video) {
                // 5. Tuma video moja kwa moja (Send video directly)
                await sock.sendMessage(chatId, {
                    video: { url: res.video },
                    caption: `🎥 *MICKEY VIDEO DOWNLOADER*\n\n` +
                             `📝 *Title:* ${v.title}\n` +
                             `⏳ *Duration:* ${v.timestamp}\n` +
                             `🔗 *Link:* ${videoUrl}\n\n` +
                             `*© Powered by Mickey Glitch*`,
                    mimetype: 'video/mp4'
                }, { quoted: message });

                return await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            } else {
                throw new Error("Imeshindwa kupata video link.");
            }
        }

    } catch (err) {
        console.error("VIDEO ERROR:", err.message);
        await sock.sendMessage(chatId, { 
            text: `🚨 *Hitilafu:* Imeshindwa kupakua video. Jaribu tena baadae.` 
        }, { quoted: message });
    }
}

module.exports = videoCommand;
