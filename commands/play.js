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

// Get best audio format from YouTube using Nayan API (PRIORITY)
async function getYoutubeMp3FromNayan(ytUrl) {
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

    // Nayan API (from your JSON)
    const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;

    try {
        console.log(`[PLAY] Trying Nayan API (Primary): ${apiUrl}`);
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const videoTitle = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;
            const author = res.data.data.data.author;
            
            // Priotize audio formats (opus or m4a)
            let bestAudio = null;
            let bestQuality = 0;
            
            // Audio quality priority: opus (251 > 249) then m4a (140 > 139)
            const audioPriority = {
                '251': 100, // opus best
                '250': 90,  // opus medium
                '249': 85,  // opus low
                '140': 80,  // m4a medium
                '139': 70   // m4a low
            };
            
            for (const format of formats) {
                if (format.type === 'audio' || (format.mimeType && format.mimeType.includes('audio'))) {
                    // Check mimeType explicitly
                    if (format.mimeType && (
                        format.mimeType.includes('audio/mp4') || 
                        format.mimeType.includes('audio/webm') ||
                        format.mimeType.includes('opus')
                    )) {
                        const priority = audioPriority[format.formatId] || 50;
                        if (priority > bestQuality) {
                            bestQuality = priority;
                            bestAudio = format;
                        }
                    }
                }
            }
            
            // Also check for video_with_audio formats if no pure audio found
            if (!bestAudio) {
                for (const format of formats) {
                    if (format.type === 'video_with_audio' && format.mimeType && format.mimeType.includes('mp4')) {
                        if (bestQuality < 60) {
                            bestQuality = 60;
                            bestAudio = format;
                        }
                    }
                }
            }
            
            if (bestAudio && bestAudio.url) {
                const quality = bestAudio.quality || bestAudio.label || 'audio';
                const bitrate = bestAudio.bitrate ? `${Math.round(bestAudio.bitrate / 1000)}kbps` : 'Unknown';
                const mimeType = bestAudio.mimeType || 'audio/mpeg';
                
                console.log(`[PLAY] Nayan API success: ${videoTitle}`);
                console.log(`[PLAY] Selected audio format: ${quality} (${bitrate}) - ${mimeType}`);
                
                return {
                    download: bestAudio.url,
                    title: videoTitle,
                    duration: bestAudio.duration || res.data.data.data.duration || 'Unknown',
                    quality: quality,
                    bitrate: bitrate,
                    thumbnail: thumbnail,
                    author: author,
                    mimeType: mimeType,
                    source: 'NayanAPI'
                };
            } else {
                throw new Error('No audio format found in Nayan API response');
            }
        } else {
            throw new Error('Invalid response from Nayan API');
        }
    } catch (err) {
        console.log(`[PLAY] Nayan API failed: ${err.message}`);
        throw err;
    }
}

// Fallback to PrinceTech API if Nayan fails
async function getYoutubeMp3FromPrinceTech(ytUrl) {
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

    // PrinceTech API - FALLBACK
    const apiUrl = `https://api.princetechn.com/api/download/yta?apikey=prince&url=https://youtu.be/${videoId}`;

    try {
        console.log(`[PLAY] Trying PrinceTech API (Fallback): ${apiUrl}`);
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
        throw new Error('All download APIs failed');
    }
}

// Main function with priority: Nayan API first, then PrinceTech
async function getYoutubeMp3(ytUrl) {
    try {
        // Try Nayan API first (from your JSON)
        return await getYoutubeMp3FromNayan(ytUrl);
    } catch (nayanError) {
        console.log(`[PLAY] Nayan API failed, trying fallback...`);
        // Fallback to PrinceTech API
        try {
            return await getYoutubeMp3FromPrinceTech(ytUrl);
        } catch (princeError) {
            throw new Error('No working API available');
        }
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
        console.log(`[PLAY] MimeType: ${data.mimeType || 'audio/mpeg'}`);

        // Use title from API or from search
        const title = data.title || videoInfo?.title || 'Audio';
        const duration = data.duration || videoInfo?.timestamp || 'Unknown';
        const author = data.author || videoInfo?.author?.name || 'YouTube';
        const qualityText = data.bitrate ? `${data.quality} (${data.bitrate})` : data.quality;

        // Parse duration string (e.g., "3:33") to seconds
        let durationSeconds = 180; // default 3 minutes
        if (duration !== 'Unknown') {
            const parts = duration.toString().split(':');
            if (parts.length === 2) {
                durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            } else if (parts.length === 3) {
                durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            }
        }

        // Determine mimetype based on format
        let mimeType = 'audio/mpeg'; // default
        if (data.mimeType) {
            mimeType = data.mimeType.split(';')[0]; // Remove codecs part
        } else if (data.download.includes('.opus')) {
            mimeType = 'audio/opus';
        } else if (data.download.includes('.m4a')) {
            mimeType = 'audio/mp4';
        }

        // Send audio with proper configuration for WhatsApp
        const audioMessage = {
            audio: { url: data.download },
            mimetype: mimeType,
            ptt: false,
            seconds: durationSeconds,
            caption: `🎵 *${title}*\n⏱️ ${duration} | 👤 ${author} | 📀 ${qualityText}\n📡 ${data.source}`,
            fileName: `${title}.${mimeType.includes('opus') ? 'opus' : (mimeType.includes('mp4') ? 'm4a' : 'mp3')}`
        };

        // Send audio
        await sock.sendMessage(chatId, audioMessage, { quoted: message });

        // Success reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('[PLAY] Audio download error:', e);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });

        let errorMsg = "❌ *Download imefeli:* ";
        if (e.message.includes('Nayan API failed')) {
            errorMsg += "API ya Nayan haifanyi kazi. Jaribu tena baadae.";
        } else if (e.message.includes('PrinceTech API failed')) {
            errorMsg += "API haifanyi kazi kwa sasa. Jaribu tena baadae.";
        } else if (e.message.includes('timeout')) {
            errorMsg += "Muda umekwisha. Jaribu tena.";
        } else {
            errorMsg += e.message || 'Jaribu tena baadae';
        }

        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

// Function to test Nayan API directly
async function testNayanApi() {
    const testUrl = 'https://youtu.be/AhLaR-s8QMg';
    console.log('Testing Nayan API with:', testUrl);

    try {
        const result = await getYoutubeMp3FromNayan(testUrl);
        console.log('✅ Nayan API Test Successful:', result);
        console.log('Audio Format Details:', {
            quality: result.quality,
            bitrate: result.bitrate,
            mimeType: result.mimeType,
            source: result.source
        });
        return result;
    } catch (err) {
        console.error('❌ Nayan API Test Failed:', err.message);
        return null;
    }
}

module.exports = playCommand;
module.exports.handleAudioDownload = handleAudioDownload;
module.exports.getYoutubeMp3 = getYoutubeMp3;
module.exports.getYoutubeMp3FromNayan = getYoutubeMp3FromNayan;
module.exports.getYoutubeMp3FromPrinceTech = getYoutubeMp3FromPrinceTech;
module.exports.testNayanApi = testNayanApi;