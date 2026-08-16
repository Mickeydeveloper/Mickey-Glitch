const axios = require('axios');
const yts = require('yt-search');
const { ButtonV2 } = require('../lib/messageBuilder');

// Multiple API endpoints for redundancy
const AUDIO_APIS = [
    'https://apiziaul.vercel.app/api/downloader/ytmp3',
    'https://api.nexray.eu.cc/downloader/savetube',
    'https://api.downloader.xyz/ytmp3',
    'https://api.ytmp3.com/download'
];

const AUDIO_TIMEOUT_MS = 120000;
const DOWNLOAD_TIMEOUT_MS = 180000;
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

async function downloadAudioBuffer(downloadUrl, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(downloadUrl, {
                ...AXIOS_DEFAULTS,
                timeout: DOWNLOAD_TIMEOUT_MS,
                responseType: 'arraybuffer',
                maxRedirects: 15,
                headers: {
                    ...AXIOS_DEFAULTS.headers,
                    Accept: 'audio/mpeg,audio/mp4,*/*;q=0.8',
                    Referer: 'https://www.youtube.com/',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                validateStatus: (status) => status >= 200 && status < 500
            });

            if (response.data && response.data.length > 1000) {
                return Buffer.from(response.data);
            }
            
            if (attempt < retries) await wait(2000 * attempt);
        } catch (err) {
            if (attempt === retries) throw err;
            await wait(2000 * attempt);
        }
    }
    throw new Error('Failed to download audio after multiple attempts');
}

// Fast parallel API requests
async function fetchFromMultipleAPIs(videoId, youtubeUrl) {
    const promises = AUDIO_APIS.map(async (apiBase) => {
        try {
            let apiUrl;
            if (apiBase.includes('savetube')) {
                apiUrl = `${apiBase}?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}&quality=mp3`;
            } else {
                apiUrl = `${apiBase}?url=${encodeURIComponent(youtubeUrl)}`;
            }

            const response = await axios.get(apiUrl, {
                ...AXIOS_DEFAULTS,
                timeout: 30000 // 30 seconds per API
            });

            return { api: apiBase, response: response.data, success: true };
        } catch (err) {
            return { api: apiBase, error: err.message, success: false };
        }
    });

    // Race - get first successful response
    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
            return result.value;
        }
    }
    
    return null;
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

    console.log('🚀 Fetching audio for:', videoId);

    // Try parallel API requests
    const result = await fetchFromMultipleAPIs(videoId, ytUrl);
    
    if (!result) {
        throw new Error('All API sources failed. Please try again later.');
    }

    console.log('✅ API source found:', result.api);

    // Parse response based on API source
    let downloadUrl = null;
    let title = 'Unknown Title';
    let thumbnail = '';
    let quality = '128 kbps';
    let duration = 'Unknown';

    const data = result.response;

    // Try different response formats
    if (data.status === true && data.result) {
        downloadUrl = data.result.downloadUrl || data.result.url || data.result.download_link;
        title = data.result.title || data.result.name || 'Unknown Title';
        thumbnail = data.result.thumbnail || data.result.thumb || '';
        quality = data.result.quality || data.result.bitrate || '128 kbps';
        duration = data.result.duration || data.result.dur || 'Unknown';
    } else if (data.success === true && data.data) {
        downloadUrl = data.data.downloadUrl || data.data.url;
        title = data.data.title || 'Unknown Title';
        thumbnail = data.data.thumbnail || '';
        quality = data.data.quality || '128 kbps';
        duration = data.data.duration || 'Unknown';
    } else if (data.url) {
        downloadUrl = data.url;
        title = data.title || 'Unknown Title';
        thumbnail = data.thumbnail || '';
        quality = data.quality || '128 kbps';
        duration = data.duration || 'Unknown';
    } else if (data.downloadUrl) {
        downloadUrl = data.downloadUrl;
        title = data.title || 'Unknown Title';
        thumbnail = data.thumbnail || '';
        quality = data.quality || '128 kbps';
        duration = data.duration || 'Unknown';
    }

    if (!downloadUrl) {
        console.error('Failed to extract download URL from:', JSON.stringify(data, null, 2));
        throw new Error('Could not extract download URL from API response');
    }

    // Download audio with retries
    console.log('⬇️ Downloading audio...');
    const buffer = await downloadAudioBuffer(downloadUrl);

    const audioData = {
        buffer,
        title: String(title).replace(/\s+/g, ' ').trim(),
        thumbnail: thumbnail || 'https://i.imgur.com/4XfCwQ0.png',
        quality: quality,
        duration: duration,
        source: result.api,
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

        const loadingMsg = await sock.sendMessage(chatId, {
            text: '⏳ Downloading audio...'
        }, { quoted: message });

        // Get audio with parallel API requests
        const audioData = await getYoutubeAudio(selectedUrl);

        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        const finalTitle = String(audioData.title || query || 'Unknown Song').replace(/\s+/g, ' ').trim();

        // Send audio with progress indication
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