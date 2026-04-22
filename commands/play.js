/**
 * play.js - YouTube Music Downloader (Stylish Appearance Version)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━〔 *MICKEY MUSIC* 〕━━━┈⊷\n┃\n┃ 📝 *Usage:* `.play [song name]`\n┃ 💡 *Example:* `.play despacito`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷',
                quoted: message 
            });
        }

        // Loading Reaction
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } }).catch(() => {});
        const query = args.join(' ');

        // 1. SEARCH YOUTUBE
        const search = await yts(query);
        const video = search?.videos?.[0];
        if (!video) return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });

        // 2. SEND STYLISH PREVIEW
        const stylishCaption = 
            `╭━━━━〔 *PLAYING NOW* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 🎵 *Title:* \`${video.title}\`\n` +
            `┃ 👤 *Artist:* \`${video.author.name}\`\n` +
            `┃ ⏳ *Duration:* \`${video.timestamp}\`\n` +
            `┃ 👁️ *Views:* \`${video.views.toLocaleString()}\`\n` +
            `┃\n` +
            `┃ 📥 *Status:* \`Downloading audio...\`\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: stylishCaption
        }, { quoted: message }).catch(() => {});

        // 3. DOWNLOAD LOGIC
        const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(video.url)}`;
        const response = await axios.get(nayanApi, { timeout: 60000 });
        
        let audioUrl = response.data?.data?.data?.high || response.data?.data?.data?.low || response.data?.data?.url;

        if (!audioUrl) throw new Error('URL missed');

        // 4. BUFFER & SEND
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: video.title,
                    body: `Artist: ${video.author.name}`,
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: video.url,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // Success Reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('[play] Error:', err.message);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu ya kiufundi imetokea wakati wa kupakua!*' 
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = playCommand;
