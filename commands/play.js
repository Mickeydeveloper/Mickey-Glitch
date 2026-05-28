const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

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

// Validate URL is accessible
async function validateUrl(url) {
    try {
        const response = await axios.head(url, {
            timeout: 10000,
            headers: AXIOS_DEFAULTS.headers
        });
        return response.status === 200;
    } catch (err) {
        console.log(`[PLAY] URL validation failed: ${err.message}`);
        return false;
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
            
            // Validate audio URL
            const isValid = await validateUrl(audioUrl);
            if (isValid) {
                console.log(`[PLAY] Nayan API success: ${title}`);
                return {
                    download: audioUrl,
                    title: title,
                    thumbnail: thumbnail,
                    channel: channel,
                    source: 'Nayan'
                };
            } else {
                console.log(`[PLAY] Nayan audio URL invalid, trying different format...`);
                // Try video_hd as alternative
                if (res.data.data.video_hd) {
                    const altUrl = res.data.data.video_hd;
                    const altValid = await validateUrl(altUrl);
                    if (altValid) {
                        return {
                            download: altUrl,
                            title: title,
                            thumbnail: thumbnail,
                            channel: channel,
                            source: 'Nayan'
                        };
                    }
                }
            }
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
            
            const isValid = await validateUrl(audioUrl);
            if (isValid) {
                console.log(`[PLAY] Aswin API success: ${title}`);
                return {
                    download: audioUrl,
                    title: title,
                    thumbnail: null,
                    channel: null,
                    source: 'Aswin Sparky'
                };
            }
        }
    } catch (err) {
        console.log(`[PLAY] Aswin API failed: ${err.message}`);
    }
    
    throw new Error('No working API available - Audio URL invalid');
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
            
            // Send song info message (short and clean)
            const infoMsg = `🎵 *${videoInfo.title}*\n⏱️ *Muda:* ${videoInfo.timestamp}\n👤 *Msanii:* ${videoInfo.author.name}\n👁️ *Views:* ${videoInfo.views?.toLocaleString() || 'N/A'}\n\n📥 *Inapakua wimbo...*`;
            
            await sock.sendMessage(chatId, { text: infoMsg }, { quoted: message });
        } else {
            // Direct URL - show downloading message
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
        // Change reaction to downloading
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        const data = await getYoutubeMp3(ytUrl);
        
        console.log(`[PLAY] Downloading from: ${data.source}`);
        console.log(`[PLAY] Audio URL: ${data.download}`);
        
        // Use proper mimetype for WhatsApp audio
        // WhatsApp accepts: audio/mpeg, audio/mp4, audio/aac, audio/ogg
        const audioMessage = {
            audio: { url: data.download },
            mimetype: 'audio/mpeg',  // Changed from audio/mp4 to audio/mpeg for better compatibility
            ptt: false,
            fileName: data.title ? `${data.title}.mp3` : (videoInfo?.title ? `${videoInfo.title}.mp3` : 'audio.mp3')
        };
        
        // Add context info with title (optional, not required)
        if (data.title || videoInfo?.title) {
            const title = (data.title || videoInfo?.title || 'Audio').substring(0, 50);
            audioMessage.contextInfo = {
                externalAdReply: {
                    title: title,
                    body: data.channel || videoInfo?.author?.name || 'Mickey Glitch Bot',
                    mediaType: 2, // Audio media type
                    renderLargerThumbnail: false
                }
            };
        }
        
        // Send audio
        await sock.sendMessage(chatId, audioMessage, { quoted: message });
        
        // Change reaction to success after sending
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('[PLAY] Audio download error:', e);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        
        let errorMsg = "❌ *Download imefeli:* ";
        if (e.message.includes('No working API')) {
            errorMsg += "Hakuna API inayofanya kazi kwa sasa. Jaribu tena baadae.";
        } else if (e.message.includes('timeout')) {
            errorMsg += "Muda umekwisha. Jaribu tena kwa wimbo mwingine.";
        } else if (e.message.includes('URL')) {
            errorMsg += "Link ya download haifanyi kazi. Jaribu wimbo mwingine.";
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