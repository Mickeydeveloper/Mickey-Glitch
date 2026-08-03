/**
 * play.js - YouTube Audio Downloader
 * Priority: Prexvy API → YouTubeMP4 → Nayan AllDown → Nayan YouTube
 * Output Order: 1. Thumbnail + Info, 2. Audio
 * Usage: .play <song name or YouTube URL>
 */

const axios = require('axios');
const cheerio = require('cheerio');
const yts = require('yt-search');

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const AXIOS_DEFAULTS = {
    timeout: 45000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    },
    maxRedirects: 5,
    validateStatus: (status) => status < 500
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
async function tryRequest(getter, attempts = 3, delay = 1500) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastErr = err;
            console.log(`[PLAY] Attempt ${i}/${attempts} failed: ${err.message}`);
            if (i < attempts) await new Promise(r => setTimeout(r, delay * i));
        }
    }
    throw lastErr;
}

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => {
            if (chunk && chunk.length > 0) chunks.push(chunk);
        });
        stream.on('end', () => {
            if (chunks.length === 0) reject(new Error('No data received from stream'));
            else resolve(Buffer.concat(chunks));
        });
        stream.on('error', reject);
        stream.on('close', () => {
            if (chunks.length > 0) resolve(Buffer.concat(chunks));
        });
    });
}

function extractYoutubeVideoId(ytUrl) {
    if (!ytUrl) return '';
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:[?&]|$)/
    ];
    
    for (const pattern of patterns) {
        const match = ytUrl.match(pattern);
        if (match) return match[1];
    }
    
    try {
        const url = new URL(ytUrl);
        if (url.hostname.includes('youtube.com')) {
            return url.searchParams.get('v') || '';
        }
    } catch {
        return '';
    }
    return '';
}

function formatDuration(seconds) {
    if (!seconds || seconds < 0) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
}

function formatSize(bytes) {
    if (!bytes || bytes < 0) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function cleanString(str) {
    if (!str) return 'Unknown';
    return str.replace(/[^\x20-\x7E]/g, '').trim();
}

function truncateString(str, maxLength = 40) {
    if (!str) return 'Unknown';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

// ─── PREXVY API (PRIORITY 1) ──────────────────────────────────────────────
async function getAudioFromPrexvy(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const apiUrl = `https://prexzyapis.com/download/ytmp3?url=https://youtu.be/${videoId}`;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res?.data?.status === true && res?.data?.download_url) {
            const data = res.data;
            const downloadUrl = data.download_url;

            const fileRes = await tryRequest(() => axios.get(downloadUrl, {
                headers: AXIOS_DEFAULTS.headers,
                responseType: 'stream',
                timeout: 60000
            }));

            const buffer = await streamToBuffer(fileRes.data);

            if (!buffer || buffer.length < 1000) {
                throw new Error('Downloaded file too small');
            }

            return {
                buffer: buffer,
                title: cleanString(data.info?.title),
                author: cleanString(data.info?.uploader),
                thumbnail: data.info?.thumbnail || '',
                duration: parseInt(data.info?.duration) || 0,
                duration_string: data.info?.duration_string || '0:00',
                view_count: parseInt(data.info?.view_count) || 0,
                like_count: parseInt(data.info?.like_count) || 0,
                source: 'Prexvy API',
                quality: data.quality || 'medium',
                filesize: parseInt(data.filesize) || buffer.length,
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
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': `${this.baseUrl}/HAOT/`,
            'Origin': this.baseUrl,
            'Cache-Control': 'no-cache'
        };
    }

    async fetchCookies() {
        try {
            const res = await axios.head(`${this.baseUrl}/HAOT/`, { 
                headers: this.headers,
                timeout: 15000
            });
            return res.headers['set-cookie'] ? res.headers['set-cookie'].join('; ') : '';
        } catch {
            return '';
        }
    }

    async downloadVideo(url) {
        try {
            const cookies = await this.fetchCookies();
            const headers = {
                ...this.headers,
                Cookie: cookies,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            };

            const { data } = await tryRequest(() => axios.post(
                `${this.baseUrl}/download_ajax/`,
                new URLSearchParams({ url }).toString(),
                { headers, timeout: 30000 }
            ));

            if (!data?.result) {
                throw new Error('No result in response');
            }

            return this.parseDownloadPage(data);
        } catch (error) {
            console.error('[PLAY] YouTubeMP4 ajax failed:', error.message);
            throw new Error(`YouTubeMP4 failed: ${error.message}`);
        }
    }

    parseDownloadPage(data) {
        const $ = cheerio.load(data?.result || '');
        const title = cleanString($('.meta h2').text()) || 'Unknown';
        const thumbnail = $('.poster img').attr('src') || '';
        const allFormats = [];

        $('.results-other table tbody tr').each((_, el) => {
            const qualityText = $(el).find('td').eq(0).text().trim();
            const sizeText = $(el).find('td').eq(1).text().trim();
            const linkUrl = $(el).find('td a').attr('href') || '';

            if (linkUrl) {
                allFormats.push({ 
                    quality: qualityText, 
                    size: sizeText, 
                    link: linkUrl.startsWith('http') ? linkUrl : `${this.baseUrl}${linkUrl}`
                });
            }
        });

        const audioFormats = allFormats.filter(f => 
            /audio|mp3|kbps|kbit|128|192|320/i.test(f.quality)
        );
        
        const bestAudio = audioFormats.length > 0 ? audioFormats[0] : null;

        if (!bestAudio) {
            throw new Error('No audio format found');
        }

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
        responseType: 'stream',
        timeout: 60000
    }));

    const buffer = await streamToBuffer(fileRes.data);

    if (!buffer || buffer.length < 1000) {
        throw new Error('Downloaded file too small');
    }

    return {
        buffer: buffer,
        title: result.title || 'Unknown Title',
        thumbnail: result.thumbnail,
        source: 'YouTubeMP4.to',
        quality: result.audio.quality || 'Unknown',
        filesize: buffer.length,
        mimeType: 'audio/mpeg'
    };
}

