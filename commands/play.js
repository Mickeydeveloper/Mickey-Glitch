/**
 * play.js - YouTube Music Downloader (Nayan API + Buffer)
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
                text: '✨ *MICKEY PLAY*\n\n📝 Usage: `.play [song name]`\n\n_Example: .play despacito_',
                quoted: message 
            });
        }

        // Onyesha reaction ya kusubiri
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } }).catch(() => {});

        const query = args.join(' ');

        // 1. SEARCH YOUTUBE
        const search = await yts(query);
        const video = search?.videos?.[0];

        if (!video) {
            await sock.sendMessage(chatId, { text: `❌ *Sikuipata:* ${query}` }, { quoted: message });
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
            return;
        }

        // 2. SEND PREVIEW (Picha na Maelezo)
        const caption = `🎵 *MICKEY PLAYER*\n\n` +
            `📝 *Title:* ${video.title}\n` +
            `👤 *Channel:* ${video.author.name}\n` +
            `⏳ *Duration:* ${video.timestamp}\n\n` +
            `*⬇️ Inapakua audio (Downloading)...*`;

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: caption
        }, { quoted: message }).catch(() => {});

        // 3. DOWNLOAD FROM YOUR API (Nayan Only)
        let audioUrl;
        const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(video.url)}`;

        const response = await axios.get(nayanApi, { timeout: 60000 });
        const apiData = response.data.data || response.data;

        // Tafuta URL ya audio kulingana na structure ya API yako
        audioUrl = response.data.url || 
                   apiData.url || 
                   apiData.links?.audio || 
                   apiData.result?.url ||
                   apiData.download_url;

        if (!audioUrl) {
            throw new Error('Audio URL haikupatikana kwenye API.');
        }

        // 4. CONVERT TO BUFFER AND SEND (Kama code yako ya mwanzo)
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioRes.data, 'utf-8');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title.replace(/[^\w\s-]/g, '')}.mp3`,
            ptt: false
        }, { quoted: message });

        // Reaction ya mafanikio
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('[play] Error:', err.message);
        await sock.sendMessage(chatId, { 
            text: `❌ *Imefeli:* ${err.message.slice(0, 60)}` 
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = playCommand;
