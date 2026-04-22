/**
 * play.js - YouTube Music Downloader (Ultimate JSON Scraper)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '✨ *MICKEY PLAY*\n\n📝 Usage: `.play [song name]`',
                quoted: message 
            });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } }).catch(() => {});
        const query = args.join(' ');

        // 1. SEARCH YOUTUBE
        const search = await yts(query);
        const video = search?.videos?.[0];
        if (!video) return sock.sendMessage(chatId, { text: '❌ Wimbo haujapatikana.' });

        // 2. SEND PREVIEW
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: `🎵 *MICKEY PLAYER*\n\n📝 *Title:* ${video.title}\n⏳ *Duration:* ${video.timestamp}\n\n*⬇️ Inatuma audio sasa...*`
        }, { quoted: message }).catch(() => {});

        // 3. DOWNLOAD & DEEP SCRAPE JSON
        const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(video.url)}`;
        const response = await axios.get(nayanApi, { timeout: 60000 });
        
        let audioUrl = null;
        const resData = response.data;

        // --- DEEP SEARCH LOGIC ---
        // Tunakagua kila kona ya JSON uliyotuma kupata link ya high au low
        if (resData.data?.data?.high) audioUrl = resData.data.data.high;
        else if (resData.data?.data?.low) audioUrl = resData.data.data.low;
        else if (resData.data?.high) audioUrl = resData.data.high;
        else if (resData.url) audioUrl = resData.url; 
        else if (resData.data?.url) audioUrl = resData.data.url;

        if (!audioUrl) {
            // Kama bado haijapatikana, jaribu kutafuta popote penye "http" kwny inner data
            const fallback = resData.data?.data || resData.data || {};
            audioUrl = fallback.high || fallback.low || fallback.url;
        }

        if (!audioUrl || !audioUrl.startsWith('http')) {
            throw new Error('Link haikupatikana (API structure changed).');
        }

        // 4. DOWNLOAD BUFFER & SEND
        const audioRes = await axios.get(audioUrl, { 
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' } // Fake browser kuzuia block
        });
        
        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('[play] Error:', err.message);
        await sock.sendMessage(chatId, { 
            text: `❌ *Imefeli:* Link haijapatikana. (API imepata hitilafu).` 
        }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = playCommand;