// ─── NAYAN ALLDOWN API (PRIORITY 3) ──────────────────────────────────────
async function getAudioFromAllDown(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid URL');

    const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;

    try {
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res?.data?.status === true && res?.data?.data) {
            const data = res.data.data;
            const videoUrl = data.high || data.low || data.url;

            if (!videoUrl) throw new Error('No download URL');

            const fileRes = await tryRequest(() => axios.get(videoUrl, {
                headers: AXIOS_DEFAULTS.headers,
                responseType: 'stream',
                timeout: 60000
            }));

            const buffer = await streamToBuffer(fileRes.data);

            if (!buffer || buffer.length < 1000) {
                throw new Error('Downloaded file too small');
            }

            return {
                buffer: buffer,
                title: cleanString(data.title),
                thumbnail: data.thumbnail || '',
                author: cleanString(data.author),
                duration: parseInt(data.duration) || 0,
                source: 'Nayan AllDown',
                quality: 'medium',
                filesize: buffer.length,
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

        if (res?.data?.status === true && res?.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const videoTitle = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;

            let bestAudio = null;
            let priority = 0;

            const audioPriority = {
                '251': 100, '250': 90, '249': 85, '140': 80, 
                '139': 70, '256': 95, '258': 90, '599': 88
            };

            for (const format of formats) {
                if (format.type === 'audio') {
                    const p = audioPriority[format.formatId] || 0;
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
                    responseType: 'stream',
                    timeout: 60000
                }));

                const buffer = await streamToBuffer(fileRes.data);

                if (!buffer || buffer.length < 1000) {
                    throw new Error('Downloaded file too small');
                }

                return {
                    buffer: buffer,
                    title: cleanString(videoTitle),
                    thumbnail: thumbnail || '',
                    author: cleanString(res.data.data.data.author),
                    duration: parseInt(res.data.data.data.duration) || 0,
                    source: 'Nayan YouTube API',
                    quality: bestAudio.quality || bestAudio.label || 'medium',
                    filesize: buffer.length,
                    format_id: bestAudio.formatId || '140',
                    mimeType: bestAudio.mimeType || 'audio/mp4'
                };
            }
            throw new Error('No audio format found');
        }
        throw new Error('API response invalid or no formats');
    } catch (err) {
        throw new Error(`YouTube API failed: ${err.message}`);
    }
}

