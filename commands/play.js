const axios = require('axios');
const cheerio = require('cheerio');
const yts = require('yt-search');
const { ButtonV2 } = require('../lib/messageBuilder');

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

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

// Helper to convert stream to buffer (Safely handles large chunks)
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
            console.error('[PLAY] [YouTubeMP4] ajax fetch failed:', error.message);
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
        const filteredVideos = allFormats.filter(f => {
            if (/audio|mp3|kbps|kbit/i.test(f.quality)) return false;
            const match = f.quality.match(/\d+/);
            if (match) return ['480', '720', '1080'].includes(match[0]);
            return false;
        });

        return { title, thumbnail, audio: bestAudio, video: filteredVideos };
    }
}

// Function to get audio from ytToMP4 scraper
async function getAudioFromYouTubeMP4Scraper(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL for YouTubeMP4 scraper');

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

// Function to get audio from Nayan AllDown API
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

            // FIXED: Using stream and removed timeout for large downloads
            const fileRes = await tryRequest(() => axios.get(videoUrl, {
                headers: AXIOS_DEFAULTS.headers,
                responseType: 'stream'
            }));

            const buffer = await streamToBuffer(fileRes.data);

            return {
                buffer: buffer,
                title: data.title,
                thumbnail: data.thumbnail,
                source: 'Nayan AllDown',
                mimeType: 'audio/mp4'
            };
        }
        throw new Error('API response invalid');
    } catch (err) {
        throw new Error(`AllDown failed: ${err.message}`);
    }
}

// Function to get audio from Nayan YouTube API
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
            const author = res.data.data.data.author;

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
                // FIXED: Using stream and removed timeout for large downloads
                const fileRes = await tryRequest(() => axios.get(bestAudio.url, {
                    headers: AXIOS_DEFAULTS.headers,
                    responseType: 'stream'
                }));

                const buffer = await streamToBuffer(fileRes.data);

                return {
                    buffer: buffer,
                    title: title,
                    thumbnail: thumbnail,
                    author: author,
                    quality: bestAudio.quality || bestAudio.label,
                    source: 'Nayan YouTube API',
                    mimeType: 'audio/mp4'
                };
            }
        }
        throw new Error('No audio format found');
    } catch (err) {
        throw new Error(`YouTube API failed: ${err.message}`);
    }
}

async function getAudioFromPrexzyAPI(ytUrl) {
    const videoId = extractYoutubeVideoId(ytUrl);

    if (!videoId) throw new Error('Invalid YouTube URL for Prexzy API');

    const encodedYoutubeUrl = encodeURIComponent(`https://youtu.be/${videoId}`);
    const apiUrl = `https://prexzyapis.com/download/youtube-audio?url=${encodedYoutubeUrl}`;

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
                thumbnail: data.info?.thumbnail,
                source: 'Prexzy API',
                mimeType: 'audio/mp3' // Assuming it's always mp3 from this API
            };
        }
        throw new Error('Prexzy API response invalid or no download URL');
    } catch (err) {
        throw new Error(`Prexzy API failed: ${err.message}`);
    }
}

async function getYoutubeAudio(ytUrl) {
    try {
        console.log('[PLAY] Trying YouTubeMP4 scraper...');
        return await getAudioFromYouTubeMP4Scraper(ytUrl);
    } catch (scraperErr) {
        console.log(`[PLAY] YouTubeMP4 scraper failed: ${scraperErr.message}, trying Prexzy API...`);
        try {
            return await getAudioFromPrexzyAPI(ytUrl);
        } catch (prexzyErr) {
            console.log(`[PLAY] Prexzy API failed: ${prexzyErr.message}, trying AllDown API...`);
            try {
                return await getAudioFromAllDown(ytUrl);
            } catch (allDownErr) {
                console.log(`[PLAY] AllDown failed: ${allDownErr.message}, trying YouTube API...`);
                try {
                    return await getAudioFromYoutubeAPI(ytUrl);
                } catch (ytErr) {
                    throw new Error(`All download sources failed: ${ytErr.message}`);
                }
            }
        }
    }
}

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, { 
                text: '🎵 *Play Music*\n\n📝 .play song name\n🔗 .play youtube_url' 
            });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let videoUrl = query;
        let videoInfo = null;
        let thumbnailUrl = '';

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

            const infoText = `🎵 *${videoInfo.title}*\n⏱️ ${videoInfo.timestamp} | 👤 ${videoInfo.author.name}\n👁️ ${(videoInfo.views || 0).toLocaleString()}\n\n⬇️ Downloading...`;

            if (thumbnailUrl) {
                await sock.sendMessage(chatId, {
                    image: { url: thumbnailUrl },
                    caption: infoText
                });
            } else {
                await sock.sendMessage(chatId, { text: infoText });
            }
        } else {
            await sock.sendMessage(chatId, { text: '⬇️ Processing...' });
        }

        const processMsg = await sock.sendMessage(chatId, { text: '⏳ Loading...' });

        const audioData = await getYoutubeAudio(videoUrl);

        await sock.sendMessage(chatId, { delete: processMsg.key });

        // Send thumbnail as normal image (if available and not sent yet)
        if (audioData.thumbnail && !thumbnailUrl) {
            await sock.sendMessage(chatId, {
                image: { url: audioData.thumbnail },
                caption: `🎵 *${audioData.title.substring(0, 50)}*\n📡 ${audioData.source}`
            });
        }

        // Send audio
        const audioMessage = {
            audio: audioData.buffer,
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: `${audioData.title.substring(0, 40)}.mp4`
        };

        await sock.sendMessage(chatId, audioMessage);

        const audioTitle = String(audioData.title || videoInfo?.title || query || 'Unknown').replace(/\s+/g, ' ').trim();
        
        // Create button with thumbnail
        const button = new ButtonV2(sock)
            .text(`🎥 Download video for: ${audioTitle}`)
            .footer('Mickey Glitch')
            .button('Download Video', `.video ${audioTitle}`);
        
        // Set thumbnail if available
        if (audioData.thumbnail || thumbnailUrl) {
            button.setThumbnail(audioData.thumbnail || thumbnailUrl);
        }

        await button.send(chatId, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[PLAY] Error:', err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}. Tafadhali jaribu tena baadaye.` });
    }
}

module.exports = playCommand;
module.exports.getYoutubeAudio = getYoutubeAudio;