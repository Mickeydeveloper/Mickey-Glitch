const axios = require('axios');
const yts = require('yt-search');
const { toAudio } = require('./lib/converter');  // ← Converter mpya
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

// Download video from Nayan AllDown API and convert to audio
async function getYoutubeAudioFromNayan(ytUrl) {
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

    // Nayan AllDown API
    const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;

    try {
        console.log(`[PLAY] Trying Nayan AllDown API: ${apiUrl}`);
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data) {
            const videoData = res.data.data;
            const title = videoData.title;
            const thumbnail = videoData.thumbnail;
            
            // Get best quality video URL (high quality preferred)
            let videoUrl = videoData.high || videoData.low;
            
            if (!videoUrl) {
                throw new Error('No video URL found in API response');
            }

            console.log(`[PLAY] Downloading video: ${title}`);
            console.log(`[PLAY] Video URL: ${videoUrl}`);
            
            // Download video as buffer
            const videoResponse = await tryRequest(() => axios.get(videoUrl, {
                ...AXIOS_DEFAULTS,
                responseType: 'arraybuffer'
            }));
            
            const videoBuffer = Buffer.from(videoResponse.data);
            console.log(`[PLAY] Video downloaded: ${videoBuffer.length} bytes`);
            
            // Convert video to audio using FFmpeg.wasm
            console.log(`[PLAY] Converting video to audio using FFmpeg.wasm...`);
            const audioBuffer = await toAudio(videoBuffer, 'mp4');
            
            console.log(`[PLAY] Conversion complete: ${audioBuffer.length} bytes`);
            
            // Try to get duration from the API response
            let durationSeconds = 180; // default 3 minutes
            
            // If duration is in the response
            if (videoData.duration) {
                durationSeconds = parseInt(videoData.duration);
            }
            
            return {
                buffer: audioBuffer,
                title: title,
                duration: durationSeconds,
                quality: '128kbps MP3 (FFmpeg.wasm)',
                thumbnail: thumbnail,
                source: 'Nayan AllDown + FFmpeg.wasm',
                mimeType: 'audio/mpeg'
            };
        } else {
            throw new Error('Invalid response from Nayan AllDown API');
        }
    } catch (err) {
        console.log(`[PLAY] Nayan AllDown API failed: ${err.message}`);
        throw err;
    }
}

// Main function - only uses Nayan AllDown API
async function getYoutubeMp3(ytUrl) {
    try {
        return await getYoutubeAudioFromNayan(ytUrl);
    } catch (error) {
        throw new Error(`Failed to get audio: ${error.message}`);
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
            const infoMsg = `🎵 *${videoInfo.title}*\n⏱️ *${videoInfo.timestamp}* | 👤 ${videoInfo.author.name}\n👁️ ${videoInfo.views?.toLocaleString() || 'N/A'} views\n\n📥 *Inapakua na kubadilisha video kuwa audio...*`;
            await sock.sendMessage(chatId, { text: infoMsg }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: `📥 *Inapakua video na kubadilisha kuwa audio kutoka link yako...*` }, { quoted: message });
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

        // Show processing message
        const processMsg = await sock.sendMessage(chatId, { 
            text: '🔄 *Inashughulikia...*\n📥 Kupakua video\n🎵 Kubadilisha kuwa audio (FFmpeg.wasm)\n⏳ Tafadhali subiri...' 
        });

        const data = await getYoutubeMp3(ytUrl);

        console.log(`[PLAY] Source: ${data.source}`);
        console.log(`[PLAY] Audio buffer size: ${data.buffer.length} bytes`);
        console.log(`[PLAY] Quality: ${data.quality}, Duration: ${data.duration}s`);

        // Use title from API or from search
        const title = data.title || videoInfo?.title || 'Audio';
        const author = videoInfo?.author?.name || 'YouTube';

        // Format duration for display
        const minutes = Math.floor(data.duration / 60);
        const seconds = data.duration % 60;
        const durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Send audio with proper configuration for WhatsApp
        const audioMessage = {
            audio: data.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            seconds: data.duration,
            caption: `🎵 *${title.substring(0, 60)}*\n⏱️ ${durationDisplay} | 👤 ${author}\n🎚️ ${data.quality}\n📡 ${data.source}`,
            fileName: `${title.substring(0, 50)}.mp3`
        };

        // Send audio
        await sock.sendMessage(chatId, audioMessage, { quoted: message });

        // Delete processing message
        await sock.sendMessage(chatId, { delete: processMsg.key });

        // Success reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('[PLAY] Audio download error:', e);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });

        let errorMsg = "❌ *Download imefeli:* ";
        if (e.message.includes('Nayan AllDown API failed')) {
            errorMsg += "API haifanyi kazi kwa sasa. Jaribu tena baadae.";
        } else if (e.message.includes('timeout')) {
            errorMsg += "Muda umekwisha. Jaribu tena.";
        } else if (e.message.includes('FFmpeg')) {
            errorMsg += "Hitilafu katika kubadilisha video kuwa audio. Jaribu tena.";
        } else {
            errorMsg += e.message || 'Jaribu tena baadae';
        }

        await sock.sendMessage(chatId, { text: errorMsg });
    }
}

// Function to test Nayan AllDown API
async function testNayanApi() {
    const testUrl = 'https://youtu.be/AhLaR-s8QMg';
    console.log('Testing Nayan AllDown API with:', testUrl);

    try {
        const result = await getYoutubeAudioFromNayan(testUrl);
        console.log('✅ Nayan AllDown API Test Successful:');
        console.log('Title:', result.title);
        console.log('Duration:', result.duration, 'seconds');
        console.log('Quality:', result.quality);
        console.log('Buffer size:', result.buffer.length, 'bytes');
        console.log('Source:', result.source);
        return result;
    } catch (err) {
        console.error('❌ Nayan AllDown API Test Failed:', err.message);
        return null;
    }
}

module.exports = playCommand;
module.exports.handleAudioDownload = handleAudioDownload;
module.exports.getYoutubeMp3 = getYoutubeMp3;
module.exports.getYoutubeAudioFromNayan = getYoutubeAudioFromNayan;
module.exports.testNayanApi = testNayanApi;