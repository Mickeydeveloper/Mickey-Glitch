const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.youtube.com/'
    }
};

// Enhanced retry mechanism with exponential backoff
async function tryRequest(getter, attempts = 3) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastErr = err;
            if (i < attempts) {
                const delay = Math.min(1000 * Math.pow(2, i - 1), 5000);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastErr;
}

// Download image as buffer
async function getImageBuffer(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: AXIOS_DEFAULTS.headers
        });
        return Buffer.from(response.data);
    } catch (err) {
        console.log(`[PLAY] Failed to download image: ${err.message}`);
        return null;
    }
}

// Get MP3 from YouTube using multiple APIs
async function getYoutubeMp3(ytUrl) {
    // Extract video ID from YouTube URL
    let videoId = '';
    if (ytUrl.includes('youtu.be/')) {
        videoId = ytUrl.split('youtu.be/')[1].split('?')[0];
    } else if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        videoId = urlParams.get('v');
    }
    
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }
    
    // API 1: Nayan Video Downloader (for audio)
    const nayanApi = `https://nayan-video-downloader.vercel.app/ytdown?url=https://youtu.be/${videoId}`;
    
    // Try Nayan API first
    try {
        console.log(`[PLAY] Trying Nayan API: ${nayanApi}`);
        const res = await tryRequest(() => axios.get(nayanApi, AXIOS_DEFAULTS));
        
        if (res.data?.status === true && res.data?.data?.audio) {
            const audioUrl = res.data.data.audio;
            const title = res.data.data.title;
            const thumbnail = res.data.data.thumb;
            const channel = res.data.data.channel;
            
            console.log(`[PLAY] Nayan API success: ${title}`);
            return {
                download: audioUrl,
                title: title,
                thumbnail: thumbnail,
                channel: channel,
                source: 'Nayan'
            };
        }
    } catch (err) {
        console.log(`[PLAY] Nayan API failed: ${err.message}`);
    }
    
    // API 2: Aswin Sparky Song Downloader
    const aswinApi = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=https://youtu.be/${videoId}`;
    
    try {
        console.log(`[PLAY] Trying Aswin API: ${aswinApi}`);
        const res = await tryRequest(() => axios.get(aswinApi, AXIOS_DEFAULTS));
        
        if (res.data?.status === true && res.data?.data?.url) {
            const audioUrl = res.data.data.url;
            const title = res.data.data.title;
            
            console.log(`[PLAY] Aswin API success: ${title}`);
            return {
                download: audioUrl,
                title: title,
                thumbnail: null,
                channel: null,
                source: 'Aswin Sparky'
            };
        }
    } catch (err) {
        console.log(`[PLAY] Aswin API failed: ${err.message}`);
    }
    
    throw new Error('No working API available');
}

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const q = text.split(' ').slice(1).join(' ').trim();

        if (!q) {
            return sock.sendMessage(chatId, { 
                text: '🎵 *Unataka wimbo gani?*\n\n📝 Mfano: `.play Mario mvua`' 
            });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let videoUrl = q;
        let videoInfo = null;
        
        // Check if input is YouTube URL or search query
        if (!q.includes('youtube.com') && !q.includes('youtu.be')) {
            // Search for the song
            const searchResults = await yts(q);
            const videos = searchResults?.videos;
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { text: '❌ Sikuipata wimbo huo! Jaribu kutafuta kwa maneno mengine.' });
            }
            
            videoInfo = videos[0];
            videoUrl = videoInfo.url;
            
            // Send short info message
            const infoMsg = `🎵 *${videoInfo.title}*\n⏱️ *${videoInfo.timestamp}* | 👤 ${videoInfo.author.name}\n👁️ ${videoInfo.views?.toLocaleString() || 'N/A'} views\n\n📥 *Inapakua wimbo...*`;
            await sock.sendMessage(chatId, { text: infoMsg }, { quoted: message });
        }

        // Download and send audio
        await handleAudioDownload(sock, chatId, videoUrl, message, videoInfo);

    } catch (err) {
        console.error('[PLAY] Error:', err?.message || err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        sock.sendMessage(chatId, { text: '❌ *Hitilafu!* ' + (err.message || 'Jaribu tena baadae') });
    }
}

async function handleAudioDownload(sock, chatId, ytUrl, message, videoInfo = null) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        const data = await getYoutubeMp3(ytUrl);
        
        console.log(`[PLAY] Downloading from: ${data.source}`);
        
        // Get thumbnail image buffer (use videoInfo thumbnail or API thumbnail)
        let thumbnailBuffer = null;
        let title = data.title || videoInfo?.title || 'Audio';
        let channel = data.channel || videoInfo?.author?.name || 'Mickey Glitch';
        
        // Try to get thumbnail from videoInfo first
        if (videoInfo?.thumbnail) {
            thumbnailBuffer = await getImageBuffer(videoInfo.thumbnail);
        } else if (data.thumbnail) {
            thumbnailBuffer = await getImageBuffer(data.thumbnail);
        }
        
        // Prepare audio message with proper mimetype
        const audioMessage = {
            audio: { url: data.download },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title}.mp3`
        };
        
        // Add thumbnail as externalAdReply (this shows thumbnail on WhatsApp)
        if (thumbnailBuffer) {
            audioMessage.contextInfo = {
                externalAdReply: {
                    title: title.length > 50 ? title.substring(0, 47) + '...' : title,
                    body: channel,
                    thumbnail: thumbnailBuffer,
                    mediaType: 2, // Audio
                    mediaUrl: data.download,
                    sourceUrl: ytUrl,
                    renderLargerThumbnail: true
                }
            };
        } else {
            // Fallback without thumbnail but with basic info
            audioMessage.contextInfo = {
                externalAdReply: {
                    title: title.length > 50 ? title.substring(0, 47) + '...' : title,
                    body: channel,
                    mediaType: 2,
                    renderLargerThumbnail: false
                }
            };
        }
        
        // Send audio with thumbnail
        await sock.sendMessage(chatId, audioMessage, { quoted: message });
        
        // Success reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('[PLAY] Audio download error:', e);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        
        let errorMsg = "❌ *Download imefeli:* ";
        if (e.message.includes('No working API')) {
            errorMsg += "Hakuna API inayofanya kazi kwa sasa. Jaribu tena baadae.";
        } else if (e.message.includes('timeout')) {
            errorMsg += "Muda umekwisha. Jaribu tena.";
        } else {
            errorMsg += e.message || 'Jaribu tena baadae';
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

// Function to test APIs directly
async function testApis() {
    const testUrl = 'https://youtu.be/KW20_0cqtAI';
    console.log('Testing APIs with:', testUrl);
    
    try {
        const result = await getYoutubeMp3(testUrl);
        console.log('API Test Successful:', result);
        return result;
    } catch (err) {
        console.error('API Test Failed:', err.message);
        return null;
    }
}

module.exports = playCommand;
module.exports.handleAudioDownload = handleAudioDownload;
module.exports.getYoutubeMp3 = getYoutubeMp3;
module.exports.testApis = testApis;