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

// Get MP3 from YouTube using PrinceTech API (WORKING 100%)
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
    
    // PrinceTech API - WORKING!
    const apiUrl = `https://api.princetechn.com/api/download/yta?apikey=prince&url=https://youtu.be/${videoId}`;
    
    try {
        console.log(`[PLAY] Trying PrinceTech API: ${apiUrl}`);
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        
        if (res.data?.success === true && res.data?.result?.download_url) {
            const audioUrl = res.data.result.download_url;
            const title = res.data.result.title;
            const duration = res.data.result.duration;
            const quality = res.data.result.quality;
            const thumbnail = res.data.result.thumbnail;
            
            console.log(`[PLAY] PrinceTech API success: ${title} (${quality})`);
            return {
                download: audioUrl,
                title: title,
                duration: duration,
                quality: quality,
                thumbnail: thumbnail,
                source: 'PrinceTech'
            };
        } else {
            throw new Error('Invalid response from PrinceTech API');
        }
    } catch (err) {
        console.log(`[PLAY] PrinceTech API failed: ${err.message}`);
        throw new Error('PrinceTech API failed - No working API available');
    }
}

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const q = text.split(' ').slice(1).join(' ').trim();

        if (!q) {
            return sock.sendMessage(chatId, { 
                text: '🎵 *Unataka wimbo gani?*\n\n📝 Mfano: `.play Alan Walker Faded`' 
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
        } else {
            await sock.sendMessage(chatId, { text: `📥 *Inapakua wimbo kutoka link yako...*` }, { quoted: message });
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
        console.log(`[PLAY] Audio URL: ${data.download}`);
        console.log(`[PLAY] Quality: ${data.quality}, Duration: ${data.duration}`);
        
        // Use title from API or from search
        const title = data.title || videoInfo?.title || 'Audio';
        const duration = data.duration || videoInfo?.timestamp || 'Unknown';
        const author = videoInfo?.author?.name || 'YouTube';
        
        // Parse duration string (e.g., "3:33") to seconds
        let durationSeconds = 180; // default 3 minutes
        if (duration !== 'Unknown') {
            const parts = duration.split(':');
            if (parts.length === 2) {
                durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            } else if (parts.length === 3) {
                durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            }
        }
        
        // Send audio with proper configuration for WhatsApp
        const audioMessage = {
            audio: { url: data.download },
            mimetype: 'audio/mpeg',
            ptt: false,
            seconds: durationSeconds,
            caption: `🎵 *${title}*\n⏱️ ${duration} | 👤 ${author} | 📀 ${data.quality}`,
            fileName: `${title}.mp3`
        };
        
        // Send audio
        await sock.sendMessage(chatId, audioMessage, { quoted: message });
        
        // Success reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('[PLAY] Audio download error:', e);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        
        let errorMsg = "❌ *Download imefeli:* ";
        if (e.message.includes('PrinceTech API failed')) {
            errorMsg += "API haifanyi kazi kwa sasa. Jaribu tena baadae.";
        } else if (e.message.includes('timeout')) {
            errorMsg += "Muda umekwisha. Jaribu tena.";
        } else {
            errorMsg += e.message || 'Jaribu tena baadae';
        }
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

// Function to test API directly
async function testApi() {
    const testUrl = 'https://youtu.be/60ItHLz5WEA';
    console.log('Testing PrinceTech API with:', testUrl);
    
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
module.exports.testApi = testApi;