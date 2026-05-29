const axios = require('axios');
const yts = require('yt-search');
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');

let ffmpeg = null;
let ffmpegLoading = false;

async function getFFmpeg() {
    if (ffmpeg) return ffmpeg;
    if (ffmpegLoading) {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (ffmpeg) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
        return ffmpeg;
    }
    
    ffmpegLoading = true;
    try {
        ffmpeg = createFFmpeg({ log: false });
        console.log('[FFMPEG] Loading...');
        await ffmpeg.load();
        console.log('[FFMPEG] Ready!');
    } catch (err) {
        console.error('[FFMPEG] Error:', err);
        throw err;
    } finally {
        ffmpegLoading = false;
    }
    return ffmpeg;
}

async function convertToAudio(buffer, ext = 'mp4') {
    try {
        const ff = await getFFmpeg();
        const inputFile = `input.${ext}`;
        const outputFile = `output.mp3`;
        
        ff.FS('writeFile', inputFile, buffer);
        
        await ff.run('-i', inputFile, '-vn', '-ac', '2', '-b:a', '96k', '-ar', '22050', '-f', 'mp3', outputFile);
        
        const outputData = ff.FS('readFile', outputFile);
        
        ff.FS('unlink', inputFile);
        ff.FS('unlink', outputFile);
        
        return Buffer.from(outputData);
    } catch (error) {
        console.error('[FFMPEG] Error:', error);
        throw new Error('Conversion failed');
    }
}

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

async function getYoutubeAudio(ytUrl) {
    let videoId = '';
    if (ytUrl.includes('youtu.be/')) {
        videoId = ytUrl.split('youtu.be/')[1].split('?')[0];
    } else if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        videoId = urlParams.get('v');
    }

    if (!videoId) throw new Error('Invalid URL');

    const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;

    try {
        console.log(`[PLAY] Fetching: ${apiUrl}`);
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data) {
            const videoData = res.data.data;
            let videoUrl = videoData.high || videoData.low;
            
            if (!videoUrl) throw new Error('No video URL');
            
            console.log(`[PLAY] Download: ${videoData.title}`);
            
            const videoResponse = await tryRequest(() => axios.get(videoUrl, {
                ...AXIOS_DEFAULTS,
                responseType: 'arraybuffer'
            }));
            
            const videoBuffer = Buffer.from(videoResponse.data);
            console.log(`[PLAY] Video: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
            
            // If video is too large, return error
            if (videoBuffer.length > 50 * 1024 * 1024) {
                throw new Error('Video too large (max 50MB)');
            }
            
            const audioBuffer = await convertToAudio(videoBuffer, 'mp4');
            console.log(`[PLAY] Audio: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);
            
            let durationSeconds = 180;
            if (videoData.duration) {
                durationSeconds = parseInt(videoData.duration);
            }
            
            return {
                buffer: audioBuffer,
                title: videoData.title,
                duration: durationSeconds,
                quality: 'MP3'
            };
        } else {
            throw new Error('API failed');
        }
    } catch (err) {
        console.error(`[PLAY] Error:`, err.message);
        throw new Error(err.message);
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

        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            const searchResults = await yts(query);
            const videos = searchResults?.videos;
            
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { text: '❌ Song not found' });
            }

            videoInfo = videos[0];
            videoUrl = videoInfo.url;

            const infoMsg = `🎵 *${videoInfo.title}*\n⏱️ ${videoInfo.timestamp} | 👤 ${videoInfo.author.name}\n👁️ ${(videoInfo.views || 0).toLocaleString()} views\n\n⬇️ Processing...`;
            await sock.sendMessage(chatId, { text: infoMsg });
        } else {
            await sock.sendMessage(chatId, { text: '⬇️ Downloading & converting...' });
        }

        const processMsg = await sock.sendMessage(chatId, { 
            text: '⏳ *Processing...*\n▰▰▰▰▰▰▰▰▰▰ 0%' 
        });

        const audioData = await getYoutubeAudio(videoUrl);

        const minutes = Math.floor(audioData.duration / 60);
        const seconds = audioData.duration % 60;
        const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const audioMessage = {
            audio: audioData.buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            seconds: audioData.duration,
            caption: `🎵 *${audioData.title.substring(0, 50)}*\n⏱️ ${durationText}\n🎚️ ${audioData.quality}`,
            fileName: `${audioData.title.substring(0, 40)}.mp3`
        };

        await sock.sendMessage(chatId, audioMessage);
        await sock.sendMessage(chatId, { delete: processMsg.key });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        
        let errorMsg = '❌ *Error:* ';
        if (err.message.includes('too large')) {
            errorMsg += 'Video too large (max 50MB)';
        } else if (err.message.includes('timeout')) {
            errorMsg += 'Timeout, try again';
        } else {
            errorMsg += 'Try again later';
        }
        
        await sock.sendMessage(chatId, { text: errorMsg });
    }
}

module.exports = playCommand;