/**
 * video.js - YouTube Video Downloader (Stylish & Fast)
 */

const yts = require('yt-search');
const axios = require('axios');

async function videoCommand(sock, chatId, message, args) {
    try {
        // Fix kwa ajili ya kupata text sahihi (Safety Fix)
        const rawText = typeof args === 'object' ? args.join(' ') : "";
        const searchQuery = rawText.trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: '╭━━━〔 *MICKEY VIDEO* 〕━━━┈⊷\n┃\n┃ 📝 *Usage:* `.video [video name]`\n┃ 💡 *Example:* `.video Mario oluwa`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷',
                quoted: message 
            });
        }

        // Loading Reaction
        await sock.sendMessage(chatId, { react: { text: '🎬', key: message.key } }).catch(() => {});

        // 1. SEARCH YOUTUBE
        const search = await yts(searchQuery);
        const video = search?.videos?.[0];

        if (!video) {
            await sock.sendMessage(chatId, { text: '❌ *Video haijapatikana!*' }, { quoted: message });
            return;
        }

        // 2. SEND STYLISH PREVIEW
        const stylishCaption = 
            `╭━━━━〔 *VIDEO SEARCH* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 🎥 *Title:* \`${video.title}\`\n` +
            `┃ 👤 *Channel:* \`${video.author.name}\`\n` +
            `┃ ⏳ *Duration:* \`${video.timestamp}\`\n` +
            `┃ 👁️ *Views:* \`${video.views.toLocaleString()}\`\n` +
            `┃\n` +
            `┃ 📥 *Status:* \`Downloading MP4...\`\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: stylishCaption
        }, { quoted: message }).catch(() => {});

        // 3. DOWNLOAD LOGIC (Using Nayan API - Moja tu kama ulivyotaka)
        const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(video.url)}`;
        const response = await axios.get(nayanApi, { timeout: 60000 });
        
        // Tunatafuta link ya video (high au low) kwenye JSON ya Nayan
        const resData = response.data?.data?.data || response.data?.data || response.data;
        const downloadUrl = resData.high || resData.low || resData.url;

        if (!downloadUrl) throw new Error('Download URL missed');

        // 4. SEND VIDEO (Directly using URL for speed)
        await sock.sendMessage(chatId, {
            video: { url: downloadUrl },
            caption: `✅ *Successfully Downloaded:* \`${video.title}\`\n\n*Mickey Tanzania Bot* 🚀`,
            mimetype: 'video/mp4',
            fileName: `${video.title}.mp4`
        }, { quoted: message });

        // Success Reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('[video] Error:', err.message);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu imetokea! Video hii huenda ni kubwa mno au API imechoka.*' 
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = videoCommand;
