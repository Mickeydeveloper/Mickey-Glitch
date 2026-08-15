const axios = require('axios');
const yts = require('yt-search');
const { ButtonV2 } = require('../lib/messageBuilder');

const AUDIO_API_BASE = 'https://apiziaul.vercel.app/api/downloader/ytmp3';
const AUDIO_TIMEOUT_MS = 120000;
const DOWNLOAD_TIMEOUT_MS = 180000;
const AXIOS_DEFAULTS = {
    timeout: AUDIO_TIMEOUT_MS,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: '*/*'
    }
};

function isYouTubeUrl(value = '') {
    if (!value) return false;
    return /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/)/i.test(value);
}

function extractYoutubeVideoId(ytUrl) {
    if (!ytUrl) return '';

    if (ytUrl.includes('youtu.be/')) {
        const after = ytUrl.split('youtu.be/')[1];
        return after.split('?')[0].split('&')[0].trim();
    }

    if (ytUrl.includes('youtube.com')) {
        try {
            const url = new URL(ytUrl);
            if (url.searchParams.get('v')) return url.searchParams.get('v');
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts[0] === 'shorts' && pathParts[1]) return pathParts[1];
        } catch {
            const match = ytUrl.match(/[?&]v=([^&]+)/i) || ytUrl.match(/\/shorts\/([^/?]+)/i);
            if (match && match[1]) return match[1];
        }
    }

    return '';
}

async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastErr = err;
            if (i < attempts) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    throw lastErr;
}

async function getYoutubeAudio(ytUrl) {
    const youtubeUrl = (typeof ytUrl === 'string' && ytUrl.trim()) ? ytUrl.trim() : '';
    if (!youtubeUrl) {
        throw new Error('Please provide a valid YouTube URL or song name');
    }

    const finalUrl = isYouTubeUrl(youtubeUrl)
        ? `${AUDIO_API_BASE}?url=${encodeURIComponent(youtubeUrl)}`
        : `${AUDIO_API_BASE}?url=${encodeURIComponent(`https://youtu.be/${extractYoutubeVideoId(youtubeUrl) || ' '}`)}`;

    const apiUrl = finalUrl;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, {
            ...AXIOS_DEFAULTS,
            timeout: AUDIO_TIMEOUT_MS,
            validateStatus: (status) => status >= 200 && status < 500
        }));

        const payload = res?.data;
        if (!payload || payload.status !== true || !payload.result?.downloadUrl) {
            throw new Error(payload?.message || 'Audio API did not return a valid download URL');
        }

        const result = payload.result;
        const downloadUrl = result.downloadUrl;

        let fileRes;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                fileRes = await axios.get(downloadUrl, {
                    ...AXIOS_DEFAULTS,
                    timeout: DOWNLOAD_TIMEOUT_MS,
                    responseType: 'arraybuffer',
                    maxRedirects: 15,
                    headers: {
                        ...AXIOS_DEFAULTS.headers,
                        Accept: 'audio/mpeg,audio/mp4,*/*;q=0.8',
                        Referer: 'https://www.youtube.com/'
                    },
                    validateStatus: (status) => status >= 200 && status < 500
                });
                break;
            } catch (downloadErr) {
                if (attempt === 3) throw downloadErr;
                await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
            }
        }

        if (!fileRes || !fileRes.data) {
            throw new Error('No audio file data was returned from the download URL');
        }

        const buffer = Buffer.from(fileRes.data);
        if (!buffer || buffer.length < 1000) {
            throw new Error('Downloaded audio file is too small or empty');
        }

        return {
            buffer,
            title: String(result.title || 'Unknown Title').replace(/\s+/g, ' ').trim(),
            thumbnail: result.thumbnail || '',
            quality: result.quality || '128kbps',
            duration: result.duration || 'Unknown',
            source: 'apiziaul',
            videoUrl: result.videoUrl || youtubeUrl,
            videoId: result.videoId || extractYoutubeVideoId(youtubeUrl),
            downloadUrl
        };
    } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Unknown audio error';
        throw new Error(`Audio download failed: ${message}`);
    }
}

async function searchYoutubeSong(query) {
    const search = await yts(query);
    const videos = search?.videos || [];
    if (!videos.length) {
        throw new Error('No YouTube result found for your query');
    }

    const first = videos[0];
    return {
        url: first.url,
        title: first.title,
        thumbnail: first.thumbnail,
        author: first.author?.name || 'Unknown',
        duration: first.timestamp || 'Unknown',
        views: first.views || 0
    };
}

async function playCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const query = rawText.split(/\s+/).slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '🎵 *Play Music*\n\n📝 .play song name\n🔗 .play youtube_url\n\nExample: .play Mczo Morfani Akienda Kama Anaenda'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let selectedUrl = query;
        let songMeta = null;

        if (!isYouTubeUrl(query)) {
            const searchResult = await searchYoutubeSong(query);
            songMeta = searchResult;
            selectedUrl = searchResult.url;

            const infoText = `🎵 *${searchResult.title}*\n⏱️ ${searchResult.duration} | 👤 ${searchResult.author}\n👁️ ${(searchResult.views || 0).toLocaleString()}\n\n⬇️ Downloading audio...`;

            if (searchResult.thumbnail) {
                await sock.sendMessage(chatId, {
                    image: { url: searchResult.thumbnail },
                    caption: infoText
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { text: infoText }, { quoted: message });
            }
        } else {
            await sock.sendMessage(chatId, { text: '⬇️ Processing audio...' }, { quoted: message });
        }

        const processMsg = await sock.sendMessage(chatId, { text: '⏳ Loading audio...' });
        const audioData = await getYoutubeAudio(selectedUrl);
        await sock.sendMessage(chatId, { delete: processMsg.key });

        const title = String(audioData.title || songMeta?.title || query || 'Unknown Song').replace(/\s+/g, ' ').trim();
        const caption = `✅ *${title.substring(0, 50)}*\n🎚️ ${audioData.quality}\n⏱️ ${audioData.duration}\n📡 ${audioData.source}`;

        if (audioData.thumbnail) {
            await sock.sendMessage(chatId, {
                image: { url: audioData.thumbnail },
                caption
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            audio: audioData.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            caption: caption,
            fileName: `${title}.mp3`
        }, { quoted: message });

        const videoTitle = title;
        const videoButton = new ButtonV2(sock)
            .setThumbnail(audioData.thumbnail || songMeta?.thumbnail)
            .text(`� Download video for: ${videoTitle}`)
            .footer('Mickey Glitch')
            .button('Download Video', `.video ${videoTitle}`);

        await videoButton.send(chatId, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (err) {
        console.error('[PLAY] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, {
            text: `❌ Failed to download audio.\n\n${err.message || 'Try again later.'}`
        }, { quoted: message });
    }
}

async function handleAudioDownload(sock, chatId, ytUrl, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
        const audioData = await getYoutubeAudio(ytUrl);

        await sock.sendMessage(chatId, {
            audio: audioData.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            caption: `✅ Audio ready!\n> Mickey Glitch`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Download failed: ' + (e.message || 'Unknown error') }, { quoted: message });
    }
}

module.exports = playCommand;
module.exports.name = 'play';
module.exports.aliases = ['song', 'music'];
module.exports.getYoutubeAudio = getYoutubeAudio;
module.exports.searchYoutubeSong = searchYoutubeSong;
module.exports.handleAudioDownload = handleAudioDownload;
