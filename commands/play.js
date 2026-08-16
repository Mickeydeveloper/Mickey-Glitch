const axios = require('axios');
const yts = require('yt-search');
const { ButtonV2 } = require('../lib/messageBuilder');

const AUDIO_API_BASE = 'https://apiziaul.vercel.app/api/downloader/ytmp3';
const AUDIO_API_FALLBACK = 'https://api.nexray.eu.cc/downloader/savetube';
const AUDIO_TIMEOUT_MS = 180000; // 3 minutes
const DOWNLOAD_TIMEOUT_MS = 240000; // 4 minutes
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

async function tryRequest(getter, attempts = 3) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastErr = err;
            console.log(`Attempt ${i}/${attempts} failed:`, err.message);
            if (i < attempts) await new Promise((resolve) => setTimeout(resolve, 2000 * i));
        }
    }
    throw lastErr;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadAudioBuffer(downloadUrl) {
    let fileRes;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            console.log(`Download attempt ${attempt} for:`, downloadUrl.substring(0, 100));
            fileRes = await axios.get(downloadUrl, {
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
            
            if (fileRes && fileRes.data && fileRes.data.length > 1000) {
                console.log(`Download successful! Size: ${fileRes.data.length} bytes`);
                return Buffer.from(fileRes.data);
            }
            
            console.log(`Attempt ${attempt} failed: Invalid data size`);
            if (attempt < 5) await wait(3000 * attempt);
        } catch (downloadErr) {
            console.log(`Download attempt ${attempt} error:`, downloadErr.message);
            if (attempt === 5) throw downloadErr;
            await wait(3000 * attempt);
        }
    }
    throw new Error('Failed to download audio after 5 attempts');
}

async function getYoutubeAudioFromZiaUlhaq(ytUrl) {
    const youtubeUrl = (typeof ytUrl === 'string' && ytUrl.trim()) ? ytUrl.trim() : '';
    if (!youtubeUrl) {
        throw new Error('Please provide a valid YouTube URL or song name');
    }

    const apiUrl = isYouTubeUrl(youtubeUrl)
        ? `${AUDIO_API_BASE}?url=${encodeURIComponent(youtubeUrl)}`
        : `${AUDIO_API_BASE}?url=${encodeURIComponent(`https://youtu.be/${extractYoutubeVideoId(youtubeUrl) || ' '}`)}`;

    console.log('Primary API URL:', apiUrl);

    const res = await tryRequest(() => axios.get(apiUrl, {
        ...AXIOS_DEFAULTS,
        timeout: AUDIO_TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 500
    }));

    console.log('Primary API Response Status:', res.status);
    console.log('Primary API Response Data Keys:', Object.keys(res.data || {}));

    const payload = res?.data;
    if (!payload) {
        throw new Error('API returned empty response');
    }

    // Check different response formats
    let downloadUrl = null;
    let title = 'Unknown Title';
    let thumbnail = '';
    let quality = '128 kbps';
    let duration = 'Unknown';
    let videoId = extractYoutubeVideoId(youtubeUrl);

    // Try different response structures
    if (payload.status === true && payload.result) {
        downloadUrl = payload.result.downloadUrl || payload.result.url || payload.result.download_link;
        title = payload.result.title || payload.result.name || 'Unknown Title';
        thumbnail = payload.result.thumbnail || payload.result.thumb || '';
        quality = payload.result.quality || payload.result.bitrate || '128 kbps';
        duration = payload.result.duration || payload.result.dur || 'Unknown';
        videoId = payload.result.videoId || payload.result.id || videoId;
    } else if (payload.success === true && payload.data) {
        downloadUrl = payload.data.downloadUrl || payload.data.url;
        title = payload.data.title || 'Unknown Title';
        thumbnail = payload.data.thumbnail || '';
        quality = payload.data.quality || '128 kbps';
        duration = payload.data.duration || 'Unknown';
        videoId = payload.data.videoId || videoId;
    } else if (payload.downloadUrl) {
        downloadUrl = payload.downloadUrl;
        title = payload.title || 'Unknown Title';
        thumbnail = payload.thumbnail || '';
        quality = payload.quality || '128 kbps';
        duration = payload.duration || 'Unknown';
    }

    if (!downloadUrl) {
        console.error('Full API response:', JSON.stringify(payload, null, 2));
        throw new Error(payload?.message || payload?.error || 'Audio API did not return a valid download URL');
    }

    console.log('Download URL found:', downloadUrl.substring(0, 100));
    const buffer = await downloadAudioBuffer(downloadUrl);

    return {
        buffer,
        title: String(title).replace(/\s+/g, ' ').trim(),
        thumbnail: thumbnail || 'https://i.imgur.com/4XfCwQ0.png',
        quality: quality,
        duration: duration,
        source: 'apiziaul',
        videoUrl: youtubeUrl,
        videoId: videoId,
        downloadUrl: downloadUrl,
        fileSize: buffer.length,
        fileSizeMB: (buffer.length / 1024 / 1024).toFixed(2)
    };
}

