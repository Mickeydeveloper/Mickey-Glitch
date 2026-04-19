const { sendButtons } = require('gifted-btns');
const yts = require('yt-search');
const ruhend = require('ruhend-scraper');

async function videoCommand(sock, chatId, message, args) {
    try {
        // --- 1. KUPATA BODY ---
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.buttonsResponseMessage?.selectedButtonId || "";

        if (!body) return;

        // --- 2. KUPATA SEARCH QUERY ---
        // Kama args haina kitu, tunachukua maneno yote baada ya .video
        let searchQuery = "";
        if (Array.isArray(args) && args.length > 0) {
            searchQuery = args.join(' ').trim();
        } else {
            searchQuery = body.split(' ').slice(1).join(' ').trim();
        }

        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase();

        // --- 3. LOGIC YA .VIDEO ---
        if (command === 'video') {
            if (!searchQuery) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ *Unatafuta nini?*\n\n*Mfano:* .video Mario oluwa' 
                }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                return await sock.sendMessage(chatId, { text: '❌ Video haijapatikana!' });
            }

            const v = videos[0];
            const title = v.title;

            const caption = `🎥 *MICKEY MEDIA SEARCH*\n━━━━━━━━━━━━━━━━━━━━━━\n📝 *Title:* ${title}\n⏳ *Duration:* ${v.timestamp}\n━━━━━━━━━━━━━━━━━━━━━━\n*Chagua hapo chini:* 👇`;

            await sendButtons(sock, chatId, {
                title: '🎬 DOWNLOADER PANEL',
                text: caption,
                footer: 'Mickey Glitch Tech',
                image: { url: v.thumbnail },
                buttons: [
                    { id: `.ytvideo ${title}`, text: '🎥 VIDEO (MP4)' },
                    { id: `.play ${title}`, text: '🎵 AUDIO (MP3)' }
                ]
            }, { quoted: message });

            return await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        // --- 4. LOGIC YA .YTVIDEO (Inatokea baada ya kubonyeza button) ---
        if (command === 'ytvideo') {
            const downloadQuery = body.replace(/^\.ytvideo\s+/i, '').trim(); 
            if (!downloadQuery) return;

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const { videos } = await yts(downloadQuery);
            if (!videos || videos.length === 0) return;

            const videoUrl = videos[0].url;
            const res = await ruhend.ytmp4(videoUrl);

            if (res.status) {
                await sock.sendMessage(chatId, {
                    video: { url: res.video },
                    caption: `✅ *Mickey-Stream:* ${res.title}`,
                    mimetype: 'video/mp4'
                }, { quoted: message });
            }
        }

    } catch (err) {
        console.error("VIDEO ERROR:", err.message);
    }
}

module.exports = videoCommand;
