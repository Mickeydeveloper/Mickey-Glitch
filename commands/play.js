const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { toAudio } = require('../lib/converter');

const AXIOS_DEFAULTS = {
    timeout: 45000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'identity'
    }
};

async function tryRequest(getter, maxAttempts = 4) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            const code = err?.response?.status || err?.code;
            if (['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED'].includes(code) && attempt < maxAttempts) {
                const delay = 3000 * attempt;
                console.log(`[Retry] ${code} on attempt ${attempt} → wait ${delay/1000}s`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            if ([400, 403, 404, 451].includes(code)) throw err;
            if (code === 429) await new Promise(r => setTimeout(r, 10000));
        }
    }
    throw lastError || new Error('Request failed after retries');
}

async function getYupraDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    console.log('[Yupra] Request:', apiUrl);
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url?.startsWith('http')) {
        return {
            download: res.data.data.download_url,
            title: res.data.data.title || 'Unknown',
            thumbnail: res.data.data.thumbnail || ''
        };
    }
    throw new Error('Yupra no valid download URL');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    console.log('[Okatsu] Request:', apiUrl);
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl?.startsWith('http')) {
        return {
            download: res.data.dl,
            title: res.data.title || 'Unknown',
            thumbnail: res.data.thumb || ''
        };
    }
    throw new Error('Okatsu no valid download URL');
}

async function downloadAudioWithRetry(audioUrl, maxRetries = 2) {
    const config = {
        responseType: 'stream',
        timeout: 300000, // 5 minutes - generous for ~10–20 MB files on slow proxies
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: s => s >= 200 && s < 400,
        headers: {
            'User-Agent': AXIOS_DEFAULTS.headers['User-Agent'],
            'Accept': '*/*',
            'Accept-Encoding': 'identity'
        }
    };

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            console.log(`[Download] Attempt \( {attempt}/ \){maxRetries+1} - streaming from ${audioUrl.substring(0,60)}...`);
            const response = await axios.get(audioUrl, config);

            const contentLength = parseInt(response.headers['content-length'] || '0', 10);
            console.log(`[Download] Expected size: ${contentLength ? (contentLength / 1024 / 1024).toFixed(2) + ' MB' : 'unknown'}`);

            const chunks = [];
            let received = 0;

            response.data.on('data', (chunk) => {
                chunks.push(chunk);
                received += chunk.length;
                if (attempt === 1 && received > 0 && received % (1024 * 512) === 0) {
                    console.log(`[Progress] Received ${ (received / 1024 / 1024).toFixed(2) } MB`);
                }
            });

            await new Promise((resolve, reject) => {
                response.data.on('end', resolve);
                response.data.on('error', reject);
            });

            const buffer = Buffer.concat(chunks);

            if (contentLength > 0 && received < contentLength * 0.95) {
                throw new Error(`Incomplete download: got \( {received} bytes, expected ~ \){contentLength}`);
            }

            console.log(`[Download] Success - ${ (buffer.length / 1024 / 1024).toFixed(2) } MB`);
            return buffer;
        } catch (err) {
            console.error(`[Download] Attempt ${attempt} failed:`, err.message || err.code || err);
            if (attempt >= maxRetries + 1) throw err;
            await new Promise(r => setTimeout(r, 5000 * attempt));
        }
    }
}

