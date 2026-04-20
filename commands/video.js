const yts = require('yt-search');
const ruhend = require('ruhend-scraper');

async function videoCommand(sock, chatId, message, args) {
    try {
        const body = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        let searchQuery = (args && args.length > 0) ? args.join(' ') : body.split(' ').slice(1).join(' ');

        if (!searchQuery) {
            return await sock.sendMessage(chatId, { text: '❌ *Unatafuta nini?*\n\n*Mfano:* .video Mario - Mi Amor' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const searchResult = await yts(searchQuery);
        const video = searchResult.videos[0];

        if (!video) {
            return await sock.sendMessage(chatId, { text: '❌ Video haijapatikana!' });
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        const res = await ruhend.ytmp4(video.url);

        if (res && res.status && res.video) {
            await sock.sendMessage(chatId, {
                video: { url: res.video },
                caption: `🎥 *MICKEY VIDEO DOWNLOADER*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `📝 *Title:* ${video.title}\n` +
                         `⏳ *Duration:* ${video.timestamp}\n` +
                         `👤 *Channel:* ${video.author.name}\n` +
                         `🔗 *Link:* ${video.url}\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `*© Powered by Mickey Glitch*`,
                mimetype: 'video/mp4'
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } else {
            throw new Error("Download failed");
        }
    } catch (err) {
        await sock.sendMessage(chatId, { text: `🚨 *Hitilafu:* Imeshindwa kupakua video hii. Jaribu nyingine au uandike jina vizuri.` }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

module.exports = videoCommand;
