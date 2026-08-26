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

// Increased timeouts for better success rate
const AUDIO_TIMEOUT_MS = 60000;
const DOWNLOAD_TIMEOUT_MS = 120000;
const API_TIMEOUT_MS = 45000; // Increased from 15000

const AXIOS_DEFAULTS = {
    timeout: API_TIMEOUT_MS,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
    }
};

// Cache ya muda mfupi - increased duration
const audioCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Helper functions
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

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// NEW: Validate if buffer is actually audio
function isValidAudioBuffer(buffer) {
    if (!buffer || buffer.length < 1000) return false;
    
    // Check for MP3 header (0xFF 0xFB or 0xFF 0xF3)
    if (buffer.length >= 3) {
        const firstBytes = buffer.slice(0, 3);
        if (firstBytes[0] === 0xFF && (firstBytes[1] === 0xFB || firstBytes[1] === 0xF3)) {
            return true;
        }
    }
    
    // Check for M4A/MP4 header (ftyp)
    if (buffer.length >= 10) {
        const header = buffer.slice(0, 10).toString('hex');
        if (header.startsWith('66747970')) return true; // 'ftyp' in hex
    }
    
    // Check for WAV header
    if (buffer.length >= 12) {
        const header = buffer.slice(0, 4).toString('ascii');
        if (header === 'RIFF') return true;
    }
    
    return false;
}

async function downloadAudioBuffer(downloadUrl, retries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`⬇️ Download attempt ${attempt}/${retries} for:`, downloadUrl.substring(0, 50));
            
            const response = await axios.get(downloadUrl, {
                timeout: DOWNLOAD_TIMEOUT_MS,
                responseType: 'arraybuffer',
                maxRedirects: 15,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    Accept: 'audio/mpeg,audio/mp4,audio/flac,audio/wav,*/*;q=0.8',
                    Referer: 'https://www.youtube.com/',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                validateStatus: (status) => status >= 200 && status < 500
            });

            if (response.data && response.data.length > 1000) {
                const buffer = Buffer.from(response.data);
                
                // Check if response is HTML (error page)
                const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
                const preview = buffer.subarray(0, 200).toString('utf8').trim().toLowerCase();
                const isHtml = contentType.includes('text/html') || 
                              preview.startsWith('<!doctype') || 
                              preview.startsWith('<html') ||
                              preview.includes('<!DOCTYPE');
                
                if (isHtml) {
                    console.log(`⚠️ Received HTML instead of audio (attempt ${attempt})`);
                    if (attempt < retries) {
                        await wait(1500 * attempt);
                        continue;
                    }
                    throw new Error('Received HTML response instead of audio');
                }
                
                // Validate audio
                if (!isValidAudioBuffer(buffer)) {
                    console.log(`⚠️ Invalid audio format (attempt ${attempt})`);
                    if (attempt < retries) {
                        await wait(1500 * attempt);
                        continue;
                    }
                    throw new Error('Invalid audio format received');
                }
                
                console.log(`✅ Download successful! Size: ${(buffer.length / 1024).toFixed(2)} KB`);
                return buffer;
            }

            console.log(`⚠️ Response too small: ${response.data?.length || 0} bytes (attempt ${attempt})`);
            if (attempt < retries) {
                await wait(1500 * attempt);
            }
            
        } catch (err) {
            lastError = err;
            console.log(`⬇️ Download attempt ${attempt} failed:`, err.message);
            if (attempt < retries) {
                const waitTime = 1500 * attempt;
                console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                await wait(waitTime);
            }
        }
    }
    
    throw lastError || new Error('Failed to download audio after multiple attempts');
}