async function songCommand(sock, chatId, message) {
    try {
        const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        if (!text) {
            await sock.sendMessage(chatId, { text: 'Usage: .song <song name or YouTube link>' }, { quoted: message });
            return;
        }

        let video;
        if (text.includes('youtube.com') || text.includes('youtu.be')) {
            video = { url: text.startsWith('http') ? text : `https://${text}`, title: 'YouTube Audio', timestamp: '—' };
        } else {
            const search = await yts(text);
            if (!search?.videos?.length) {
                await sock.sendMessage(chatId, { text: '❌ No results found.' }, { quoted: message });
                return;
            }
            video = search.videos[0];
        }

        await sock.sendMessage(chatId, {
            text: `🎵 Preparing *${video.title}*  ⏱ ${video.timestamp || '—'}`,
            contextInfo: {
                externalAdReply: {
                    title: video.title || 'Mickey Glitch Music',
                    body: 'Fetching audio (may take 10–60s)...',
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: video.url || 'https://youtube.com',
                    mediaType: 1,
                    showAdAttribution: false,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        let audioData;
        try {
            audioData = await getYupraDownloadByUrl(video.url);
        } catch (e1) {
            console.log('[Fallback] Yupra failed:', e1.message);
            audioData = await getOkatsuDownloadByUrl(video.url);
        }

        const audioUrl = audioData.download;
        if (!audioUrl?.startsWith('http')) {
            throw new Error('Invalid audio download URL');
        }

        const audioBuffer = await downloadAudioWithRetry(audioUrl);

        if (!audioBuffer || audioBuffer.length < 16000) {
            throw new Error('Downloaded audio too small - likely failed or corrupted');
        }

        // ─── Your original format detection + conversion logic ───
        const head = audioBuffer.slice(0, 12);
        let fileExtension = 'm4a';
        let detectedFormat = 'M4A/MP4';

        if (head.toString('ascii', 0, 3) === 'ID3' || (head[0] === 0xFF && (head[1] & 0xE0) === 0xE0)) {
            fileExtension = 'mp3';
            detectedFormat = 'MP3';
        } else if (head.toString('ascii', 0, 4) === 'OggS') {
            fileExtension = 'ogg';
            detectedFormat = 'OGG';
        } else if (head.toString('ascii', 4, 8) === 'ftyp') {
            fileExtension = 'm4a';
        }

        let finalBuffer = audioBuffer;
        let finalMimetype = 'audio/mpeg';

        if (fileExtension !== 'mp3') {
            console.log(`[Convert] ${detectedFormat} → MP3`);
            finalBuffer = await toAudio(audioBuffer, fileExtension);
            if (!finalBuffer || finalBuffer.length < 16000) {
                throw new Error('Conversion produced invalid/empty output');
            }
        }

        await sock.sendMessage(chatId, {
            audio: finalBuffer,
            mimetype: finalMimetype,
            fileName: `${(audioData.title || video.title || 'song').replace(/[^a-z0-9]/gi, '_')}.mp3`,
            ptt: false
        }, { quoted: message });

        console.log('[Success] Sent MP3');

        // Cleanup (your original logic)
        try {
            const tempDir = path.join(__dirname, '../temp');
            if (fs.existsSync(tempDir)) {
                const now = Date.now();
                fs.readdirSync(tempDir).forEach(file => {
                    const fp = path.join(tempDir, file);
                    if (now - fs.statSync(fp).mtimeMs > 15000 &&
                        (file.endsWith('.mp3') || file.endsWith('.m4a') || /^\d+\.(mp3|m4a)$/.test(file))) {
                        fs.unlinkSync(fp);
                    }
                });
            }
        } catch {}

    } catch (err) {
        console.error('[ERROR]', err.message || err.code || err);

        let userMsg = '❌ Failed to process song.';
        const msg = (err.message || '').toLowerCase();

        if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('aborted') || msg.includes('connection') || msg.includes('incomplete')) {
            userMsg = '❌ Download was too slow or got interrupted (unstable server/connection). Try a shorter song or again later.';
        } else if (msg.includes('corrupted') || msg.includes('small') || msg.includes('invalid') || msg.includes('conversion')) {
            userMsg = '❌ Audio file corrupted or incomplete. Try a different song.';
        } else if (msg.includes('api') || msg.includes('no valid') || msg.includes('url')) {
            userMsg = '❌ Download service having issues right now. Try again in a few minutes.';
        }

        await sock.sendMessage(chatId, { text: userMsg }, { quoted: message });
    }
}

module.exports = songCommand;