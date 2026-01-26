const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function facebookCommand(sock, chatId, message) {
    try {
        // Extract URL from quoted or command args
        let text = '';
        if (message.message?.conversation) text = message.message.conversation;
        else if (message.message?.extendedTextMessage?.text) text = message.message.extendedTextMessage.text;

        let url = text.split(' ').slice(1).join(' ').trim();

        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: '📹 *Facebook Video Downloader*\n\nUsage: .fb <link>\nExample: .fb https://www.facebook.com/share/r/16sXMhKi6e/' 
            }, { quoted: message });
        }

        // Basic validation + normalize common short/reel/share links
        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide a valid Facebook video/reel link.' }, { quoted: message });
        }

        // Normalize share/r/ links → reel format (helps some APIs)
        if (url.includes('/share/r/') || url.includes('/reel/') || url.includes('fb.watch')) {
            const idMatch = url.match(/\/(share\/r|reel)\/([a-zA-Z0-9]+)/) || url.match(/fb\.watch\/([a-zA-Z0-9]+)/);
            if (idMatch && idMatch[2] || idMatch[1]) {
                const reelId = idMatch[2] || idMatch[1];
                url = `https://www.facebook.com/reel/${reelId}`;
            }
        }

        await sock.sendMessage(chatId, { 
            react: { text: '⏳', key: message.key } 
        });

        const apiUrl = `https://api.vreden.my.id/api/v1/download/facebook?url=${encodeURIComponent(url)}`;

        const apiRes = await axios.get(apiUrl, {
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            validateStatus: status => status < 500
        });

        const data = apiRes.data || {};

        if (!data.status || data.status !== true) {
            let errMsg = data.message || data.error || 'API returned unsuccessful status';
            if (errMsg.includes('private') || errMsg.includes('restricted')) {
                errMsg = 'Video is private, restricted, or requires login. Only public videos are supported.';
            }
            return await sock.sendMessage(chatId, { 
                text: `❌ Download failed\nReason: ${errMsg}\n\nTry a public video or another link.` 
            }, { quoted: message });
        }

        let videoUrl = null;
        let quality = 'Unknown';

        // Prefer HD > SD
        if (data.result?.download?.hd?.startsWith('http')) {
            videoUrl = data.result.download.hd;
            quality = 'HD';
        } else if (data.result?.download?.sd?.startsWith('http')) {
            videoUrl = data.result.download.sd;
            quality = 'SD';
        }

        // Ultimate fallback: any mp4 in response (rare)
        if (!videoUrl) {
            const jsonText = JSON.stringify(data);
            const mp4Match = jsonText.match(/"(https?:\/\/[^"]+\.mp4[^"]*)"/i);
            if (mp4Match && mp4Match[1]) {
                videoUrl = mp4Match[1];
                quality = 'Fallback';
            }
        }

        const title = data.result?.title || 'Facebook Video';
        const caption = `${title ? `📝 ${title}\n` : ''}Quality: ${quality}\nDownloaded via Mickey Glitch™`;

        if (!videoUrl) {
            return await sock.sendMessage(chatId, { 
                text: '❌ No valid video URL found in API response.\nVideo may be unsupported (live, story, very new, etc.).' 
            }, { quoted: message });
        }

        // Try direct remote send (fast, no disk usage)
        try {
            await sock.sendMessage(chatId, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption,
                fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_') || 'fb_video'}.mp4`
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            return;
        } catch (directErr) {
            console.warn('[FB] Direct send failed:', directErr.message);
            // Continue to local download fallback
        }

        // Fallback: Download to temp & send
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const tempPath = path.join(tmpDir, `fb_${Date.now()}.mp4`);

        const videoStream = await axios.get(videoUrl, {
            responseType: 'stream',
            timeout: 120000, // 2 min timeout for large videos
            headers: { 
                'User-Agent': 'Mozilla/5.0', 
                'Referer': 'https://www.facebook.com/' 
            }
        });

        const writer = fs.createWriteStream(tempPath);
        videoStream.data.pipe(writer);

        await new Promise((res, rej) => {
            writer.on('finish', res);
            writer.on('error', rej);
        });

        if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size < 5000) {
            throw new Error('Downloaded file is empty or corrupted');
        }

        await sock.sendMessage(chatId, { 
            video: { url: tempPath }, 
            mimetype: 'video/mp4', 
            caption,
            fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_') || 'fb_video'}.mp4`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

        // Cleanup
        setTimeout(() => {
            try { fs.unlinkSync(tempPath); } catch {}
        }, 10000);

    } catch (err) {
        console.error('[FB Downloader] Error:', err.message, err.stack?.slice(0, 200));
        let reply = '❌ An error occurred while processing the Facebook link.\n';
        if (err.code === 'ECONNABORTED') reply += 'Request timed out (slow API or large video).';
        else if (err.response?.status === 429) reply += 'API rate limit — try again in a few minutes.';
        else reply += 'The video might be private, restricted, or the downloader is temporarily unavailable.';
        
        await sock.sendMessage(chatId, { text: reply + '\nTry a different public video.' }, { quoted: message });
    }
}

module.exports = facebookCommand;