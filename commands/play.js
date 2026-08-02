/**
 * play.js - YouTube Audio Downloader
 * Priority: Prexvy API → YouTubeMP4 → Nayan AllDown → Nayan YouTube
 * Output Order: 1. Thumbnail + ButtonV2, 2. Audio, 3. Info
 * Usage: .play <song name or YouTube URL>
 */

const axios = require('axios');
const cheerio = require('cheerio');
const yts = require('yt-search');

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastErr = err;
            if (i < attempts) await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw lastErr;
}

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err) => reject(err));
    });
}

function extractYoutubeVideoId(ytUrl) {
    if (!ytUrl) return '';
    if (ytUrl.includes('youtu.be/')) {
        return ytUrl.split('youtu.be/')[1].split('?')[0];
    }
    if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        return urlParams.get('v') || '';
    }
    return '';
}

function formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
}

// ─── PREXVY API (PRIORITY 1) ──────────────────────────────────────────────
async function getAudioFromPrexvy(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const apiUrl = `https://prexzyapis.com/download/ytmp3?url=https://youtu.be/${videoId}`;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.download_url) {
            const data = res.data;
            const downloadUrl = data.download_url;

            const fileRes = await tryRequest(() => axios.get(downloadUrl, {
                headers: AXIOS_DEFAULTS.headers,
                responseType: 'stream'
            }));

            const buffer = await streamToBuffer(fileRes.data);

            return {
                buffer: buffer,
                title: data.info?.title || 'Unknown Title',
                author: data.info?.uploader || 'Unknown',
                thumbnail: data.info?.thumbnail || '',
                duration: data.info?.duration || 0,
                duration_string: data.info?.duration_string || '0:00',
                view_count: data.info?.view_count || 0,
                like_count: data.info?.like_count || 0,
                source: 'Prexvy API',
                quality: data.quality || 'medium',
                filesize: data.filesize || 0,
                format_id: data.format_id || '140',
                mimeType: 'audio/mp4',
                download_url: downloadUrl
            };
        }
        throw new Error('Prexvy API response invalid');
    } catch (err) {
        throw new Error(`Prexvy API failed: ${err.message}`);
    }
}

// ─── YOUTUBEMP4 SCRAPER (PRIORITY 2) ──────────────────────────────────────
class YouTubeMP4Downloader {
    constructor() {
        this.baseUrl = 'https://youtubemp4.to';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Accept-Language': 'id-ID,id;q=0.9',
            Referer: `${this.baseUrl}/HAOT/`,
            Origin: this.baseUrl
        };
    }

    async fetchCookies() {
        try {
            const res = await axios.head(`${this.baseUrl}/HAOT/`, { headers: this.headers });
            return res.headers['set-cookie'] ? res.headers['set-cookie'].join('; ') : '';
        } catch {
            return '';
        }
    }

    async downloadVideo(url) {
        const cookies = await this.fetchCookies();
        const headers = {
            ...this.headers,
            Cookie: cookies,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        };

        try {
            const { data } = await axios.post(
                `${this.baseUrl}/download_ajax/`,
                new URLSearchParams({ url }).toString(),
                { headers }
            );
            return this.parseDownloadPage(data);
        } catch (error) {
            console.error('[PLAY] YouTubeMP4 ajax failed:', error.message);
            return null;
        }
    }

    parseDownloadPage(data) {
        const $ = cheerio.load(data?.result || '');
        const title = $('.meta h2').text().trim() || 'Unknown';
        const thumbnail = $('.poster img').attr('src') || '';
        const allFormats = [];

        $('.results-other table tbody tr').each((_, el) => {
            const qualityText = $(el).find('td').eq(0).text().trim();
            const sizeText = $(el).find('td').eq(1).text().trim();
            const linkUrl = $(el).find('td a').attr('href') || '';

            if (linkUrl) {
                allFormats.push({ quality: qualityText, size: sizeText, link: linkUrl });
            }
        });

        const audioFormats = allFormats.filter(f => /audio|mp3|kbps|kbit/i.test(f.quality));
        const bestAudio = audioFormats.length > 0 ? audioFormats[0] : null;

        return { title, thumbnail, audio: bestAudio };
    }
}

async function getAudioFromYouTubeMP4(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const downloader = new YouTubeMP4Downloader();
    const result = await downloader.downloadVideo(ytUrl);

    if (!result?.audio?.link) {
        throw new Error('YouTubeMP4 scraper returned no audio link');
    }

    const fileRes = await tryRequest(() => axios.get(result.audio.link, {
        headers: AXIOS_DEFAULTS.headers,
        responseType: 'stream'
    }));

    const buffer = await streamToBuffer(fileRes.data);

    return {
        buffer: buffer,
        title: result.title || 'Unknown Title',
        thumbnail: result.thumbnail,
        source: 'YouTubeMP4.to',
        mimeType: 'audio/mp3'
    };
}

// ─── NAYAN ALLDOWN API (PRIORITY 3) ──────────────────────────────────────
async function getAudioFromAllDown(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid URL');

    const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data) {
            const data = res.data.data;
            const videoUrl = data.high || data.low;

            if (!videoUrl) throw new Error('No download URL');

            const fileRes = await tryRequest(() => axios.get(videoUrl, {
                headers: AXIOS_DEFAULTS.headers,
                responseType: 'stream'
            }));

            const buffer = await streamToBuffer(fileRes.data);

            return {
                buffer: buffer,
                title: data.title || 'Unknown',
                thumbnail: data.thumbnail || '',
                source: 'Nayan AllDown',
                mimeType: 'audio/mp4'
            };
        }
        throw new Error('API response invalid');
    } catch (err) {
        throw new Error(`AllDown failed: ${err.message}`);
    }
}

