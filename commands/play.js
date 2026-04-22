/**
 * play.js - YouTube Music Downloader (Pure Buffer + Stylish)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        // Fix kwa error ya ".trim is not a function"
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━〔 *MICKEY MUSIC* 〕━━━┈⊷\n┃\n┃ 📝 *Usage:* `.play [song name]`\n┃ 💡 *Example:* `.play despacito`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷',
                quoted: message 
            });
        }

        // Loading Reaction (Headphones)
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } }).catch(() => {});
        const query = args.join(' ');

        // 1. SEARCH YOUTUBE
        const search = await yts(query);
        const video = search?.videos?.[0];
        if (!video) return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });

        // 2. SEND STYLISH PREVIEW (Picha kama picha kubwa)
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

        // 3. DOWNLOAD FROM API (Robust Nayan Only)
        const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(video.url)}`;
        const response = await axios.get(nayanApi, { timeout: 60000 });
        
        const resData = response.data;
        let audioUrl = null;

        // Tunakagua kila kona ya JSON (Deep Scrape) ili isilete Error
        if (resData.data?.data?.high) audioUrl = resData.data.data.high;
        else if (resData.data?.data?.low) audioUrl = resData.data.data.low;
        else if (resData.data?.url) audioUrl = resData.data.url;
        else if (resData.url) audioUrl = resData.url;

        if (!audioUrl) throw new Error('Link missed');

        // 4. CONVERT TO BUFFER & SEND AUDIO (Safely using arraybuffer)
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        // Tunageuza data kuwa Buffer kama mwanzo
        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title.replace(/[^\w\s-]/g, '')}.mp3`,
            ptt: false,
            // Nimeondoa 'contextInfo' yote hapa ili kusiwe na thumbnails ya ad
        }, { quoted: message });

        // Success Reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('[play] Error:', err.message);
        await sock.sendMessage(chatId, { 
            text: `❌ *Fails:* ${err.message.slice(0, 80)}` 
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = playCommand;
