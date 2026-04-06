const { sendButtons } = require('gifted-btns');
const yts = require('yt-search');
const ruhend = require('ruhend-scraper'); // Unayo kwenye package.json yako

async function videoCommand(sock, chatId, message, args) {
    try {
        const command = message.body.slice(1).trim().split(/ +/).shift().toLowerCase();
        const searchQuery = args.join(' ').trim();

        // --- SEHEMU YA 1: KULETA BUTTONS (.video [jina]) ---
        if (command === 'video' && !message.body.startsWith('.ytvideo')) {
            if (!searchQuery) {
                return await sock.sendMessage(chatId, { text: '❌ *Unatafuta nini?*\nMfano: .video Diamond Platnumz' }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) return await sock.sendMessage(chatId, { text: '❌ Haikupatikana!' });

            const v = videos[0];
            const title = v.title;

            const caption = `
🎥 *MICKEY MEDIA SEARCH*
━━━━━━━━━━━━━━━━━━━━━━
📝 *Title:* ${title}
⏳ *Duration:* ${v.timestamp}
👀 *Views:* ${v.views.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━
*Chagua unachotaka hapa chini:* 👇`;

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

        // --- SEHEMU YA 2: KUDOWNLOAD VIDEO (.ytvideo [jina]) ---
        if (command === 'ytvideo') {
            if (!searchQuery) return;

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
            
            // Tunatafuta URL tena kwa kutumia jina lililotumwa na button
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) return;

            const videoUrl = videos[0].url;

            // Kutumia ruhend-scraper (Nguvu zaidi na rahisi kuliko ytdl-core)
            const res = await ruhend.ytmp4(videoUrl);
            
            if (res.status) {
                await sock.sendMessage(chatId, {
                    video: { url: res.video },
                    caption: `✅ *Success:* ${res.title}`,
                    mimetype: 'video/mp4'
                }, { quoted: message });
            } else {
                throw new Error("Failed to get download link");
            }
        }

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu:* Server imeshindwa kupata faili.' });
    }
}

module.exports = videoCommand;
