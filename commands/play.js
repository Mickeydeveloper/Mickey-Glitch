const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { sendButtons } = require('gifted-btns');

async function songCommand(sock, chatId, message, buttonResponse = null) {
    if (!sock) return;

    // ==================== KUSHUGHULIKIA BUTTON ====================
    if (buttonResponse) {
        const buttonId = buttonResponse;

        if (buttonId.startsWith('play_audio_')) {
            const videoId = buttonId.replace('play_audio_', '');
            const url = `https://www.youtube.com/watch?v=${videoId}`;

            await sock.sendMessage(chatId, { react: { text: '⬇️', key: message.key } });
            await sock.sendMessage(chatId, { text: '⬇️ *Inapakuliwa... Subiri kidogo*' }, { quoted: message });

            try {
                const stream = ytdl(url, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                });

                let bufferArray = [];
                stream.on('data', (chunk) => bufferArray.push(chunk));
                
                stream.on('end', async () => {
                    const audioBuffer = Buffer.concat(bufferArray);

                    await sock.sendMessage(chatId, {
                        audio: audioBuffer,
                        mimetype: 'audio/mp4',
                        fileName: `Mickey_Music.m4a`,
                        ptt: false,   // Muhimu ili iwe Music si Voice Note
                    }, { quoted: message });

                    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                });

            } catch (err) {
                console.error("Audio Download Error:", err);
                await sock.sendMessage(chatId, { text: '❌ *Download ya audio imeshindwa!*' }, { quoted: message });
            }
            return;
        }
    }

    // ==================== COMMAND YA .play ====================
    const textBody = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ").trim();

    if (!query) {
        return sock.sendMessage(chatId, { 
            text: '🎵 *Andika jina la wimbo!*\nMfano: `.play Adele Hello`' 
        }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || videos.length === 0) {
            return sock.sendMessage(chatId, { text: '❌ *Wimbo haukupatikana!*' }, { quoted: message });
        }

        const vid = videos[0];

        const playText = `
🎵 *SONG FOUND*
━━━━━━━━━━━━━━━━━━━━━━
📝 *Title:* ${vid.title}
👤 *Channel:* ${vid.author.name}
⏱️ *Duration:* ${vid.timestamp}
👁️ *Views:* ${vid.views.toLocaleString()}
📅 *Uploaded:* ${vid.ago}
━━━━━━━━━━━━━━━━━━━━━━
*Chagua format:*`;

        const playButtons = [
            { id: `play_audio_${vid.videoId}`, text: '🎵 AUDIO (MP3)' },
            { id: `play_video_${vid.videoId}`, text: '🎥 VIDEO (MP4)' },
            { id: `play_search_${encodeURIComponent(query)}`, text: '🔍 MORE RESULTS' }
        ];

        await sendButtons(sock, chatId, {
            title: '🎧 Mickey Music Downloader',
            text: playText,
            footer: 'Mickey Glitch Tech',
            image: { url: vid.thumbnail },
            buttons: playButtons
        }, { quoted: message });

    } catch (err) {
        console.error("Song Command Error:", err);
        await sock.sendMessage(chatId, { text: '❌ *Search imeshindwa!*' }, { quoted: message });
    }
}

module.exports = songCommand;