// ─── MAIN DOWNLOAD FUNCTION ──────────────────────────────────────────────
async function getYoutubeAudio(ytUrl) {
    const errors = [];
    
    // Priority 1: Prexvy API
    try {
        console.log('[PLAY] Trying Prexvy API...');
        const result = await getAudioFromPrexvy(ytUrl);
        console.log('[PLAY] Prexvy API succeeded!');
        return result;
    } catch (prexvyErr) {
        errors.push(`Prexvy: ${prexvyErr.message}`);
        console.log(`[PLAY] Prexvy failed: ${prexvyErr.message}`);
    }

    // Priority 2: YouTubeMP4
    try {
        console.log('[PLAY] Trying YouTubeMP4...');
        const result = await getAudioFromYouTubeMP4(ytUrl);
        console.log('[PLAY] YouTubeMP4 succeeded!');
        return result;
    } catch (scraperErr) {
        errors.push(`YouTubeMP4: ${scraperErr.message}`);
        console.log(`[PLAY] YouTubeMP4 failed: ${scraperErr.message}`);
    }

    // Priority 3: Nayan AllDown
    try {
        console.log('[PLAY] Trying AllDown...');
        const result = await getAudioFromAllDown(ytUrl);
        console.log('[PLAY] AllDown succeeded!');
        return result;
    } catch (allDownErr) {
        errors.push(`AllDown: ${allDownErr.message}`);
        console.log(`[PLAY] AllDown failed: ${allDownErr.message}`);
    }

    // Priority 4: Nayan YouTube API
    try {
        console.log('[PLAY] Trying YouTube API...');
        const result = await getAudioFromYoutubeAPI(ytUrl);
        console.log('[PLAY] YouTube API succeeded!');
        return result;
    } catch (ytErr) {
        errors.push(`YouTube API: ${ytErr.message}`);
        console.log(`[PLAY] YouTube API failed: ${ytErr.message}`);
    }

    // All sources failed
    throw new Error(`All download sources failed:\n${errors.join('\n')}`);
}

