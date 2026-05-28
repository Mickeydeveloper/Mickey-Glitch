const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
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
    
    // API 2: Aswin Sparky Song Downloader
    const aswinApi = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=https://youtu.be/${videoId}`;
    
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
    
    // Try Aswin Sparky API
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
    
    // Fallback to old APIs
    const fallbackApis = [
        `https://apiskeith.top/download/audio?url=${encodeURIComponent(ytUrl)}`,
        `https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(ytUrl)}`,
        `https://apiskeith.top/download/ytv3?url=${encodeURIComponent(ytUrl)}`
    ];

    for (const api of fallbackApis) {
        try {
            console.log(`[PLAY] Trying fallback API: ${api}`);
            const res = await tryRequest(() => axios.get(api, AXIOS_DEFAULTS));
            
            let downloadUrl = null;
            let title = null;
            
            if (res.data?.status && res.data?.result) {
                if (typeof res.data.result === 'string') {
                    downloadUrl = res.data.result;
                } else if (typeof res.data.result === 'object' && res.data.result?.url) {
                    downloadUrl = res.data.result.url;
                    title = res.data.result.title;
                } else if (typeof res.data.result === 'object' && res.data.result?.download) {
                    downloadUrl = res.data.result.download;
                    title = res.data.result.title;
                }
            } else if (res.data?.url) {
                downloadUrl = res.data.url;
                title = res.data.title;
            } else if (res.data?.download) {
                downloadUrl = res.data.download;
                title = res.data.title;
            } else if (res.data?.audio) {
                downloadUrl = res.data.audio;
                title = res.data.title;
            }

            if (downloadUrl && typeof downloadUrl === 'string') {
                return {
                    download: downloadUrl,
                    title: title,
                    thumbnail: null,
                    channel: null,
                    source: 'Fallback'
                };
            }
        } catch (err) {
            console.log(`[PLAY] Fallback API ${api} failed, trying next...`);
            continue;
        }
    }
    
    throw new Error('All MP3 APIs failed - No working API available');
}

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const q = text.split(' ').slice(1).join(' ').trim();

        if (!q) {
            return sock.sendMessage(chatId, { 
                text: '🎵 *Unataka wimbo gani?*\n\n📝 Mfano: `.play Darude Sandstorm`\n🎧 Au tuma link ya YouTube: `.play https://youtu.be/...`' 
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
                return sock.sendMessage(chatId, { text: '❌ Sikuipata wimbo huo! Jaribu kutafuta kwa maneno mengine.' });
            }
            
            videoInfo = videos[0];
            videoUrl = videoInfo.url;
            
            // Send song info with thumbnail
            try {
                await sock.sendMessage(chatId, {
                    image: { url: videoInfo.thumbnail },
                    caption: `🎵 *${videoInfo.title}*\n⏱️ *Muda:* ${videoInfo.timestamp}\n👤 *Msanii:* ${videoInfo.author.name}\n👁️ *Views:* ${videoInfo.views?.toLocaleString() || 'N/A'}\n\n📥 *Inapakua wimbo...*`
                }, { quoted: message });
            } catch (thumbErr) {
                console.log('[PLAY] Thumbnail send failed, continuing...');
                await sock.sendMessage(chatId, { 
                    text: `🎵 *${videoInfo.title}*\n⏱️ *Muda:* ${videoInfo.timestamp}\n👤 *Msanii:* ${videoInfo.author.name}\n\n📥 *Inapakua wimbo...*`
                }, { quoted: message });
            }
        } else {
            // Direct YouTube URL
            await sock.sendMessage(chatId, { 
                text: `📥 *Inapakua wimbo kutoka link yako...*` 
            }, { quoted: message });
        }

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
        
        // Prepare audio message
        const audioMessage = {
            audio: { url: data.download },
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: data.title ? `${data.title}.mp3` : (videoInfo?.title ? `${videoInfo.title}.mp3` : 'audio.mp3')
        };
        
        // Add context info if available
        if (data.title || videoInfo?.title) {
            const title = data.title || videoInfo?.title;
            const channel = data.channel || videoInfo?.author?.name;
            
            audioMessage.contextInfo = {
                externalAdReply: {
                    title: title.length > 50 ? title.substring(0, 47) + '...' : title,
                    body: channel ? `🎵 ${channel}` : 'Mickey Glitch Bot',
                    thumbnailUrl: data.thumbnail || videoInfo?.thumbnail,
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            };
        }

        await sock.sendMessage(chatId, audioMessage, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        
        // Send success message with source
        const successMsg = data.source === 'Nayan' ? 
            '✅ *Wimbo umetumwa!*\n🎵 Imedownload kutoka Nayan API' :
            (data.source === 'Aswin Sparky' ? 
            '✅ *Wimbo umetumwa!*\n🎵 Imedownload kutoka Aswin Sparky API' :
            '✅ *Wimbo umetumwa!*');
        
        await sock.sendMessage(chatId, { text: successMsg }, { quoted: message });

    } catch (e) {
        console.error('[PLAY] Audio download error:', e);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        
        let errorMsg = "❌ *Download imefeli:* ";
        if (e.message.includes('All MP3 APIs failed')) {
            errorMsg += "Hakuna API inayofanya kazi kwa sasa. Jaribu tena baadae.";
        } else if (e.message.includes('timeout')) {
            errorMsg += "Muda umekwisha. Jaribu tena kwa wimbo mwingine.";
        } else {
            errorMsg += e.message || 'API haipatikani kwa sasa';
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