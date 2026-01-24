const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url) {
            return await sock.sendMessage(chatId, { text: 'Please provide a Facebook video URL. Example: .fb https://www.facebook.com/...' }, { quoted: message });
        }

        if (!url.includes('facebook.com')) {
            return await sock.sendMessage(chatId, { text: 'That is not a Facebook link.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        // New API as requested
        const apiUrl = `https://api.vreden.my.id/api/v1/download/facebook?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { 
            timeout: 20000, 
            headers: { 'User-Agent': 'Mozilla/5.0' }, 
            validateStatus: s => s >= 200 && s < 500 
        });
        const data = res.data || {};

        // Extract video URL with HD priority → SD fallback
        let fbvid = null;
        let quality = 'Unknown';

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

        // Extra fallback: any other potential URL in response
        if (!fbvid) {
            const extra = [
                data.result?.download?.normal,
                data.result?.url,
                data.video,
                data.url,
                data.download
            ].find(u => typeof u === 'string' && u.startsWith('http'));

            if (extra) {
                fbvid = extra;
                quality = 'Default';
            }
        }

        const title = data.result?.title || data.title || 'Facebook Video';

        if (!fbvid) {
            return await sock.sendMessage(chatId, { text: '❌ Could not find a downloadable video URL. Try another link or check if the video is public.' }, { quoted: message });
        }

        // Caption with quality info
        const caption = title ? `📝 \( {title} ( \){quality})` : `Facebook Video (${quality})`;

        // Try sending directly via URL (faster, no disk I/O)
        try {
            await sock.sendMessage(chatId, { 
                video: { url: fbvid }, 
                mimetype: 'video/mp4', 
                caption 
            }, { quoted: message });
            return;
        } catch (err) {
            console.error('Remote send failed, falling back to local download:', err.message);
        }

        // Fallback: Download to temp file
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tempFile = path.join(tmpDir, `fb_${Date.now()}.mp4`);

        const videoResp = await axios.get(fbvid, { 
            responseType: 'stream', 
            timeout: 60000, 
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

        if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
            throw new Error('Downloaded file is empty or failed');
        }

        await sock.sendMessage(chatId, { 
            video: { url: tempFile }, 
            mimetype: 'video/mp4', 
            caption 
        }, { quoted: message });

        // Cleanup temp file
        try { fs.unlinkSync(tempFile); } catch (e) { console.error('Temp file cleanup failed:', e.message); }

    } catch (error) {
        console.error('Facebook command error:', error.message);
        await sock.sendMessage(chatId, { text: 'An error occurred while processing the Facebook link. Try again or use a different video.' }, { quoted: message });
    }
}

module.exports = facebookCommand;