/**
 * play.js - YouTube Music (Gifted Bttns + Reactions)
 */

const yts = require('yt-search');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

async function playCommand(sock, chatId, message, text) {
    try {
        const msgText = typeof text === 'string' ? text : "";
        const args = msgText.trim().split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 `.play [song name]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
            }, { quoted: message });
        }

        // 1. Reaction ya kuanza utafutaji (Search)
        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } }).catch(() => {});

        const query = args.join(' ');
        const search = await yts(query);
        const v = search?.videos?.[0];
        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Wimbo haujapatikana!*' });
        }

        // 2. Reaction ya kupata matokeo (Found)
        await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } }).catch(() => {});

        const caption = `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 \`${v.title}\`\n` +
            `┃ ⏳ \`${v.timestamp}\`\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        // TUMA PREVIEW NA BUTTON YA URL
        const buttons = new GiftedButtons();
        buttons.addUrl('WATCHING VIA YOUTUBE', v.url);
        
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: caption,
            footer: 'Mickey Tanzania Bot',
            buttons: buttons.getButtons(),
            headerType: 4
        }, { quoted: message });

        // 3. Reaction ya kuanza kudownload (Downloading)
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } }).catch(() => {});

        // API Request (Robust JSON Picker)
        const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
        const res = await axios.get(api);
        
        // Kusoma JSON uliyotoa kwa usahihi
        let audioUrl = res.data?.data?.data?.high || 
                       res.data?.data?.data?.low || 
                       res.data?.data?.url || 
                       res.data?.url;

        if (!audioUrl) throw new Error();

        // 4. Download & Send Buffer
        const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(audioRes.data, 'binary');

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // 5. Reaction ya kumaliza (Success)
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu! API huenda imezidiwa.*' });
    }
}

module.exports = playCommand;
