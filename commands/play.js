const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { toAudio } = require('../lib/converter');

const AXIOS_DEFAULTS = {
    timeout: 45000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'identity'
    }
};

/**
 * Retry logic with exponential backoff + status code awareness
 */
async function tryRequest(getter, maxAttempts = 4) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await getter();
            return res;
        } catch (err) {
            lastError = err;
            const status = err.response?.status;

            // Do NOT retry on these permanent/forbidden statuses
            if ([400, 401, 403, 404, 451].includes(status)) {
                throw err;
            }

            // Rate limit → longer wait
            if (status === 429) {
                await new Promise(r => setTimeout(r, 8000 * attempt));
                continue;
            }

            // Normal backoff for 5xx or network errors
            if (attempt < maxAttempts) {
                const delay = 2000 * Math.pow(1.8, attempt - 1); // ~2s → 3.6s → 6.5s → 11.7s
                console.log(`[Retry] Attempt ${attempt} failed → waiting ${Math.round(delay/1000)}s`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

/**
 * Convert query or link to valid YouTube URL
 */
async function convertQueryToYoutubeLink(query) {
    try {
        query = query.trim();

        if (!query) throw new Error('Empty query');

        // Already a YouTube link?
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            // Very basic validation
            if (!query.startsWith('http')) query = 'https://' + query;
            return { url: query };
        }

        console.log('[Search] Query:', query);
        const search = await yts(query);

        if (!search?.videos?.length) {
            throw new Error('No results found');
        }

        const video = search.videos[0];
        console.log('[Search] Selected:', video.title, video.url);

        return {
            url: video.url,
            title: video.title,
            thumbnail: video.thumbnail,
            timestamp: video.timestamp,
            author: video.author?.name || 'Unknown'
        };
    } catch (err) {
        console.error('[Search] Failed:', err.message);
        throw new Error('Could not find video: ' + err.message);
    }
}

/**
 * Try Yupra API
 */
async function getYupraDownloadByUrl(youtubeUrl) {
    try {
        const apiUrl = `https://api.srihub.store/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
        console.log('[Yupra] Request:', apiUrl);

        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (!res?.data?.success || !res?.data?.data?.download_url) {
            throw new Error('Invalid response - no download_url');
        }

        return {
            download: res.data.data.download_url,
            title: res.data.data.title || 'Unknown Title',
            thumbnail: res.data.data.thumbnail || ''
        };
    } catch (err) {
        console.error('[Yupra] Error:', err.message, err.response?.status);
        throw err;
    }
}

/**
 * Try Okatsu fallback API
 */
async function getOkatsuDownloadByUrl(youtubeUrl) {
    try {
        const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
        console.log('[Okatsu] Request:', apiUrl);

        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (!res?.data?.dl) {
            throw new Error('Invalid response - no dl field');
        }

        return {
            download: res.data.dl,
            title: res.data.title || 'Unknown Title',
            thumbnail: res.data.thumb || ''
        };
    } catch (err) {
        console.error('[Okatsu] Error:', err.message, err.response?.status);
        throw err;
    }
}

/**
 * Get audio link with fallback + better error handling
 */
async function getAudioDownloadLink(youtubeUrl) {
    let errors = [];

    // 1. Try Yupra
    try {
        return await getYupraDownloadByUrl(youtubeUrl);
    } catch (err) {
        errors.push(`Yupra: \( {err.message} ( \){err.response?.status || 'network'})`);
        console.log('[Fallback] Yupra failed → trying Okatsu');
    }

    // 2. Try Okatsu
    try {
        return await getOkatsuDownloadByUrl(youtubeUrl);
    } catch (err) {
        errors.push(`Okatsu: \( {err.message} ( \){err.response?.status || 'network'})`);
    }

    throw new Error(`Both services failed: ${errors.join(' | ')}`);
}

/**
 * Download audio → try arraybuffer first, then stream
 */
async function downloadAudioBuffer(audioUrl) {
    const config = {
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: status => status >= 200 && status < 400,
        headers: {
            'User-Agent': AXIOS_DEFAULTS.headers['User-Agent'],
            'Accept': '*/*',
            'Accept-Encoding': 'identity'
        }
    };

    try {
        console.log('[Download] Trying arraybuffer...');
        const res = await axios.get(audioUrl, { ...config, responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data);
        console.log('[Download] Success (arraybuffer):', buffer.length, 'bytes');
        return buffer;
    } catch (err1) {
        console.log('[Download] Arraybuffer failed:', err1.message);
    }

    try {
        console.log('[Download] Trying stream...');
        const res = await axios.get(audioUrl, { ...config, responseType: 'stream' });

        const chunks = [];
        res.data.on('data', chunk => chunks.push(chunk));
        await new Promise((resolve, reject) => {
            res.data.on('end', resolve);
            res.data.on('error', reject);
        });

        const buffer = Buffer.concat(chunks);
        console.log('[Download] Success (stream):', buffer.length, 'bytes');
        return buffer;
    } catch (err2) {
        throw new Error(`Download failed completely: ${err2.message}`);
    }
}

// ────────────────────────────────────────────────
// The rest of your functions remain mostly unchanged
// (detectAudioFormat, convertToMP3IfNeeded, cleanupTempFiles, sendNotification)
// ────────────────────────────────────────────────

/**
 * Main command – now sends direct download link
 */
async function songCommand(sock, chatId, message) {
    try {
        const text = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''
        ).trim();

        if (!text) {
            await sock.sendMessage(chatId, { text: 'Usage: .song <name or YouTube link>' }, { quoted: message });
            return;
        }

        console.log('[Play] Query:', text);

        // 1. Find YouTube video
        const videoData = await convertQueryToYoutubeLink(text);

        // 2. Get direct download link
        const audioData = await getAudioDownloadLink(videoData.url);
        const audioUrl = audioData.download;

        if (!audioUrl || !audioUrl.startsWith('http')) {
            throw new Error('Invalid download URL received');
        }

        // Optional: send nice notification first
        await sendNotification(sock, chatId, message, {
            title: audioData.title || videoData.title,
            timestamp: videoData.timestamp,
            thumbnail: audioData.thumbnail || videoData.thumbnail,
            url: videoData.url
        });

        // 3. Send clean response with link
        const reply = `🎵 *${audioData.title || videoData.title}*

📥 Direct MP3 link:
${audioUrl}

⏱ Duration: ${videoData.timestamp || '—'}
🔗 YouTube: ${videoData.url}`;

        await sock.sendMessage(chatId, { text: reply }, { quoted: message });

        console.log('[Play] Link sent successfully');

    } catch (err) {
        console.error('[Play] Failed:', err.message);

        let userMsg = '❌ Something went wrong.';

        const msg = err.message.toLowerCase();

        if (msg.includes('no results') || msg.includes('could not find')) {
            userMsg = '❌ Song not found. Try a different name or link.';
        } else if (msg.includes('both services failed') || msg.includes('api')) {
            if (msg.includes('429') || msg.includes('timeout')) {
                userMsg = '❌ Service is busy right now. Try again in a minute.';
            } else if (msg.includes('403') || msg.includes('forbidden') || msg.includes('451')) {
                userMsg = '❌ Download blocked (copyright/legal reason). Try another song.';
            } else {
                userMsg = '❌ Download services are having issues. Try again later.';
            }
        } else if (msg.includes('invalid') || msg.includes('url')) {
            userMsg = '❌ Invalid YouTube link. Please check it.';
        }

        await sock.sendMessage(chatId, { text: userMsg }, { quoted: message });
    }
}

module.exports = songCommand;