// Improved API fetching with retries
async function fetchFromMultipleAPIs(videoId, youtubeUrl) {
    console.log(`🚀 Fetching from ${AUDIO_APIS.length} APIs...`);
    
    const promises = AUDIO_APIS.map(async (apiConfig) => {
        // Each API gets 2 attempts
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                let apiUrl;
                const params = new URLSearchParams();
                params.append(apiConfig.paramKey, youtubeUrl);
                if (apiConfig.quality) {
                    params.append('quality', apiConfig.quality);
                }
                apiUrl = `${apiConfig.url}?${params.toString()}`;

                console.log(`🔄 Trying ${apiConfig.name} (attempt ${attempt})...`);
                
                const response = await axios.get(apiUrl, {
                    ...AXIOS_DEFAULTS,
                    timeout: API_TIMEOUT_MS
                });

                // Check if response has valid data
                if (response.data && response.data.result) {
                    console.log(`✅ ${apiConfig.name} returned data`);
                    return { 
                        apiName: apiConfig.name,
                        api: apiConfig.url,
                        response: response.data, 
                        success: true,
                        config: apiConfig
                    };
                }

                console.log(`⚠️ ${apiConfig.name} returned empty data (attempt ${attempt})`);
                if (attempt < 2) await wait(1000 * attempt);
                
            } catch (err) {
                console.log(`⚠️ ${apiConfig.name} attempt ${attempt} failed:`, err.message);
                if (attempt < 2) {
                    await wait(1000 * attempt);
                }
            }
        }
        
        return { 
            apiName: apiConfig.name,
            api: apiConfig.url,
            error: 'All attempts failed', 
            success: false 
        };
    });

    const results = await Promise.allSettled(promises);

    const successful = results
        .filter((result) => result.status === 'fulfilled' && result.value.success)
        .map((result) => result.value);

    console.log(`✅ ${successful.length}/${AUDIO_APIS.length} APIs responded successfully`);
    return successful;
}

