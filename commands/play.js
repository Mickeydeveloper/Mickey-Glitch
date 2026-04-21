/**
 * play.js - Nayan API System (Optimized for Messenger)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    // 1. Angalia kama kuna jina la wimbo
    if (!args[0]) {
        return sock.sendMessage(chatId, { 
            text: '✨ *MICKEY PLAY*\n\nUsage: `.play [jina la wimbo]`' 
        }, { quoted: message });
    }

    // React kuonyesha bot imeanza kazi
    await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

    try {
        const query = args.join(' ');
        const search = await yts(query);
        const video = search.videos[0];

        // 2. Angalia kama video imepatikana
        if (!video) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' }, { quoted: message });
        }

        // Muonekano wa Pro (Image + Caption)
        const caption = `🎵 *MICKEY MUSIC PLAYER*\n\n` +
            `📝 *Title:* ${video.title}\n` +
            `👤 *Channel:* ${video.author.name}\n` +
            `⏳ *Duration:* ${video.timestamp}\n\n` +
            `*Tulia, audio inashushwa hivi punde...* 🎧`;

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: caption
        }, { quoted: message });

        // 3. Mfumo wa API ya Nayan (JSON format)
        // Tunatumia encodeURIComponent ili kuzuia makosa ya alama kwenye link
        const nayanApi = `https://nayan-video-downloader.vercel.app/api/ytdl?url=${encodeURIComponent(video.url)}`;
        
        const response = await axios.get(nayanApi, {
            timeout: 120000 // Sekunde 120 kuzuia "Command timeout"
        });

        // Kuchukua link ya download kutoka kwenye mfumo wa JSON wa Nayan
        // Kawaida Nayan inarudisha { status: true, title: "...", links: { ... } } au { url: "..." }
        // Nimetumia mfumo wa mwanzo uliokuwa unatafuta url moja kwa moja
        const downloadUrl = response.data.url || response.data.result?.url || response.data.links?.audio;

        if (!downloadUrl) {
            throw new Error("Link ya download haijapatikana kwenye JSON");
        }

        // 4. Tuma Audio kama File
        await sock.sendMessage(chatId, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mp4',
            fileName: `${video.title}.mp3`,
            ptt: false // Inatumwa kama audio file, sio voice note
        }, { quoted: message });

        // Malizia na reaction ya mafanikio
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('Play Error Log:', err.message);
        
        // Ujumbe wa Error kama ikifeli
        let errorTxt = '❌ *Error executing play:*';
        if (err.message.includes('timeout')) {
            errorTxt = '❌ *Error:* Command timeout (Mtandao uko slow).';
        } else {
            errorTxt = `❌ *Error:* Imeshindwa kupata audio.\n*(API huenda ina hitilafu)*`;
        }

        await sock.sendMessage(chatId, { text: errorTxt }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

module.exports = { playCommand };
