const { sendButtons } = require('gifted-btns');
const yts = require('yt-search');
const ruhend = require('ruhend-scraper');

async function videoCommand(sock, chatId, message, args) {
    try {
        // --- MABORESHO YA USALAMA (Safety Fix) ---
        // Tunahakikisha body ipo kabla ya kuitumia
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.buttonsResponseMessage?.selectedButtonId || "";
        
        if (!body) return; // Kama hakuna maandishi, usifanye kitu

        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase();
        const searchQuery = args.join(' ').trim();

        // --- 1. KULETA BUTTONS (.video [jina]) ---
        if (command === 'video' && !body.startsWith('.ytvideo')) {
            if (!searchQuery) {
                return await sock.sendMessage(chatId, { text: '❌ *Unatafuta nini?*\nMfano: .video Mario oluwa' }, { quoted: message });
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
━━━━━━━━━━━━━━━━━━━━━━
*Chagua unachotaka hapa chini:* 👇`;

            await sendButtons(sock, chatId, {
                title: '🎬 DOWNLOADER PANEL',
                text: caption,
                footer: 'Mickey Glitch Tech',
                image: { url: v.thumbnail },
                buttons: [
                    { id: `ytvideo_${encodeURIComponent(title)}`, text: '🎥 VIDEO (MP4)' },
                    { id: `play_video_${encodeURIComponent(title)}`, text: '🎵 AUDIO (MP3)' }
                ]
            }, { quoted: message });
            
            return await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        // --- 2. KUDOWNLOAD VIDEO (.ytvideo [jina]) ---
        if (command === 'ytvideo') {
            // Hapa tunatumia jina lililotoka kwenye button search
            const downloadQuery = body.replace(/^\.ytvideo\s+/i, ''); 
            if (!downloadQuery) return;

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
            
            const { videos } = await yts(downloadQuery);
            if (!videos || videos.length === 0) return;

            const videoUrl = videos[0].url;
            const res = await ruhend.ytmp4(videoUrl);
            
            if (res.status) {
                await sock.sendMessage(chatId, {
                    video: { url: res.video },
                    caption: `✅ *Success:* ${res.title}`,
                    mimetype: 'video/mp4'
                }, { quoted: message });
            }
        }

    } catch (err) {
        console.error("VIDEO ERROR:", err);
        // Hatuwezi kutumia slice hapa tena bila hofu
    }
}

module.exports = videoCommand;
