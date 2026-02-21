/**
 * Instagram Downloader - Memory Optimized
 * Uses ONLY URL streaming - NO buffering, NO ffmpeg, NO transcoding
 */

const { igdl } = require("ruhend-scraper");

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

// Auto-cleanup: remove old entries every 10 minutes
setInterval(() => {
    if (processedMessages.size > 1000) {
        processedMessages.clear();
        console.log('[Instagram] Cleared message cache');
    }
}, 10 * 60 * 1000);

/**
 * Extract unique media URLs
 */
function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();
    
    for (const media of mediaData) {
        if (!media.url) continue;
        if (!seenUrls.has(media.url)) {
            seenUrls.add(media.url);
            uniqueMedia.push(media);
        }
    }
    
    return uniqueMedia;
}

async function instagramCommand(sock, chatId, message) {
    try {
        // Prevent duplicate processing
        if (processedMessages.has(message.key.id)) {
            return;
        }
        processedMessages.add(message.key.id);
        
        // Auto-cleanup after 5 minutes
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Please provide an Instagram link."
            }, { quoted: message });
        }

        // Validate Instagram URL
        const isValidUrl = /https?:\/\/(?:www\.)?instagram\.com\/(reel|p|tv|stories)\//.test(text) ||
                          /https?:\/\/(?:www\.)?instagr\.am\//.test(text);
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Invalid Instagram link format."
            }, { quoted: message });
        }

        // Show processing indicator
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        }).catch(() => {});

        // Fetch media metadata
        let downloadData;
        try {
            downloadData = await igdl(text);
        } catch (apiErr) {
            console.error('[Instagram] API Error:', apiErr.message);
            return await sock.sendMessage(chatId, { 
                text: "❌ Failed to fetch media. Link might be invalid or private."
            }, { quoted: message });
        }

        if (!downloadData?.data || downloadData.data.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "❌ No media found. The post might be private."
            }, { quoted: message });
        }

        // Get first video or first media
        const uniqueMedia = extractUniqueMedia(downloadData.data);
        const selected = uniqueMedia.find(m => {
            const url = (m.url || '').toString();
            return /\.(mp4|webm|mov|mkv)(?:\?|$)/i.test(url) || m.type === 'video' || text.includes('/reel/');
        }) || uniqueMedia[0];

        if (!selected?.url) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Could not extract media URL."
            }, { quoted: message });
        }

        const mediaUrl = selected.url;
        const isVideo = /\.(mp4|webm|mov|mkv)(?:\?|$)/i.test(mediaUrl) || selected.type === 'video' || text.includes('/reel/');

        // Send media via URL (no buffering)
        try {
            if (isVideo) {
                await sock.sendMessage(chatId, {
                    video: { url: mediaUrl },
                    mimetype: 'video/mp4',
                    caption: '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™'
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, {
                    image: { url: mediaUrl },
                    caption: '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™'
                }, { quoted: message });
            }
            
            // Success reaction
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            }).catch(() => {});

        } catch (sendErr) {
            console.error('[Instagram] Send Error:', sendErr.message);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to send media. Try another link.'
            }, { quoted: message });
        }

    } catch (error) {
        console.error('[Instagram] Command Error:', error.message);
        await sock.sendMessage(chatId, { 
            text: '❌ An error occurred.'
        }, { quoted: message }).catch(() => {});
    } finally {
        // Force garbage collection
        if (global.gc) {
            setImmediate(() => global.gc());
        }
    }
}

module.exports = instagramCommand;
