/**
 * play.js - YouTube Music Downloader (Fast & Stable)
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, text) {
    try {
        // Extract query from text
        const args = text ? text.trim().split(/\s+/).slice(1) : [];
        
        if (!args.length) {
            return sock.sendMessage(chatId, { 
                text: '✨ *MICKEY PLAY*\n\n📝 Usage: `.play [song name]`\n\n_Example: .play despacito_',
                quoted: message 
            }).catch(() => {});
        }

        // Show loading reaction
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } }).catch(() => {});

        const query = args.join(' ');

        // 1. SEARCH YOUTUBE
        let video;
        try {
            const search = await Promise.race([
                yts(query),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 15000))
            ]);
            
            video = search?.videos?.[0];
            if (!video) {
                await sock.sendMessage(chatId, { 
                    text: `❌ *Song not found:* ${query}`,
                    quoted: message 
                }).catch(() => {});
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
                return;
            }
        } catch (searchErr) {
            await sock.sendMessage(chatId, { 
                text: `❌ *Search failed:* ${searchErr.message.slice(0, 50)}`,
                quoted: message 
            }).catch(() => {});
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
            return;
        }

        // 2. SEND PREVIEW MESSAGE
        const caption = `🎵 *MICKEY MUSIC PLAYER*\n\n` +
            `📝 *Title:* ${video.title}\n` +
            `👤 *Channel:* ${video.author.name}\n` +
            `⏳ *Duration:* ${video.timestamp}\n` +
            `👁️ *Views:* ${video.views}\n\n` +
            `*⬇️ Downloading audio...*`;

        try {
            await sock.sendMessage(chatId, {
                image: { url: video.thumbnail },
                caption: caption
            }, { quoted: message }).catch(() => {});
        } catch (e) {
            // Silently fail preview, continue with download
        }

        // 3. DOWNLOAD FROM API
        let audioUrl;
        try {
            const nayanApi = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(video.url)}`;
            
            const response = await Promise.race([
                axios.get(nayanApi, { timeout: 60000 }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 65000))
            ]);

            // Check if API returned successfully
            if (!response?.data) {
                throw new Error('No response from API');
            }

            // Handle the nested response structure
            const apiData = response.data.data || response.data;
            
            // Check API status
            if (apiData.status === false) {
                throw new Error(apiData.error || apiData.msg || 'API returned error');
            }

            // Extract audio URL from multiple possible locations
            audioUrl = response.data.url || 
                      apiData.url || 
                      apiData.links?.audio || 
                      apiData.result?.url ||
                      apiData.download_url;

            if (!audioUrl) {
                throw new Error('Audio URL not found in response');
            }

        } catch (apiErr) {
            console.error('[play] API Error:', apiErr.message);
            await sock.sendMessage(chatId, { 
                text: `❌ *Download failed:*\n${apiErr.message.slice(0, 100)}`,
                quoted: message 
            }).catch(() => {});
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
            return;
        }

        // 4. SEND AUDIO
        try {
            await sock.sendMessage(chatId, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${video.title.replace(/[^\w\s-]/g, '')}.mp3`,
                ptt: false
            }, { quoted: message }).catch(() => {});

            // Success reaction
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

        } catch (sendErr) {
            console.error('[play] Send error:', sendErr.message);
            await sock.sendMessage(chatId, { 
                text: `❌ *Failed to send audio*`,
                quoted: message 
            }).catch(() => {});
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
        }

    } catch (err) {
        console.error('[play] Critical error:', err.message);
        // Fail silently - don't crash
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ *Play command error*',
                quoted: message 
            }).catch(() => {});
        } catch (e) {}
    }
}

module.exports = playCommand;
