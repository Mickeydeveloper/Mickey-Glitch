/**
 * tag.js - Advanced Tag Command
 * Inatumia isAdmin mpya na inafanya kazi vizuri na media (image, video, document, text)
 */

const { isAdmin } = require('../lib/isAdmin');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../temp');

// Hakikisha temp folder ipo
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Download media na kurudisha file path
 */
async function downloadMediaMessage(message, mediaType) {
    try {
        const stream = await downloadContentFromMessage(message, mediaType);
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const fileName = `\( {Date.now()}. \){mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'pdf'}`;
        const filePath = path.join(TEMP_DIR, fileName);

        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch (err) {
        console.error('Media download error:', err);
        return null;
    }
}

// Remove emoji characters
function stripEmoji(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F1E6}-\u{1F1FF}]/gu, '');
}

async function tagCommand(sock, chatId, senderId, messageText, replyMessage, message) {
    try {
        // Tumia isAdmin iliyoboreshwa
        const adminStatus = await isAdmin(sock, chatId, senderId);

        if (!adminStatus.isGroup) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
        }

        if (!adminStatus.isBotAdmin) {
            return sock.sendMessage(chatId, { 
                text: '*_⚠️ Bot lazima iwe Admin ili iweze kutag wote!_\n\nNipandishe vyeo kwanza.*' 
            }, { quoted: message });
        }

        if (!adminStatus.isSenderAdmin) {
            // Sticker response kwa non-admins (kama ulivyotaka)
            const stickerPath = './assets/sticktag.webp';
            if (fs.existsSync(stickerPath)) {
                const stickerBuffer = fs.readFileSync(stickerPath);
                await sock.sendMessage(chatId, { 
                    sticker: stickerBuffer 
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '*_❌ Only group admins can use .tag command!_*' 
                }, { quoted: message });
            }
            return;
        }

        // Get all participants
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        const mentionedJidList = participants.map(p => p.id);

        if (mentionedJidList.length === 0) {
            return sock.sendMessage(chatId, { text: '*_Hakuna washiriki katika group._*' }, { quoted: message });
        }

        let messageContent = {};

        if (replyMessage) {
            // ==================== REPLIED MESSAGE TAG ====================
            if (replyMessage.imageMessage) {
                const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image');
                if (filePath) {
                    messageContent = {
                        image: { url: filePath },
                        caption: stripEmoji(messageText || replyMessage.imageMessage.caption || ''),
                        mentions: mentionedJidList
                    };
                }
            } 
            else if (replyMessage.videoMessage) {
                const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video');
                if (filePath) {
                    messageContent = {
                        video: { url: filePath },
                        caption: stripEmoji(messageText || replyMessage.videoMessage.caption || ''),
                        mentions: mentionedJidList
                    };
                }
            } 
            else if (replyMessage.documentMessage) {
                const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document');
                if (filePath) {
                    messageContent = {
                        document: { url: filePath },
                        fileName: replyMessage.documentMessage.fileName || 'document',
                        caption: stripEmoji(messageText || ''),
                        mentions: mentionedJidList
                    };
                }
            } 
            else {
                // Text message
                const text = replyMessage.conversation || replyMessage.extendedTextMessage?.text || messageText || "Tagged message";
                messageContent = {
                    text: stripEmoji(text),
                    mentions: mentionedJidList
                };
            }
        } else {
            // ==================== NORMAL TEXT TAG ====================
            messageContent = {
                text: stripEmoji(messageText || `📢 Tag from @${senderId.split('@')[0]}`),
                mentions: mentionedJidList
            };
        }

        // Tuma ujumbe
        if (Object.keys(messageContent).length > 0) {
            await sock.sendMessage(chatId, messageContent, { quoted: message });
        }

        // Cleanup temp files baada ya sekunde 10
        setTimeout(() => {
            try {
                if (fs.existsSync(TEMP_DIR)) {
                    fs.readdirSync(TEMP_DIR).forEach(file => {
                        fs.unlinkSync(path.join(TEMP_DIR, file));
                    });
                }
            } catch {}
        }, 10000);

    } catch (error) {
        console.error('Error in tagCommand:', error);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Kuna tatizo katika kutekeleza .tag command._*' 
        }, { quoted: message });
    }
}

module.exports = tagCommand;