// ─── COMMAND HANDLER ──────────────────────────────────────────────────────
async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.imageMessage?.caption || '';
        
        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: '🎵 *YouTube Audio Downloader*\n\n' +
                      'Usage: `.play <song name or URL>`\n' +
                      'Examples:\n' +
                      '• `.play Sam Smith - Unholy`\n' +
                      '• `.play https://youtu.be/...`\n\n' +
                      '✨ Supports multiple download sources for reliability'
            });
        }

        // Send initial reaction
        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let videoUrl = query;
        let videoInfo = null;
        let thumbnailUrl = '';
        let searchTitle = '';

        // ─── SEARCH IF NOT YOUTUBE URL ────────────────────────────────────
        if (!query.includes('youtube.com') && !query.includes('youtu.be') && !query.includes('youtube')) {
            try {
                const searchResults = await yts(query);
                const videos = searchResults?.videos;

                if (!videos || videos.length === 0) {
                    await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                    return sock.sendMessage(chatId, { 
                        text: '❌ *Song not found*\n\n' +
                              'Please try a different search term or use a direct YouTube URL.' 
                    });
                }

                videoInfo = videos[0];
                videoUrl = videoInfo.url;
                thumbnailUrl = videoInfo.thumbnail;
                searchTitle = videoInfo.title;
            } catch (searchErr) {
                console.error('[PLAY] Search error:', searchErr);
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { 
                    text: '❌ *Search failed*\n\n' +
                          'Please use a direct YouTube URL instead.' 
                });
            }
        }

        // ─── PROCESSING ──────────────────────────────────────────────────
        const processMsg = await sock.sendMessage(chatId, { 
            text: '⏳ *Processing audio...*\n' +
                  'This may take a moment depending on the source.' 
        });

        // ─── DOWNLOAD AUDIO ──────────────────────────────────────────────
        let audioData;
        try {
            audioData = await getYoutubeAudio(videoUrl);
        } catch (downloadErr) {
            await sock.sendMessage(chatId, { delete: processMsg.key });
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { 
                text: `❌ *Download failed*\n\n${downloadErr.message}\n\n` +
                      '💡 Please try:\n' +
                      '• Using a direct YouTube URL\n' +
                      '• Trying again later\n' +
                      '• Using a different song' 
            });
        }

        await sock.sendMessage(chatId, { delete: processMsg.key });

        // ─── 1. SEND SONG INFO WITH THUMBNAIL ───────────────────────────
        const thumb = audioData.thumbnail || thumbnailUrl || '';
        const title = audioData.title || searchTitle || 'Unknown Title';
        const duration = audioData.duration ? formatDuration(audioData.duration) : 
                        audioData.duration_string || 'Unknown';
        const size = audioData.filesize ? formatSize(audioData.filesize) : 'Unknown';
        const author = audioData.author ? cleanString(audioData.author) : 'Unknown Artist';
        const source = audioData.source || 'Unknown Source';
        const quality = audioData.quality || 'Medium';

        // Clean and truncate title
        const cleanTitle = truncateString(title, 50);
        const cleanAuthor = truncateString(author, 30);

        // Build info caption - Clean version without forwarded feature
        let infoCaption = `🎵 *${cleanTitle}*\n\n`;
        infoCaption += `👤 *Artist:* ${cleanAuthor}\n`;
        infoCaption += `⏱️ *Duration:* ${duration}\n`;
        infoCaption += `📦 *Size:* ${size}\n`;
        infoCaption += `📡 *Source:* ${source}\n`;
        infoCaption += `🎚️ *Quality:* ${quality}\n\n`;
        infoCaption += `✅ *Download complete!*`;

        // Send thumbnail and info (without forwarded feature)
        if (thumb) {
            await sock.sendMessage(chatId, {
                image: { url: thumb },
                caption: infoCaption
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: infoCaption 
            }, { quoted: message });
        }

        // ─── SUCCESS REACTION ──────────────────────────────────────────
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

        // ─── 2. SEND AUDIO FILE ──────────────────────────────────────────
        const audioFileName = `${cleanTitle.substring(0, 40)}.mp4`;
        
        const audioMessage = {
            audio: audioData.buffer,
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: audioFileName
        };

        await sock.sendMessage(chatId, audioMessage);

        // ─── 3. SEND COMPACT BUTTON MESSAGE ──────────────────────────────
        const buttonMessage = {
            text: `🎵 *${cleanTitle}*\n\n` +
                  `📥 Downloaded successfully!\n` +
                  `🎚️ Source: ${source}\n` +
                  `⏱️ Duration: ${duration}\n` +
                  `📦 Size: ${size}`,
            footer: '🎵 Music Downloader',
            buttons: [
                { buttonId: 'play_again', buttonText: { displayText: '🎵 Search Again' }, type: 1 },
                { buttonId: 'help_play', buttonText: { displayText: '❓ Help' }, type: 1 }
            ],
            headerType: 1,
            viewOnce: true
        };

        await sock.sendMessage(chatId, buttonMessage);

    } catch (err) {
        console.error('[PLAY] Fatal error:', err);
        try {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(chatId, { 
                text: `❌ *Error:* ${err.message || 'Unknown error'}\n\n` +
                      '💡 Please try:\n' +
                      '• Using a direct YouTube URL\n' +
                      '• Checking your internet connection\n' +
                      '• Trying again later' 
            });
        } catch (sockErr) {
            console.error('[PLAY] Failed to send error message:', sockErr);
        }
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = playCommand;
module.exports.getYoutubeAudio = getYoutubeAudio;
module.exports.name = 'play';
module.exports.aliases = ['music', 'song', 'audio', 'mp3'];
module.exports.category = 'downloader';
module.exports.description = 'Download audio from YouTube with multiple sources';
module.exports.usage = '.play <song name or YouTube URL>';
module.exports.default = playCommand;
module.exports.handler = playCommand;