function parseAudioResponse(apiResult) {
    const data = apiResult?.response;
    const resultData = data?.result;
    
    if (!resultData || typeof resultData !== 'object') {
        console.log(`⚠️ Invalid response format from ${apiResult.apiName}`);
        return null;
    }

    let downloadUrl;
    let title = 'Unknown Title';
    let thumbnail = '';
    let quality = '128kbps';
    let duration = 'Unknown';

    try {
        if (apiResult.apiName === 'apiziaul-ytmp3' || apiResult.apiName === 'apiziaul-playmp3') {
            downloadUrl = resultData.downloadUrl || resultData.download_link;
            title = resultData.title || title;
            thumbnail = resultData.thumbnail || resultData.thumb || '';
            quality = resultData.quality || resultData.bitrate || quality;
            duration = resultData.duration || duration;
        } else if (apiResult.apiName === 'nexray-savetube') {
            downloadUrl = resultData.url || resultData.downloadUrl;
            title = resultData.title || title;
            thumbnail = resultData.thumbnail || '';
            quality = resultData.quality ? `${resultData.quality}kbps` : quality;
            duration = resultData.duration || duration;
        } else if (apiResult.apiName === 'nexray-ytmp3' || apiResult.apiName === 'nexray-v1') {
            downloadUrl = resultData.url || resultData.downloadUrl || resultData.download_link;
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

        if (typeof downloadUrl === 'string' && /^https?:\/\//i.test(downloadUrl)) {
            console.log(`✅ Parsed ${apiResult.apiName}: ${title.substring(0, 30)}...`);
            return { downloadUrl, title, thumbnail, quality, duration };
        } else {
            console.log(`⚠️ No valid download URL from ${apiResult.apiName}`);
            return null;
        }
    } catch (err) {
        console.log(`⚠️ Error parsing ${apiResult.apiName}:`, err.message);
        return null;
    }
}

async function getYoutubeAudio(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    // Check cache first - with validation
    const cacheKey = videoId;
    const cached = audioCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (cached.data.buffer && isValidAudioBuffer(cached.data.buffer)) {
            console.log('✅ Using cached audio for:', videoId);
            return cached.data;
        } else {
            console.log('⚠️ Invalid cached audio, removing...');
            audioCache.delete(cacheKey);
        }
    }

    console.log('🚀 Fetching fresh audio for:', videoId);

    // Fetch from APIs with retries
    let results = await fetchFromMultipleAPIs(videoId, ytUrl);
    
    // If no results, wait and retry once more
    if (!results.length) {
        console.log('⚠️ No API responses, retrying after 2 seconds...');
        await wait(2000);
        results = await fetchFromMultipleAPIs(videoId, ytUrl);
        
        if (!results.length) {
            throw new Error('All 5 API sources failed. Please try again later.');
        }
    }

    // Try each API response until we get valid audio
    let selectedResult = null;
    let parsedAudio = null;
    let buffer = null;
    
    // Shuffle results to try different sources first
    const shuffledResults = results.sort(() => Math.random() - 0.5);
    
    for (const apiResult of shuffledResults) {
        const candidate = parseAudioResponse(apiResult);
        if (!candidate) continue;
        
        try {
            console.log(`⬇️ Trying audio from: ${apiResult.apiName}`);
            const candidateBuffer = await downloadAudioBuffer(candidate.downloadUrl);
            
            if (candidateBuffer && isValidAudioBuffer(candidateBuffer)) {
                selectedResult = apiResult;
                parsedAudio = candidate;
                buffer = candidateBuffer;
                console.log(`✅ Successfully got audio from ${apiResult.apiName}`);
                break;
            }
        } catch (error) {
            console.warn(`⚠️ Audio download failed (${apiResult.apiName}):`, error.message);
            continue;
        }
    }

    if (!buffer || !selectedResult || !parsedAudio) {
        throw new Error('All 5 API sources returned unusable audio. Please try again later.');
    }

    console.log('✅ Audio ready from:', selectedResult.apiName);
    const { title, thumbnail, quality, duration, downloadUrl } = parsedAudio;

    const audioData = {
        buffer,
        title: String(title).replace(/\s+/g, ' ').trim(),
        thumbnail: thumbnail || 'https://i.imgur.com/4XfCwQ0.png',
        quality: quality || '128kbps',
        duration: duration || 'Unknown',
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
    console.log('🔍 Searching for:', query);
    
    try {
        const search = await yts(query);
        const videos = search?.videos || [];
        
        if (!videos.length) {
            throw new Error('No YouTube result found for your query');
        }

        const first = videos[0];
        console.log('✅ Found:', first.title);
        
        return {
            url: first.url,
            title: first.title,
            thumbnail: first.thumbnail,
            author: first.author?.name || 'Unknown',
            duration: first.timestamp || 'Unknown',
            views: first.views || 0
        };
    } catch (err) {
        console.error('Search error:', err);
        throw new Error('Failed to search YouTube. Please try a different query.');
    }
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

        // Send initial reaction
        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let selectedUrl = query;
        let songMeta = null;

        // Search if not a URL
        if (!isYouTubeUrl(query)) {
            songMeta = await searchYoutubeSong(query);
            selectedUrl = songMeta.url;
        }

        const initialTitle = String(songMeta?.title || query || 'Unknown Song').replace(/\s+/g, ' ').trim();
        const safeTitle = initialTitle.length > 60 ? `${initialTitle.slice(0, 57)}...` : initialTitle;
        const thumbnail = songMeta?.thumbnail || 'https://i.imgur.com/4XfCwQ0.png';

        // Send initial message with buttons
        const thumbnailMessage = new ButtonV2(sock)
            .setThumbnail(thumbnail)
            .text(`🎵 *${safeTitle}*\n\n👤 ${songMeta?.author || 'YouTube'}\n⏱️ ${songMeta?.duration || 'Audio'}\n🎧 Preparing audio...`)
            .footer('Mickey Glitch')
            .button('🎬 Watch Video', `.video ${safeTitle}`)
            .button('🔁 Play Again', `.play ${safeTitle}`);

        await thumbnailMessage.send(chatId, { quoted: message });

        // Get audio with retries
        let audioData;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
            try {
                audioData = await getYoutubeAudio(selectedUrl);
                break;
            } catch (err) {
                retryCount++;
                console.log(`🔄 Audio fetch retry ${retryCount}/${maxRetries}`);
                if (retryCount > maxRetries) throw err;
                await wait(2000 * retryCount);
            }
        }

        const finalTitle = String(audioData.title || query || 'Unknown Song').replace(/\s+/g, ' ').trim();

        // Send audio
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
        if (err.message.includes('All API sources failed') || err.message.includes('All 5 API sources')) {
            errorMessage += 'All download sources are currently unavailable. Please try again in a few minutes.';
        } else if (err.message.includes('Invalid YouTube URL')) {
            errorMessage += 'Invalid YouTube URL. Please check and try again.';
        } else if (err.message.includes('No YouTube result')) {
            errorMessage += 'No results found for your search. Try a different song name.';
        } else if (err.message.includes('Invalid audio')) {
            errorMessage += 'The audio format is not supported. Try a different song or source.';
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
            caption: `✅ *${audioData.title}*\n\n📁 Size: ${audioData.fileSizeMB} MB\n🎵 Quality: ${audioData.quality}\n⏱️ Duration: ${audioData.duration}\n\n> Mickey Glitch`
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
    let deleted = 0;
    for (const [key, value] of audioCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            audioCache.delete(key);
            deleted++;
        }
    }
    if (deleted > 0) {
        console.log(`🧹 Cache cleaned: ${deleted} entries removed`);
    }
}, 60000); // Clean every minute

module.exports = playCommand;
module.exports.name = 'play';
module.exports.aliases = ['song', 'music'];
module.exports.getYoutubeAudio = getYoutubeAudio;
module.exports.searchYoutubeSong = searchYoutubeSong;
module.exports.handleAudioDownload = handleAudioDownload;