// ─── NAYAN YOUTUBE API (PRIORITY 4) ──────────────────────────────────────
async function getAudioFromYoutubeAPI(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid URL');

    const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const title = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;

            let bestAudio = null;
            let priority = 0;

            for (const format of formats) {
                if (format.type === 'audio') {
                    let p = 0;
                    if (format.formatId === '251') p = 100;
                    else if (format.formatId === '250') p = 90;
                    else if (format.formatId === '249') p = 85;
                    else if (format.formatId === '140') p = 80;
                    else if (format.formatId === '139') p = 70;

                    if (p > priority) {
                        priority = p;
                        bestAudio = format;
                    }
                }
            }

            if (!bestAudio) {
                for (const format of formats) {
                    if (format.type === 'video_with_audio' && format.mimeType?.includes('mp4')) {
                        bestAudio = format;
                        break;
                    }
                }
            }

            if (bestAudio?.url) {
                const fileRes = await tryRequest(() => axios.get(bestAudio.url, {
                    headers: AXIOS_DEFAULTS.headers,
                    responseType: 'stream'
                }));

                const buffer = await streamToBuffer(fileRes.data);

                return {
                    buffer: buffer,
                    title: title || 'Unknown',
                    thumbnail: thumbnail || '',
                    source: 'Nayan YouTube API',
                    quality: bestAudio.quality || bestAudio.label,
                    mimeType: 'audio/mp4'
                };
            }
        }
        throw new Error('No audio format found');
    } catch (err) {
        throw new Error(`YouTube API failed: ${err.message}`);
    }
}

// ─── MAIN DOWNLOAD FUNCTION ──────────────────────────────────────────────
async function getYoutubeAudio(ytUrl) {
    // Priority 1: Prexvy API
    try {
        console.log('[PLAY] Trying Prexvy API...');
        return await getAudioFromPrexvy(ytUrl);
    } catch (prexvyErr) {
        console.log(`[PLAY] Prexvy failed: ${prexvyErr.message}, trying YouTubeMP4...`);
        
        // Priority 2: YouTubeMP4
        try {
            return await getAudioFromYouTubeMP4(ytUrl);
        } catch (scraperErr) {
            console.log(`[PLAY] YouTubeMP4 failed: ${scraperErr.message}, trying AllDown...`);
            
            // Priority 3: Nayan AllDown
            try {
                return await getAudioFromAllDown(ytUrl);
            } catch (allDownErr) {
                console.log(`[PLAY] AllDown failed: ${allDownErr.message}, trying YouTube API...`);
                
                // Priority 4: Nayan YouTube API
                try {
                    return await getAudioFromYoutubeAPI(ytUrl);
                } catch (ytErr) {
                    throw new Error(`All download sources failed: ${ytErr.message}`);
                }
            }
        }
    }
}

// ─── COMMAND HANDLER ──────────────────────────────────────────────────────
async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: '🎵 Use .play <song name or URL>' 
            });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let videoUrl = query;
        let videoInfo = null;
        let thumbnailUrl = '';
        let searchTitle = '';

        // ─── SEARCH IF NOT YOUTUBE URL ────────────────────────────────────
        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const searchResults = await yts(query);
            const videos = searchResults?.videos;

            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { text: '❌ Song not found' });
            }

            videoInfo = videos[0];
            videoUrl = videoInfo.url;
            thumbnailUrl = videoInfo.thumbnail;
            searchTitle = videoInfo.title;
        }

        // ─── PROCESSING ──────────────────────────────────────────────────
        const processMsg = await sock.sendMessage(chatId, { text: '⏳ Processing...' });

        // ─── DOWNLOAD AUDIO ──────────────────────────────────────────────
        const audioData = await getYoutubeAudio(videoUrl);

        await sock.sendMessage(chatId, { delete: processMsg.key });

        // ─── 1. SEND SONG INFO WITH THUMBNAIL ───────────────────────────
        const thumb = audioData.thumbnail || thumbnailUrl;
        const title = audioData.title || searchTitle || 'Unknown Title';

        let infoCaption = `🎵 ${title.substring(0, 45)}\n`;
        if (audioData.author) infoCaption += `👤 ${audioData.author}\n`;
        infoCaption += `⏱️ ${audioData.duration_string || 'Unknown'}\n`;
        if (audioData.filesize) infoCaption += `📦 ${formatSize(audioData.filesize)}\n`;
        infoCaption += `📡 ${audioData.source}`;

        if (thumb) {
            await sock.sendMessage(chatId, {
                image: { url: thumb },
                caption: infoCaption
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: infoCaption }, { quoted: message });
        }

        // ─── REACTION ──────────────────────────────────────────────────────
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

        // ─── 2. SEND AUDIO FILE ──────────────────────────────────────────
        const audioMessage = {
            audio: audioData.buffer,
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: `${title.substring(0, 40)}.mp4`
        };

        await sock.sendMessage(chatId, audioMessage);

        // ─── 3. SEND DOWNLOAD CONFIRMATION ────────────────────────────────
        const infoText = `✅ Nyimbo imeshapakuliwa!\n🎵 ${title}`;
        await sock.sendMessage(chatId, { text: infoText });
    } catch (err) {
        console.error('[PLAY] Error:', err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { 
            text: `❌ *Error:* ${err.message}\n\n💡 Please try again later or use a different link.` 
        });
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = playCommand;
module.exports.getYoutubeAudio = getYoutubeAudio;
module.exports.name = 'play';
module.exports.aliases = ['music', 'song', 'audio'];
module.exports.category = 'downloader';
module.exports.default = playCommand;
module.exports.handler = playCommand;