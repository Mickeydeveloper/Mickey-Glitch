const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);
const TEMP_DIR = path.join(process.cwd(), 'tmp');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

async function ensureTempDir() {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function downloadToFile(url, destPath) {
    const response = await axios.get(url, { ...AXIOS_DEFAULTS, responseType: 'stream' });
    await streamPipeline(response.data, fs.createWriteStream(destPath));
}

async function extractAudioFromVideo(videoUrl, audioPath) {
    await ensureTempDir();
    const tempVideoPath = path.join(TEMP_DIR, `tiktok_video_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

    try {
        await downloadToFile(videoUrl, tempVideoPath);
        await new Promise((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioBitrate('128k')
                .format('mp3')
                .save(audioPath)
                .on('end', resolve)
                .on('error', reject);
        });
    } finally {
        try { fs.unlinkSync(tempVideoPath); } catch (e) {}
    }
}

async function getTiktokDownload(url) {
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

    if (!res || !res.data || !res.data.status || !res.data.data) {
        throw new Error('No response from TikTok API');
    }

    const d = res.data.data;
    const videoUrl = d.video;
    if (!videoUrl) throw new Error('Could not find video URL in API response');

    return { 
        url: videoUrl, 
        title: d.title, 
        nickname: d.author?.nickname,
        thumbnail: d.thumbnail 
    };
}

async function tiktokAudioCommand(sock, chatId, message, url) {
    try {
        const tiktokUrl = (url || '').trim();
        if (!tiktokUrl || !tiktokUrl.includes('tiktok.com')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Weka link ya TikTok au tumia kitufe cha Audio. Mfano: .tiktok_audio https://www.tiktok.com/@user/video/123'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        let tikData;
        try {
            tikData = await getTiktokDownload(tiktokUrl);
        } catch (err) {
            console.error('Audio API Error:', err.message);
            return await sock.sendMessage(chatId, { text: '❌ API imeshindwa kupata TikTok. Jaribu tena baadaye.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        const audioPath = path.join(TEMP_DIR, `tiktok_audio_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
        try {
            await extractAudioFromVideo(tikData.url, audioPath);
            await sock.sendMessage(chatId, {
                audio: { url: audioPath },
                mimetype: 'audio/mpeg',
                fileName: 'tiktok-audio.mp3'
            }, { quoted: message });
        } catch (err) {
            console.error('Audio conversion error:', err.message);
            await sock.sendMessage(chatId, {
                text: '❌ Hitilafu wakati wa kuunda audio. Jaribu tena baadaye.'
            }, { quoted: message });
            return;
        } finally {
            setTimeout(() => {
                try { fs.unlinkSync(audioPath); } catch (e) {}
            }, 30 * 1000);
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (err) {
        console.error('TikTok audio command error:', err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadaye.' });
    }
}

async function tiktokCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('tiktok.com')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Weka link ya TikTok. Mfano: .tiktok https://www.tiktok.com/@user/video/123' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        let tikData;
        try {
            tikData = await getTiktokDownload(url);
        } catch (err) {
            console.error("API Error:", err.message);
            return await sock.sendMessage(chatId, { text: '❌ API imeshindwa (Error). Jaribu tena baadaye.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        try {
            const captionText = `✅ *TikTok Downloader*\n\n👤 *Author:* ${tikData.nickname || 'N/A'}\n📝 *Title:* ${tikData.title || 'No Title'}\n🔗 *Source:* ${url}`;
            const audioButtonId = `.tiktok_audio ${url}`;

            // 1. Tuma video kwanza
            await sock.sendMessage(chatId, {
                video: { url: tikData.url },
                mimetype: 'video/mp4',
                caption: captionText
            }, { quoted: message });

            // 2. Tuma button safi bila location (Interactive Message Format)
            const buttonMessage = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "TikTok Downloader",
                                hasMediaAttachment: false
                            },
                            body: {
                                text: "Bonyeza kitufe hapa chini kupata sauti (Audio) ya video hii."
                            },
                            footer: {
                                text: `TikTok Author: ${tikData.nickname || 'N/A'}`
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "🎵 Download Audio",
                                            id: audioButtonId
                                        })
                                    }
                                ],
                                messageVersion: 1
                            }
                        }
                    }
                }
            };

            await sock.relayMessage(chatId, buttonMessage, { messageId: sock.generateMessageID() });

        } catch (err) {
            console.error('Button send error:', err.message);
            await sock.sendMessage(chatId, { text: '🚨 *Hitilafu ya kutuma!* Video inaweza kuwa kubwa sana au link imeharibika.' });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("TIKTOK CMD ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = tiktokCommand;
module.exports.audio = tiktokAudioCommand;
