const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { toAudio } = require('../lib/converter');  // ← Badilisha path kama inahitajika
const { sendButtons } = require('gifted-btns');

async function songCommand(sock, chatId, message, buttonResponse = null) {
    if (!sock) return;

    // ==================== BUTTON HANDLER ====================
    if (buttonResponse) {
        const buttonId = buttonResponse;

        // ==================== AUDIO HANDLER ====================
        if (buttonId.startsWith('play_audio_')) {
            const videoId = buttonId.replace('play_audio_', '');
            const url = `https://www.youtube.com/watch?v=${videoId}`;

            await sock.sendMessage(chatId, { react: { text: '⬇️', key: message.key } });
            await sock.sendMessage(chatId, { text: '⬇️ *Inapakuliwa Audio... Subiri kidogo*' }, { quoted: message });

            try {
                const stream = ytdl(url, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25,
                });

                const buffers = [];

                stream.on('data', (chunk) => {
                    buffers.push(chunk);
                });

                stream.on('end', async () => {
                    const audioBuffer = Buffer.concat(buffers);

                    if (audioBuffer.length < 10000) {
                        return sock.sendMessage(chatId, { 
                            text: '❌ *Audio file ni tupu au ndogo sana*' 
                        }, { quoted: message });
                    }

                    // ←←← HAPA NDIO MAGIC - Tumia converter yako
                    const convertedAudio = await toAudio(audioBuffer, 'webm');  // webm au m4a inaweza kuja

                    await sock.sendMessage(chatId, {
                        audio: convertedAudio,
                        mimetype: 'audio/mpeg',
                        fileName: `${videoId}.mp3`,
                        ptt: false,
                        contextInfo: {
                            externalAdReply: {
                                title: "Now Playing",
                                body: "Mickey Glitch Tech",
                                mediaType: 2,
                                thumbnailUrl: "https://i.ibb.co/0jZ8Y7s/music.jpg",
                                sourceUrl: url,
                            }
                        }
                    }, { quoted: message });

                    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                });

                stream.on('error', (err) => {
                    console.error("Stream Error:", err);
                    sock.sendMessage(chatId, { text: '❌ *Stream error while downloading*' }, { quoted: message });
                });

            } catch (err) {
                console.error("Audio Error:", err);
                await sock.sendMessage(chatId, { text: '❌ *Download imeshindwa!*' }, { quoted: message });
            }
            return;
        }

        // ==================== VIDEO HANDLER ====================
        if (buttonId.startsWith('play_video_')) {
            const videoId = buttonId.replace('play_video_', '');
            const url = `https://www.youtube.com/watch?v=${videoId}`;

            await sock.sendMessage(chatId, { react: { text: '⬇️', key: message.key } });
            await sock.sendMessage(chatId, { text: '⬇️ *Inapakuliwa Video... Subiri kidogo*' }, { quoted: message });

            try {
                const stream = ytdl(url, {
                    filter: 'audioandvideo',
                    quality: 'highest',
                    highWaterMark: 1 << 25,
                });

                const buffers = [];

                stream.on('data', (chunk) => buffers.push(chunk));
                stream.on('end', async () => {
                    const videoBuffer = Buffer.concat(buffers);

                    await sock.sendMessage(chatId, {
                        video: videoBuffer,
                        mimetype: 'video/mp4',
                        fileName: `${videoId}.mp4`,
                        caption: '✅ Video imepakuliwa na Mickey Glitch Tech',
                        contextInfo: {
                            externalAdReply: {
                                title: "Video Downloaded",
                                body: "Mickey Glitch Tech",
                                mediaType: 1,
                                thumbnailUrl: "https://i.ibb.co/0jZ8Y7s/music.jpg",
                                sourceUrl: url,
                            }
                        }
                    }, { quoted: message });

                    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                });

                stream.on('error', (err) => {
                    console.error("Video Error:", err);
                    sock.sendMessage(chatId, { text: '❌ *Video download imeshindwa*' }, { quoted: message });
                });

            } catch (err) {
                console.error("Video Error:", err);
                await sock.sendMessage(chatId, { text: '❌ *Video download imeshindwa!*' }, { quoted: message });
            }
            return;
        }
    }

    // ==================== .play COMMAND ====================
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
            { id: `play_video_${vid.videoId}`, text: '🎥 VIDEO (MP4)' }
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