async function getYoutubeAudioFromNexray(ytUrl) {
    const youtubeUrl = (typeof ytUrl === 'string' && ytUrl.trim()) ? ytUrl.trim() : '';
    if (!youtubeUrl) {
        throw new Error('Please provide a valid YouTube URL or song name');
    }

    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    const apiUrl = `${AUDIO_API_FALLBACK}?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}&quality=mp3`;
    console.log('Fallback API URL:', apiUrl);

    const res = await tryRequest(() => axios.get(apiUrl, {
        ...AXIOS_DEFAULTS,
        timeout: AUDIO_TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 500
    }));

    console.log('Fallback API Response Status:', res.status);
    const payload = res?.data;
    
    if (!payload) {
        throw new Error('Fallback API returned empty response');
    }

    // Check different response formats for fallback
    let downloadUrl = null;
    let title = 'Unknown Title';
    let thumbnail = '';
    let quality = '128 kbps';
    let duration = 'Unknown';

    if (payload.status === true && payload.result) {
        downloadUrl = payload.result.url || payload.result.downloadUrl;
        title = payload.result.title || 'Unknown Title';
        thumbnail = payload.result.thumbnail || '';
        quality = payload.result.quality ? `${payload.result.quality} kbps` : '128 kbps';
        duration = payload.result.duration || 'Unknown';
    } else if (payload.url) {
        downloadUrl = payload.url;
        title = payload.title || 'Unknown Title';
        thumbnail = payload.thumbnail || '';
        quality = payload.quality || '128 kbps';
        duration = payload.duration || 'Unknown';
    } else if (payload.success && payload.data) {
        downloadUrl = payload.data.url || payload.data.downloadUrl;
        title = payload.data.title || 'Unknown Title';
        thumbnail = payload.data.thumbnail || '';
        quality = payload.data.quality || '128 kbps';
        duration = payload.data.duration || 'Unknown';
    }

    if (!downloadUrl) {
        console.error('Fallback API response:', JSON.stringify(payload, null, 2));
        throw new Error(payload?.message || payload?.error || 'Nexray API did not return a valid audio URL');
    }

    console.log('Fallback download URL found:', downloadUrl.substring(0, 100));
    const buffer = await downloadAudioBuffer(downloadUrl);

    return {
        buffer,
        title: String(title).replace(/\s+/g, ' ').trim(),
        thumbnail: thumbnail || 'https://i.imgur.com/4XfCwQ0.png',
        quality: quality,
        duration: duration,
        source: 'nexray',
        videoUrl: youtubeUrl,
        videoId,
        downloadUrl,
        fileSize: buffer.length,
        fileSizeMB: (buffer.length / 1024 / 1024).toFixed(2)
    };
}

async function getYoutubeAudio(ytUrl) {
    console.log('Starting audio download for:', ytUrl);
    
    try {
        console.log('Trying primary source...');
        return await getYoutubeAudioFromZiaUlhaq(ytUrl);
    } catch (primaryErr) {
        console.error('Primary source error:', primaryErr.message);
        
        try {
            console.log('Trying fallback source...');
            return await getYoutubeAudioFromNexray(ytUrl);
        } catch (fallbackErr) {
            console.error('Fallback source error:', fallbackErr.message);
            
            // Try one more time with a different approach
            try {
                console.log('Trying fallback with different format...');
                const videoId = extractYoutubeVideoId(ytUrl);
                if (videoId) {
                    const altUrl = `https://api.nexray.eu.cc/downloader/savetube?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}&quality=mp3`;
                    const res = await axios.get(altUrl, {
                        ...AXIOS_DEFAULTS,
                        timeout: AUDIO_TIMEOUT_MS
                    });
                    
                    if (res.data && res.data.url) {
                        const buffer = await downloadAudioBuffer(res.data.url);
                        return {
                            buffer,
                            title: res.data.title || 'Unknown Title',
                            thumbnail: res.data.thumbnail || 'https://i.imgur.com/4XfCwQ0.png',
                            quality: '128 kbps',
                            duration: res.data.duration || 'Unknown',
                            source: 'nexray-alt',
                            videoUrl: ytUrl,
                            videoId,
                            downloadUrl: res.data.url,
                            fileSize: buffer.length,
                            fileSizeMB: (buffer.length / 1024 / 1024).toFixed(2)
                        };
                    }
                }
            } catch (finalErr) {
                console.error('Final attempt error:', finalErr.message);
            }
            
            const primaryMsg = primaryErr?.message || 'Primary source failed';
            const fallbackMsg = fallbackErr?.message || 'Fallback source failed';
            throw new Error(`Audio download failed: ${primaryMsg} | ${fallbackMsg}`);
        }
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

        console.log('Starting audio download for:', selectedUrl);
        const audioData = await getYoutubeAudio(selectedUrl);

        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        const finalTitle = String(audioData.title || query || 'Unknown Song').replace(/\s+/g, ' ').trim();
        
        console.log('Sending audio:', finalTitle, 'Size:', audioData.fileSizeMB, 'MB');

        await sock.sendMessage(chatId, {
            audio: audioData.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${finalTitle}.mp3`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[PLAY] Full error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        
        // Send detailed error message for debugging
        const errorMsg = err.message || 'Unknown error';
        await sock.sendMessage(chatId, {
            text: `❌ Audio unavailable right now.\n\nError: ${errorMsg}\n\nPlease try again in a moment or use a different song title.`
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

module.exports = playCommand;
module.exports.name = 'play';
module.exports.aliases = ['song', 'music'];
module.exports.getYoutubeAudio = getYoutubeAudio;
module.exports.searchYoutubeSong = searchYoutubeSong;
module.exports.handleAudioDownload = handleAudioDownload;