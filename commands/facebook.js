const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        let url = text.split(' ').slice(1).join(' ').trim();

        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide a Facebook video URL. Example: .fb https://www.facebook.com/...' }, { quoted: message });
        }

        if (!url.includes('facebook.com')) {
            return await sock.sendMessage(chatId, { text: 'That is not a Facebook link.' }, { quoted: message });
        }

        // Optional: Normalize short share links to reel format (helps some APIs)
        if (url.includes('/share/r/')) {
            const idMatch = url.match(/\/share\/r\/([a-zA-Z0-9]+)/);
            if (idMatch && idMatch[1]) {
                url = `https://www.facebook.com/reel/${idMatch[1]}`;
            }
        }

        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const apiUrl = `https://api.vreden.my.id/api/v1/download/facebook?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { 
            timeout: 25000, 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, 
            validateStatus: s => s < 500 
        });
        const data = res.data || {};

        let fbvid = null;
        let quality = 'Unknown';
        let apiErrorMsg = data.message || data.error || null;

        if (data.status === true) {
            // Priority: HD
            if (data.result?.download?.hd && typeof data.result.download.hd === 'string' && data.result.download.hd.startsWith('http')) {
                fbvid = data.result.download.hd;
                quality = 'HD';
            }
            // Fallback: SD
            else if (data.result?.download?.sd && typeof data.result.download.sd === 'string' && data.result.download.sd.startsWith('http')) {
                fbvid = data.result.download.sd;
                quality = 'SD';
            }
        }

        // Extra fallback: Scan for any direct .mp4 URL in the entire response (rare safety net)
        if (!fbvid) {
            const jsonStr = JSON.stringify(data);
            const mp4Matches = jsonStr.match(/"(https?:\/\/[^"]+\.mp4[^"]*)"/gi);
            if (mp4Matches && mp4Matches.length > 0) {
                fbvid = mp4Matches[0].replace(/"/g, ''); // remove quotes
                quality = 'Extracted';
            }
        }

        const title = data.result?.title || data.title || 'Facebook Video';

        if (!fbvid) {
            let errText = '❌ Could not find a downloadable video URL.';
            if (apiErrorMsg) {
                errText += `\nAPI says: ${apiErrorMsg}`;
            } else if (data.status === false) {
                errText += '\nVideo may be private, restricted, or not supported by the downloader.';
            }
            errText += '\nTry another public video/link.';
            return await sock.sendMessage(chatId, { text: errText }, { quoted: message });
        }

        // Caption with quality
        const caption = title ? `📝 \( {title} ( \){quality})` : `Facebook Video (${quality})`;

        // Attempt 1: Send directly via URL (fastest)
        try {
            await sock.sendMessage(chatId, { 
                video: { url: fbvid }, 
                mimetype: 'video/mp4', 
                caption 
            }, { quoted: message });
            return;
        } catch (sendErr) {
            console.error('Direct URL send failed:', sendErr.message);
        }

        // Fallback: Download locally and send
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tempFile = path.join(tmpDir, `fb_${Date.now()}.mp4`);

        const videoResp = await axios.get(fbvid, { 
            responseType: 'stream', 
            timeout: 90000,  // longer for big videos
            headers: { 
                'User-Agent': 'Mozilla/5.0', 
                'Referer': 'https://www.facebook.com/' 
            } 
        });

        const writer = fs.createWriteStream(tempFile);
        videoResp.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size < 1000) {
            throw new Error('Downloaded file invalid or empty');
        }

        await sock.sendMessage(chatId, { 
            video: { url: tempFile }, 
            mimetype: 'video/mp4', 
            caption 
        }, { quoted: message });

        // Cleanup
        try { fs.unlinkSync(tempFile); } catch (e) { console.error('Cleanup failed:', e.message); }

    } catch (error) {
        console.error('Facebook downloader error:', error.message);
        await sock.sendMessage(chatId, { 
            text: 'An error occurred processing the link. The video might be private or the downloader is temporarily down. Try a different public video.' 
        }, { quoted: message });
    }
}

module.exports = facebookCommand;