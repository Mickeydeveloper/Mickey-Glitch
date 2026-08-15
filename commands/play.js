/**
 * play.js - YouTube Audio Downloader
 * Priority: Prexvy API → YouTubeMP4 → Nayan AllDown → Nayan YouTube
 * Usage: .play <song name or YouTube URL>
 */

const axios = require('axios');
const yts = require('yt-search');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { toAudio } = require('../lib/converter');

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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
}

function formatSize(bytes) {
    if (!bytes || bytes < 0) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
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

async function sendLivePhotoPreview(sock, chatId, quoted, imageUrl, videoUrl, caption) {
    try {
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        const video = await prepareWAMessageMedia(
            { video: { url: videoUrl } },
            { upload: sock.waUploadToServer }
        );

        const previewMessage = generateWAMessageFromContent(
            chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    caption,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0,
                    },
                },
            },
            {}
        );

        await sock.relayMessage(chatId, previewMessage.message, {
            messageId: previewMessage.key.id,
        });

        await sock.relayMessage(
            chatId,
            {
                videoMessage: {
                    ...video.videoMessage,
                    contextInfo: {
                        pairedMediaType: 6,
                        statusSourceType: 0,
                    },
                },
                messageContextInfo: {
                    messageAssociation: {
                        associationType: 12,
                        parentMessageKey: previewMessage.key,
                    },
                },
            },
            {}
        );
    } catch (error) {
        console.error('[PLAY] live photo preview failed:', error?.message || error);
        if (quoted) {
            await sock.sendMessage(chatId, { text: caption }, { quoted });
        } else {
            await sock.sendMessage(chatId, { text: caption });
        }
    }
}

// ─── PREXZY API ONLY (MP3 FINAL OUTPUT) ───────────────────────────────────
async function downloadFromCandidates(candidates) {
    const checked = [];
    let lastError = null;

    for (const url of candidates) {
        if (!url || typeof url !== 'string') continue;
        checked.push(url);

        try {
            const response = await fetch(url, {
                headers: AXIOS_DEFAULTS.headers,
                redirect: 'follow'
            });

            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status}`);
                continue;
            }

            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            const arrayBuffer = await response.arrayBuffer();
            const rawBuffer = Buffer.from(arrayBuffer);

            if (!rawBuffer || rawBuffer.length < 256) {
                lastError = new Error('Downloaded audio is empty or too small');
                continue;
            }

            const isLikelyAudio = contentType.includes('audio') ||
                contentType.includes('video') ||
                contentType.includes('octet-stream') ||
                contentType.includes('mpeg') ||
                contentType.includes('mp4') ||
                contentType.includes('webm');

            if (!isLikelyAudio && rawBuffer.length < 1500) {
                lastError = new Error('Downloaded content is not a valid audio stream');
                continue;
            }

            return rawBuffer;
        } catch (err) {
            lastError = err;
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('No valid download URL returned any audio content');
}

async function getAudioFromPrexzy(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const apiUrl = `https://prexzyapis.com/download/ytmp3?url=https://youtu.be/${videoId}`;

    try {
        const response = await fetch(apiUrl, {
            headers: AXIOS_DEFAULTS.headers,
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data?.status) {
            throw new Error(data?.message || 'Prexzy API response invalid');
        }

        const candidates = [
            data.download_url,
            data.format?.download_url,
            data.format_id && data.quality && data.qualities?.find((item) => item.format_id === data.format_id)?.download_url,
            ...((Array.isArray(data.qualities) ? data.qualities : []).map((item) => item.download_url).filter(Boolean))
        ].filter(Boolean);

        if (candidates.length === 0) {
            throw new Error('Prexzy API did not return any downloadable audio URL');
        }

        const rawBuffer = await downloadFromCandidates(candidates);
        const inputExt = String(data.ext || 'm4a').toLowerCase();
        let mp3Buffer = rawBuffer;

        if (inputExt !== 'mp3') {
            mp3Buffer = await toAudio(rawBuffer, inputExt);
        }

        return {
            buffer: mp3Buffer,
            title: cleanString(data.info?.title || 'Unknown Title'),
            author: cleanString(data.info?.uploader || data.info?.channel || 'Unknown Artist'),
            thumbnail: data.info?.thumbnail || '',
            duration: parseInt(data.info?.duration) || 0,
            source: 'Prexzy API',
            quality: data.quality || 'medium',
            filesize: parseInt(data.filesize) || mp3Buffer.length,
            mimeType: 'audio/mpeg'
        };
    } catch (err) {
        throw new Error(`Prexzy API failed: ${err.message}`);
    }
}

// ─── MAIN DOWNLOAD FUNCTION ──────────────────────────────────────────────
async function getYoutubeAudio(ytUrl) {
    try {
        console.log('[PLAY] Using Prexzy API only...');
        return await getAudioFromPrexzy(ytUrl);
    } catch (err) {
        throw new Error(`Download failed: ${err.message}`);
    }
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
        let searchArtist = '';

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
                searchArtist = videoInfo.author?.name || 'Unknown Artist';
            } catch (searchErr) {
                console.error('[PLAY] Search error:', searchErr);
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { 
                    text: '❌ *Search failed*\n\n' +
                          'Please use a direct YouTube URL instead.' 
                });
            }
        }

        // ─── SEND THUMBNAIL WITH SONG INFO ──────────────────────────────
        const thumb = thumbnailUrl || 'https://cdn.ornzora.eu.cc/a6a1e8f4-b83d-4694-9bba-0f22a58bfd4f-FIORA.jpg';
        const previewVideoUrl = 'https://cdn.ornzora.eu.cc/ed7ebb66-9bf4-44b6-858a-b6b7405e53c5-FIORA.mp4';
        const songTitle = truncateString(searchTitle || query, 50);
        const artistName = truncateString(searchArtist || 'Unknown Artist', 30);

        const infoCaption = `🎵 *${songTitle}*\n` +
            `👤 ${artistName}\n` +
            `⏱️ Loading...  |  📦 Loading...\n` +
            `⏳ Processing your download...`;

        await sendLivePhotoPreview(sock, chatId, message, thumb, previewVideoUrl, infoCaption);

        // ─── DOWNLOAD AUDIO ──────────────────────────────────────────────
        let audioData;
        try {
            audioData = await getYoutubeAudio(videoUrl);
        } catch (downloadErr) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { 
                text: `❌ *Download failed*\n\n${downloadErr.message}\n\n` +
                      '💡 Please try:\n' +
                      '• Using a direct YouTube URL\n' +
                      '• Trying again later\n' +
                      '• Using a different song' 
            });
        }

        // ─── SEND AUDIO ONLY (NO EXTRA MESSAGES) ────────────────────────
        const finalTitle = audioData.title || searchTitle || 'Unknown Title';
        const cleanTitle = truncateString(finalTitle, 40);

        const audioMessage = {
            audio: audioData.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${cleanTitle}.mp3`
        };

        await sock.sendMessage(chatId, audioMessage);

        // ─── SUCCESS REACTION ──────────────────────────────────────────
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

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