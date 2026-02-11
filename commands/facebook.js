const axios = require('axios');

/**
 * Try Hansa API for Facebook downloads
 */
async function tryHansaAPI(url) {
    try {
        const apiUrl = `https://api.srihub.store/download/facebook?url=${encodeURIComponent(url)}&apikey=dew_DVTcyMksTDO8ZGxBvLAG0y9P8sIj6uRJXHHwWSW5`;
        const res = await axios.get(apiUrl, { timeout: 25000 });
        const data = res.data;
        
        console.log('[FB Hansa API Response]', JSON.stringify(data, null, 2));
        
        if (!data.success || !data.result) {
            throw new Error('Hansa: No result in response');
        }
        
        const videoList = data.result.result;
        if (!Array.isArray(videoList) || videoList.length === 0) {
            throw new Error('Hansa: No video options found');
        }
        
        // Prioritize 720p HD, else take first available
        let selectedVideo = videoList.find(v => v.quality.includes('720') || v.quality.includes('HD'));
        if (!selectedVideo) {
            selectedVideo = videoList[0];
        }
        
        return {
            videoUrl: selectedVideo.url,
            title: data.result.title || "Facebook Video",
            thumbnail: data.result.thumbnail,
            quality: selectedVideo.quality
        };
    } catch (error) {
        console.error('[FB Hansa Error]', error.message);
        throw error;
    }
}

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('facebook.com')) {
            return await sock.sendMessage(chatId, { text: '❌ Weka link ya Facebook. Mfano: .fb https://fb.watch/xyz' }, { quoted: message });
        }

        // React kuonyesha bot inafanyia kazi link
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        
        let videoData;
        
        // Try ASWIN SPARKY API first
        try {
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 25000 });
            const data = res.data;
            
            console.log('[FB ASWIN API Response]', JSON.stringify(data, null, 2));

            if (!data.status || !data.data) {
                throw new Error('ASWIN: No status or data in response');
            }
            
            if (!data.data.high && !data.data.low) {
                throw new Error('ASWIN: No video URLs found');
            }
            
            videoData = {
                videoUrl: data.data.high || data.data.low,
                title: data.data.title || "Facebook Video",
                thumbnail: data.data.thumbnail
            };
        } catch (aswinError) {
            console.error('[FB ASWIN Error]', aswinError.message);
            
            // Fallback to Hansa API
            try {
                console.log('[FB] Trying Hansa API fallback...');
                videoData = await tryHansaAPI(url);
            } catch (hansaError) {
                console.error('[FB Hansa Error]', hansaError.message);
                return await sock.sendMessage(chatId, { text: '❌ API zote zimeshindwa. Jaribu tena baadaye.' }, { quoted: message });
            }
        }

        const title = videoData.title;
        const videoUrl = videoData.videoUrl;
        const thumbnail = videoData.thumbnail;

        if (!videoUrl) {
            return await sock.sendMessage(chatId, { text: '❌ Imeshindwa kupata link ya kupakua.' }, { quoted: message });
        }

        // React kuonyesha ufunguaji wa file umeanza
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // Tuma video moja kwa moja
        await sock.sendMessage(chatId, { 
            video: { url: videoUrl }, 
            mimetype: 'video/mp4', 
            caption: `✅ *Facebook Video Downloader*\n\n*Title:* ${title}`,
            fileName: `${title}.mp4`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: 'Mickey Glitch Facebook Downloader',
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaType: 2,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // React kuonyesha imekamilika
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (error) {
        console.error('FB Command Error:', error.message);
        console.error('FB Response:', error.response?.data);
        const errorMsg = error.response?.status === 429 
            ? '⏱️ API imechelewa. Jaribu tena baadaye.'
            : error.message?.includes('timeout')
            ? '⏱️ Muda umekwisha. Jaribu tena.'
            : '❌ Hitilafu: ' + error.message;
        await sock.sendMessage(chatId, { text: errorMsg });
    }
}

module.exports = facebookCommand;
