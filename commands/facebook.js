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

        const apiUrl = `https://apiskeith.vercel.app/download/fbdown?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { 
            timeout: 20000, 
            headers: { 'User-Agent': 'Mozilla/5.0' }, 
            validateStatus: s => s >= 200 && s < 500 
        });
        const data = res.data || {};

        // Extract candidates with priority: HD first, then SD, then others
        let fbvid = null;
        let quality = 'Unknown';

        // Priority 1: HD from this API's structure
        if (data.result?.media?.hd && typeof data.result.media.hd === 'string' && data.result.media.hd.startsWith('http')) {
            fbvid = data.result.media.hd;
            quality = 'HD';
        }
        // Priority 2: Fallback to SD if HD not available/good
        else if (data.result?.media?.sd && typeof data.result.media.sd === 'string' && data.result.media.sd.startsWith('http')) {
            fbvid = data.result.media.sd;
            quality = 'SD';
        }

        // Optional: Add more candidates if needed for future API changes
        if (!fbvid) {
            const extraCandidates = [
                data.result?.media?.video_hd,
                data.result?.media?.video_sd,
                data.result?.url,
                data.result?.download,
                data.result?.video,
                data.hd,
                data.sd,
                data.video,
                data.url,
                data.download,
                data.data?.url
            ].filter(u => typeof u === 'string' && u.startsWith('http'));

            if (extraCandidates.length > 0) {
                fbvid = extraCandidates[0];
                quality = 'Fallback';
            }
        }

        const title = data.result?.title || data.title || 'Facebook Video';

        if (!fbvid) {
            return await sock.sendMessage(chatId, { text: '❌ Could not find a downloadable video URL. Try another link.' }, { quoted: message });
        }

        // Optional: Add quality to caption
        const caption = title ? `📝 \( {title} ( \){quality})` : `(${quality})`;

        // Try to send by remote URL first (faster, no disk usage)
        try {
            await sock.sendMessage(chatId, { 
                video: { url: fbvid }, 
                mimetype: 'video/mp4', 
                caption 
            }, { quoted: message });
            return;
        } catch (err) {
            console.error('Sending by URL failed, falling back to download:', err.message);
        }

        // Fallback: download to temp file and send
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
            throw new Error('Downloaded file is empty');
        }

        await sock.sendMessage(chatId, { 
            video: { url: tempFile }, 
            mimetype: 'video/mp4', 
            caption 
        }, { quoted: message });

        // Cleanup
        try { fs.unlinkSync(tempFile); } catch (e) { console.error('Temp cleanup failed', e.message); }

    } catch (error) {
        console.error('Facebook command error:', error);
        await sock.sendMessage(chatId, { text: 'An error occurred while processing the Facebook link.' }, { quoted: message });
    }
}

module.exports = facebookCommand;