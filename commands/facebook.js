const axios = require('axios');

/**
 * Try Hansa API for Facebook downloads
 */
async function tryHansaAPI(url) {
    try {
        const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { timeout: 25000 });
        const data = res.data;
        
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

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        let videoData;
        try {
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 25000 });
            const data = res.data;

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
            // Fallback to Hansa API
            try {
                videoData = await tryHansaAPI(url);
            } catch (hansaError) {
                return await sock.sendMessage(chatId, { text: '❌ API zote zimeshindwa. Jaribu tena baadaye.' }, { quoted: message });
            }
        }

        const title = videoData.title;
        const videoUrl = videoData.videoUrl;
        const thumbnail = videoData.thumbnail;

        if (!videoUrl) {
            return await sock.sendMessage(chatId, { text: '❌ Imeshindwa kupata link ya kupakua.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // Stream video directly to WhatsApp
        try {
            await sock.sendMessage(chatId, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption: `✅ *Facebook Video Downloader*\n\n*Title:* ${title}`,
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: 'Facebook Downloader',
                        thumbnailUrl: thumbnail,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(chatId, { text: '🚨 *Hitilafu ya kutuma!* Jaribu tena baadae.' });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("FB ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = facebookCommand;
