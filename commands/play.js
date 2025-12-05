const axios = require('axios');
const yts = require('yt-search');
const { getBuffer } = require("../lib/myfunc");

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

async function getIzumiDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://izumiiiiiiii.dpdns.org/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi youtube?url returned no download');
}

async function getIzumiDownloadByQuery(query) {
    const apiUrl = `https://izumiiiiiiii.dpdns.org/downloader/youtube-play?query=${encodeURIComponent(query)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi youtube-play returned no download');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return {
            download: res.data.dl,
            title: res.data.title,
            thumbnail: res.data.thumb
        };
    }
    throw new Error('Okatsu ytmp3 returned no download');
}

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const queryText = text.split(' ').slice(1).join(' ').trim();
        if (!queryText) {
            await sock.sendMessage(chatId, { text: 'Usage: .play <song name or YouTube link>' }, { quoted: message });
            return;
        }

        let video;
        if (queryText.includes('youtube.com') || queryText.includes('youtu.be')) {
            video = { url: queryText };
        } else {
            const search = await yts(queryText);
            if (!search || !search.videos.length) {
                await sock.sendMessage(chatId, { text: 'No results found.' }, { quoted: message });
                return;
            }
            video = search.videos[0];
        }

        // Send one video thumbnail with text
        try {
            const thumbnailBuffer = await getBuffer(video.thumbnail || "https://water-billimg.onrender.com/1761205727440.png");
            await sock.sendMessage(chatId, {
                text: `🎵 *Now Downloading:* ${video.title}\n⏱️ *Duration:* ${video.timestamp || 'Unknown'}\n\n🎧 Audio will be sent shortly...`,
                contextInfo: {
                    externalAdReply: {
                        title: `🎵 Music Player`,
                        body: "Processing your request...",
                        mediaType: 1,
                        thumbnail: thumbnailBuffer,
                        renderLargerThumbnail: true,
                        showAdAttribution: true,
                        sourceUrl: video.url
                    }
                }
            }, { quoted: message });
        } catch (e) { /* ignore thumbnail send errors */ }

        // Try Izumi primary by URL, then by query, then Okatsu fallback
        let audioData;
        try {
            audioData = await getIzumiDownloadByUrl(video.url);
        } catch (e1) {
            try {
                const query = video.title || queryText;
                audioData = await getIzumiDownloadByQuery(query);
            } catch (e2) {
                audioData = await getOkatsuDownloadByUrl(video.url);
            }
        }

        const audioUrl = audioData.download || audioData.dl || audioData.url;
        const title = audioData.title || video.title || 'song';

        // Send audio WITHOUT thumbnail
        try {
            await sock.sendMessage(chatId, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                ptt: false
            }, { quoted: message });
            
            // Send "Enjoy" message after audio
            await sock.sendMessage(chatId, {
                text: `🎵 *Enjoy!* 🎶\n\nTrack: ${title}`
            }, { quoted: message });
        } catch (e) {
            // Fallback: send audio without thumbnail meta
            console.error('Error sending audio:', e);
            await sock.sendMessage(chatId, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                ptt: false
            }, { quoted: message });
            
            // Still send enjoy message
            await sock.sendMessage(chatId, {
                text: `🎵 *Enjoy!* 🎶\n\nTrack: ${title}`
            }, { quoted: message });
        }

    } catch (err) {
        console.error('Play command error:', err);
        await sock.sendMessage(chatId, { text: '❌ Failed to download song.' }, { quoted: message });
    }
}

module.exports = playCommand;