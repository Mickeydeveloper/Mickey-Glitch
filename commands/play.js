/**
 * play.js - ULTRA STABLE (NO API VERSION)
 * Uses ytdl-core (direct YouTube audio)
 */

const yts = require('yt-search');
const ytdl = require('ytdl-core');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;

    if (!query) {
        return sock.sendMessage(chatId, {
            text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 `.play [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷'
        }, { quoted: message });
    }

    await sock.sendMessage(chatId, {
        react: { text: '🔍', key: message.key }
    }).catch(() => {});

    try {
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🎧', key: message.key }
        }).catch(() => {});

        const caption =
            `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n` +
            `┃ 🎵 ${v.title}\n` +
            `┃ ⏳ ${v.timestamp}\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        }).catch(() => {});

        // 🔥 STREAM AUDIO DIRECT (NO API)
        const stream = ytdl(v.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25 // avoid buffering issues
        });

        await sock.sendMessage(chatId, {
            audio: stream,
            mimetype: 'audio/mpeg',
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error('Play Error:', err);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: '❌ *Error kupata audio (YouTube blocked au network issue)*'
        }, { quoted: message });
    }
}

module.exports = playCommand;