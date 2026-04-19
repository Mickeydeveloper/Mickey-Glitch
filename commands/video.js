const { sendButtons } = require('gifted-btns');
const yts = require('yt-search');
const ruhend = require('ruhend-scraper');

async function videoCommand(sock, chatId, message, args) {
    try {
        // --- FIX: Hakikisha args ni Array ---
        const validArgs = Array.isArray(args) ? args : [];
        
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.buttonsResponseMessage?.selectedButtonId || "";

        if (!body) return;

        // Tunasafisha command
        const command = body.startsWith('.') ? body.slice(1).trim().split(/ +/).shift().toLowerCase() : "";
        
        // --- FIX: Tunatumia validArgs hapa ---
        const searchQuery = validArgs.join(' ').trim();

        // --- 1. BRING BUTTONS (.video [name]) ---
        if (command === 'video') {
            if (!searchQuery) {
                return await sock.sendMessage(chatId, { text: '❌ *What are you searching for?*\nExample: .video Mario oluwa' }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) return await sock.sendMessage(chatId, { text: '❌ Not found!' });

            const v = videos[0];
            const title = v.title;

            const caption = `🎥 *MICKEY MEDIA SEARCH*\n━━━━━━━━━━━━━━━━━━━━━━\n📝 *Title:* ${title}\n⏳ *Duration:* ${v.timestamp}\n━━━━━━━━━━━━━━━━━━━━━━\n*Choose what you want below:* 👇`;

            await sendButtons(sock, chatId, {
                title: '🎬 DOWNLOADER PANEL',
                text: caption,
                footer: 'Mickey Glitch Tech',
                image: { url: v.thumbnail },
                buttons: [
                    // Tunatumia .ytvideo kama command itakayokuja kwny body button ikibonyezwa
                    { id: `.ytvideo ${title}`, text: '🎥 VIDEO (MP4)' },
                    { id: `.play ${title}`, text: '🎵 AUDIO (MP3)' }
                ]
            }, { quoted: message });

            return await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        // --- 2. KUDOWNLOAD VIDEO (.ytvideo [jina]) ---
        if (command === 'ytvideo') {
            const downloadQuery = body.replace(/^\.ytvideo\s+/i, '').trim(); 
            if (!downloadQuery) return;

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const { videos } = await yts(downloadQuery);
            if (!videos || videos.length === 0) return;

            const videoUrl = videos[0].url;
            const res = await ruhend.ytmp4(videoUrl);

            if (res && res.video) {
                await sock.sendMessage(chatId, {
                    video: { url: res.video },
                    caption: `✅ *Success:* ${res.title || title}`,
                    mimetype: 'video/mp4'
                }, { quoted: message });
            }
        }

    } catch (err) {
        console.error("VIDEO ERROR:", err.message);
    }
}

module.exports = videoCommand;
