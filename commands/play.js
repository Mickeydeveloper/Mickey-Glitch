const axios = require('axios');
const yts = require('yt-search');
const { ButtonV2 } = require('../lib/messageBuilder');

// Multiple API endpoints for redundancy - all 5 sources
const AUDIO_APIS = [
    { name: 'apiziaul-ytmp3', url: 'https://apiziaul.vercel.app/api/downloader/ytmp3', paramKey: 'url' },
    { name: 'apiziaul-playmp3', url: 'https://apiziaul.vercel.app/api/downloader/ytplaymp3', paramKey: 'query' },
    { name: 'nexray-savetube', url: 'https://api.nexray.eu.cc/downloader/savetube', paramKey: 'url', quality: 'mp3' },
    { name: 'nexray-ytmp3', url: 'https://api.nexray.eu.cc/downloader/ytmp3', paramKey: 'url' },
    { name: 'nexray-v1', url: 'https://api.nexray.eu.cc/downloader/v1/ytmp3', paramKey: 'url' }
];

const AUDIO_TIMEOUT_MS = 60000;
const DOWNLOAD_TIMEOUT_MS = 120000;
const AXIOS_DEFAULTS = {
    timeout: AUDIO_TIMEOUT_MS,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: '*/*'
    }
};

// Cache ya muda mfupi
const audioCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadAudioBuffer(downloadUrl, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(downloadUrl, {
                timeout: DOWNLOAD_TIMEOUT_MS,
                responseType: 'arraybuffer',
                maxRedirects: 15,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    Accept: 'audio/mpeg,audio/mp4,audio/flac,*/*;q=0.8',
                    Referer: 'https://www.youtube.com/',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                validateStatus: (status) => status >= 200 && status < 500
            });

            if (response.data && response.data.length > 1000) {
                const buffer = Buffer.from(response.data);
                const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
                const preview = buffer.subarray(0, 100).toString('utf8').trim().toLowerCase();
                const isHtml = contentType.includes('text/html') || preview.startsWith('<!doctype') || preview.startsWith('<html');
                if (!isHtml) return buffer;
            }
            
            if (attempt < retries) await wait(500 * attempt);
        } catch (err) {
            if (attempt === retries) throw err;
            await wait(500 * attempt);
        }
    }
    throw new Error('Failed to download audio after multiple attempts');
}

// Fast parallel API requests - all 5 sources
async function fetchFromMultipleAPIs(videoId, youtubeUrl) {
    const promises = AUDIO_APIS.map(async (apiConfig) => {
        try {
            let apiUrl;
            const params = new URLSearchParams();
            params.append(apiConfig.paramKey, youtubeUrl);
            if (apiConfig.quality) {
                params.append('quality', apiConfig.quality);
            }
            apiUrl = `${apiConfig.url}?${params.toString()}`;

            const response = await axios.get(apiUrl, {
                ...AXIOS_DEFAULTS,
                timeout: 15000 // 15 seconds per API (faster fail)
            });

            return { 
                apiName: apiConfig.name,
                api: apiConfig.url,
                response: response.data, 
                success: true,
                config: apiConfig
            };
        } catch (err) {
            return { 
                apiName: apiConfig.name,
                api: apiConfig.url,
                error: err.message, 
                success: false 
            };
        }
    });

    // Keep every successful response so a bad first download can fall back.
    const results = await Promise.allSettled(promises);

    return results
        .filter((result) => result.status === 'fulfilled' && result.value.success)
        .map((result) => result.value);
}

function parseAudioResponse(apiResult) {
    const data = apiResult?.response;
    const resultData = data?.result;
    if (!resultData || typeof resultData !== 'object') return null;

    let downloadUrl;
    let title = 'Unknown Title';
    let thumbnail = '';
    let quality = '128kbps';
    let duration = 'Unknown';

    if (apiResult.apiName === 'apiziaul-ytmp3' || apiResult.apiName === 'apiziaul-playmp3') {
        downloadUrl = resultData.downloadUrl;
        title = resultData.title || title;
        thumbnail = resultData.thumbnail || '';
        quality = resultData.quality || quality;
        duration = resultData.duration || duration;
    } else if (apiResult.apiName === 'nexray-savetube') {
        downloadUrl = resultData.url;
        title = resultData.title || title;
        thumbnail = resultData.thumbnail || '';
        quality = resultData.quality ? `${resultData.quality}kbps` : quality;
        duration = resultData.duration || duration;
    } else if (apiResult.apiName === 'nexray-ytmp3') {
        downloadUrl = resultData.url;
        title = resultData.title || title;
        thumbnail = resultData.thumbnail || '';
        duration = typeof resultData.duration === 'number'
            ? `${Math.floor(resultData.duration / 60)}:${String(resultData.duration % 60).padStart(2, '0')}`
            : duration;
    } else {
        downloadUrl = resultData.downloadUrl || resultData.url || resultData.download_link;
        title = resultData.title || resultData.name || title;
        thumbnail = resultData.thumbnail || resultData.thumb || '';
        quality = resultData.quality || resultData.bitrate || quality;
        duration = resultData.duration || resultData.dur || duration;
    }

    return typeof downloadUrl === 'string' && /^https?:\/\//i.test(downloadUrl)
        ? { downloadUrl, title, thumbnail, quality, duration }
        : null;
}

