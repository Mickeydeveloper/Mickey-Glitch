const yts = require('yt-search');
const ruhend = require('ruhend-scraper');

/**
 * Mickey Glitch V3 - Video Downloader (Direct)
 * Inatafuta na kutuma video moja kwa moja bila buttons
 */
async function videoCommand(sock, chatId, message, args) {
    try {
        // 1. Pata maandishi ya mtumiaji (Get message text)
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || "";

        if (!body && (!args || args.length === 0)) return;

        // 2. Tengeneza search query (Prepare search query)
        let searchQuery = "";
        if (args && args.length > 0) {
            searchQuery = args.join(' ').trim();
        } else {
            searchQuery = body.split(' ').slice(1).join(' ').trim();
        }

        // Hakikisha query ipo
        if (!searchQuery || searchQuery === "") {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Unatafuta nini?*\n\n*Mfano:* .video Mario - Mi Amor' 
            }, { quoted: message });
        }

        // 3. Reaction ya kuanza kutafuta (Search reaction)
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // 4. Tafuta video YouTube (YouTube Search)
        const searchResult = await yts(searchQuery);
        const videos = searchResult.videos;

        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ *Video haijapatikana!* (Video not found)' }, { quoted: message });
        }

        // Tunachukua video ya kwanza (First result)
        const selectedVideo = videos[0];
        const videoUrl = selectedVideo.url;

        // 5. Reaction ya kuanza kupakua (Download reaction)
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // 6. Pakua video kwa kutumia Ruhend API (Using Ruhend Scraper)
        // Tunatumia ytmp4 kupata direct link ya video
        const downloadData = await ruhend.ytmp4(videoUrl);

        if (downloadData && downloadData.status && downloadData.video) {
            
            // 7. Tuma video kwa mtumiaji (Send video to user)
            await sock.sendMessage(chatId, {
                video: { url: downloadData.video },
                caption: `🎥 *MICKEY VIDEO DOWNLOADER*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `📝 *Title:* ${selectedVideo.title}\n` +
                         `⏳ *Duration:* ${selectedVideo.timestamp}\n` +
                         `👤 *Channel:* ${selectedVideo.author.name}\n` +
                         `🔗 *Link:* ${videoUrl}\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `*© Powered by Mickey Glitch*`,
                mimetype: 'video/mp4'
            }, { quoted: message });

            // Reaction ya kumaliza (Success reaction)
            return await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

        } else {
            // Ikishindwa kupata link kutoka kwa ruhend
            throw new Error("API failed to return a valid video link");
        }

    } catch (err) {
        // Hapa bot itakuambia tatizo ni nini kwenye terminal (Debug log)
        console.error("=== VIDEO DOWNLOAD ERROR ===");
        console.error(err.message);
        
        await sock.sendMessage(chatId, { 
            text: `🚨 *Hitilafu:* Samahani, nimeshindwa kupata video hiyo kwa sasa. Jaribu tena baadae au tafuta video nyingine.` 
        }, { quoted: message });
        
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

module.exports = videoCommand;
