/**
 * play.js - YouTube Music Downloader (Fixed JSON Path + Buffer)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '✨ *MICKEY PLAY*\n\n📝 Usage: `.play [song name]`\n\n_Example: .play despacito_',
                quoted: message 
            });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } }).catch(() => {});

        const query = args.join(' ');

        // 1. SEARCH YOUTUBE
        const search = await yts(query);
        const video = search?.videos?.[0];

        if (!video) {
            await sock.sendMessage(chatId, { text: `❌ *Song not found:* ${query}` }, { quoted: message });
            return;
        }

        // 2. SEND PREVIEW
        const caption = `🎵 *MICKEY PLAYER*\n\n` +
            `📝 *Title:* ${video.title}\n` +
            `👤 *Channel:* ${video.author.name}\n` +
            `⏳ *Duration:* ${video.timestamp}\n\n` +
            `*⬇️ Inapakua audio, subiri kidogo...*`;

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: caption
        }, { quoted: message }).catch(() => {});

        // 3. DOWNLOAD FROM API (Nayan)
        const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(video.url)}`;
        const response = await axios.get(nayanApi, { timeout: 60000 });
        
        /**
         * FIX: Kulingana na JSON uliyotuma:
         * Link ipo ndani ya: response.data.data.data.high
         */
        const audioUrl = response.data?.data?.data?.high || response.data?.data?.data?.low;

        if (!audioUrl) {
            throw new Error('Audio link haikupatikana kwny JSON.');
        }

        // 4. CONVERT TO BUFFER AND SEND
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioRes.data, 'utf-8');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title.replace(/[^\w\s-]/g, '')}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('[play] Error:', err.message);
        await sock.sendMessage(chatId, { 
            text: `❌ *Imefeli:* ${err.message.slice(0, 80)}` 
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = playCommand;
