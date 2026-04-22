/**
 * play.js - YouTube Music (Robust API + Gifted Buttons)
 */

const yts = require('yt-search');
const axios = require('axios');
const { sendButton } = require('gifted-bttns'); // Hakikisha ume-install: npm install gifted-bttns

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 `.play [song name]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: message });
        }

        const query = args.join(' ');
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });

        // Compact & Stylish Caption
        const caption = `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 \`${v.title}\`\n` +
            `┃ ⏳ \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        // 1. TUMA PREVIEW NA BUTTON (TUMIA GIFTED BTTNS)
        // Hii inatuma picha, caption na kitufe cha URL
        await sendButton(sock, chatId, {
            image: { url: v.thumbnail },
            caption: caption,
            footer: 'Mickey Glitch Bot',
            buttons: [
                {
                    type: 'cta_url',
                    display_text: 'WATCHING VIA YOUTUBE',
                    url: v.url,
                    merchant_url: v.url
                }
            ]
        }, { quoted: message });

        // 2. DOWNLOAD LOGIC (ROBUST JSON PICKER)
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api);
        
        // Hapa tunakagua JSON yako kwa umakini ili isifeli
        let audioUrl = null;
        if (res.data?.data?.data?.high) audioUrl = res.data.data.data.high;
        else if (res.data?.data?.data?.low) audioUrl = res.data.data.data.low;
        else if (res.data?.data?.url) audioUrl = res.data.data.url;
        else if (res.data?.url) audioUrl = res.data.url;

        if (!audioUrl) throw new Error("Link not found");

        // 3. BUFFER & SEND AUDIO
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("Play Error:", err.message);
        await sock.sendMessage(chatId, { text: '❌ *API imeshindwa kupata audio. Jaribu tena!*' });
    }
}

module.exports = playCommand;
