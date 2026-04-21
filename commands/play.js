/**
 * play.js - Optimized for WhatsApp Messenger
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    if (!args[0]) {
        return sock.sendMessage(chatId, { 
            text: '✨ *MICKEY PLAY*\n\nUsage: `.play [jina la wimbo]`\nExample: `.play calm down`' 
        }, { quoted: message });
    }

    // Reaction ya mwanzo
    await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

    try {
        const query = args.join(' ');
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' }, { quoted: message });
        }

        // Muonekano wa Pro kwa kutumia Image Caption
        const caption = `🎵 *MICKEY MUSIC PLAYER*\n\n` +
            `📝 *Title:* ${video.title}\n` +
            `👤 *Channel:* ${video.author.name}\n` +
            `⏳ *Duration:* ${video.timestamp}\n` +
            `👁️ *Views:* ${video.views.toLocaleString()}\n\n` +
            `*Tulia, audio inashushwa hivi punde...* 🎧`;

        // Tuma picha na maelezo (Hii inatokea kwa kila mtu)
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: caption
        }, { quoted: message });

        // FIX TIMEOUT: Kutumia API yenye speed
        const apiUrl = `https://api.dreaded.site/api/ytdl/video?url=${video.url}`;
        
        const response = await axios({
            method: 'get',
            url: apiUrl,
            timeout: 120000 // Sekunde 120 kuzuia "Command timeout"
        });

        const downloadLink = response.data.result.download_url || response.data.result.url;

        // Tuma Audio kama File (Standard mp3)
        await sock.sendMessage(chatId, {
            audio: { url: downloadLink },
            mimetype: 'audio/mp4',
            fileName: `${video.title}.mp3`
        }, { quoted: message });

        // Malizia na reaction ya mafanikio
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('Play Error:', err);
        
        let errMsg = '❌ *Error:* Imeshindwa kupakua audio.';
        if (err.code === 'ECONNABORTED') errMsg = '❌ *Timeout:* Mtandao ni mdogo, jaribu tena hivi punde.';
        
        await sock.sendMessage(chatId, { text: errMsg }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

module.exports = { playCommand };
