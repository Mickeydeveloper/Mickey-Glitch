/**
 * play.js - YouTube Music with Interactive Buttons
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━〔 *MICKEY MUSIC* 〕━━━┈⊷\n┃ 📝 `.play [song name]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: message });
        }

        // Show "searching" status
        await sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        const query = args.join(' ');
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });

        // Enhanced Caption with Info
        const caption = `╭━━━━〔 *🎵 PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎤 *${v.title}*\n` +
            `┃ ⏳ Duration: \`${v.timestamp}\`\n` +
            `┃ 📺 Channel: \`${v.author.name}\`\n` +
            `┃ 👁️ Views: \`${v.views}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷\n\n🔄 Inakudownload...`;

        await sock.sendMessage(chatId, { image: { url: v.thumbnail }, caption }, { quoted: message });

        // API Request
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api, { timeout: 30000 });
        
        // --- JSON PICKER (Try multiple paths) ---
        let audioUrl = res.data?.data?.data?.high || 
                       res.data?.data?.data?.low || 
                       res.data?.data?.high || 
                       res.data?.data?.url;

        if (!audioUrl) throw new Error('Audio link not found in API response');

        // Buffer & Send
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const buffer = Buffer.from(audioRes.data, 'binary');

        // Clean filename
        const fileName = v.title.replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 100) + '.mp3';

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: fileName,
            ptt: false
        }, { quoted: message });

        // React with success
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error('[PLAY] Error:', err.message);
        
        let errorMsg = '❌ *Kusoma imeshindwa*';
        if (err.message.includes('timeout')) {
            errorMsg = '⏱️ *API imechelewa. Jaribu tena badaaye.*';
        } else if (err.message.includes('Audio link')) {
            errorMsg = '🔗 *Imeshindwa kupata download link. Jaribu song nyingine.*';
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message }).catch(() => {});
    }
}

module.exports = playCommand;