async function getYoutubeAudio(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    // Check cache first
    const cacheKey = videoId;
    const cached = audioCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ Using cached audio for:', videoId);
        return cached.data;
    }

    console.log('🚀 Fetching audio from 5 APIs for:', videoId);

    // Try parallel API requests
    const results = await fetchFromMultipleAPIs(videoId, ytUrl);

    if (!results.length) {
        throw new Error('All 5 API sources failed. Please try again later.');
    }

    let selectedResult;
    let parsedAudio;
    let buffer;
    for (const apiResult of results) {
        const candidate = parseAudioResponse(apiResult);
        if (!candidate) continue;
        try {
            console.log('⬇️ Trying audio source:', apiResult.apiName);
            const candidateBuffer = await downloadAudioBuffer(candidate.downloadUrl);
            selectedResult = apiResult;
            parsedAudio = candidate;
            buffer = candidateBuffer;
            break;
        } catch (error) {
            console.warn(`⚠️ Audio source failed (${apiResult.apiName}):`, error.message);
        }
    }

    if (!buffer || !selectedResult || !parsedAudio) {
        throw new Error('All 5 API sources returned unusable audio. Please try again later.');
    }

    console.log('✅ API source found:', selectedResult.apiName);
    const { title, thumbnail, quality, duration, downloadUrl } = parsedAudio;

    const audioData = {
        buffer,
        title: String(title).replace(/\s+/g, ' ').trim(),
        thumbnail: thumbnail || 'https://i.imgur.com/4XfCwQ0.png',
        quality: quality,
        duration: duration,
        source: selectedResult.apiName,
        videoUrl: ytUrl,
        videoId: videoId,
        downloadUrl: downloadUrl,
        fileSize: buffer.length,
        fileSizeMB: (buffer.length / 1024 / 1024).toFixed(2)
    };

    // Cache the result
    audioCache.set(cacheKey, {
        data: audioData,
        timestamp: Date.now()
    });

    console.log('✅ Audio ready! Size:', audioData.fileSizeMB, 'MB');
    return audioData;
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
            songMeta = await searchYoutubeSong(query);
            selectedUrl = songMeta.url;
        }

        const initialTitle = String(songMeta?.title || query || 'Unknown Song').replace(/\s+/g, ' ').trim();
        const safeTitle = initialTitle.length > 60 ? `${initialTitle.slice(0, 57)}...` : initialTitle;
        const thumbnail = songMeta?.thumbnail || 'https://i.imgur.com/4XfCwQ0.png';

        const thumbnailMessage = new ButtonV2(sock)
            .setThumbnail(thumbnail)
            .text(`🎵 *${safeTitle}*\n\n👤 ${songMeta?.author || 'YouTube'}\n⏱️ ${songMeta?.duration || 'Audio'}\n🎧 Preparing audio...`)
            .footer('Mickey Glitch')
            .button('🎬 Watch Video', `.video ${safeTitle}`)
            .button('🔁 Play Again', `.play ${safeTitle}`);

        await thumbnailMessage.send(chatId, { quoted: message });

        // Get audio with parallel API requests - no extra loading message
        const audioData = await getYoutubeAudio(selectedUrl);

        const finalTitle = String(audioData.title || query || 'Unknown Song').replace(/\s+/g, ' ').trim();

        // Send audio directly
        await sock.sendMessage(chatId, {
            audio: audioData.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${finalTitle}.mp3`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        
        let errorMessage = '❌ Audio unavailable right now.\n\n';
        if (err.message.includes('All API sources failed')) {
            errorMessage += 'All download sources are currently unavailable. Please try again in a few minutes.';
        } else if (err.message.includes('Invalid YouTube URL')) {
            errorMessage += 'Invalid YouTube URL. Please check and try again.';
        } else {
            errorMessage += 'Please try again in a moment or use a different song title.';
        }
        
        await sock.sendMessage(chatId, {
            text: errorMessage
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
            caption: '✅ Audio ready!\n> Mickey Glitch'
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (e) {
        console.error('[HANDLE_AUDIO] Error:', e);
        await sock.sendMessage(chatId, {
            text: `❌ Audio unavailable right now.\n\nError: ${e.message}\n\nTry a different song or link.`
        }, { quoted: message });
    }
}

// Clean cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of audioCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            audioCache.delete(key);
        }
    }
}, 60000); // Clean every minute

module.exports = playCommand;
module.exports.name = 'play';
module.exports.aliases = ['song', 'music'];
module.exports.getYoutubeAudio = getYoutubeAudio;
module.exports.searchYoutubeSong = searchYoutubeSong;
module.exports.handleAudioDownload = handleAudioDownload;