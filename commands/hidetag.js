/**
 * hidetag.js - HideTag Command (Tags only non-admins)
 * Imeboreshwa na kutumia checkAdminPermissions mpya
 */

const { checkAdminPermissions } = require('../lib/adminCheck');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../temp');

// Hakikisha temp folder ipo
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Download media function (imeboreshwa)
 */
async function downloadMediaMessage(message, mediaType) {
    try {
        const stream = await downloadContentFromMessage(message, mediaType);
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'pdf';
        const filePath = path.join(TEMP_DIR, `\( {Date.now()}. \){ext}`);

        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch (err) {
        console.error('Media download error:', err);
        return null;
    }
}

async function hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message) {
    try {
        // === Check admin permissions with owner bypass ===
        const adminCheck = await checkAdminPermissions(sock, chatId, message);

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
        }

        if (!adminCheck.canExecute) {
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        // Filter only non-admins
        const nonAdmins = participants
            .filter(p => !p.admin || p.admin === null)
            .map(p => p.id);

        if (nonAdmins.length === 0) {
            return sock.sendMessage(chatId, { 
                text: '*_✅ Hakuna non-admin members katika group hii._*' 
            }, { quoted: message });
        }

        let content = {};

        if (replyMessage) {
            // ==================== REPLIED MEDIA HIDETAG ====================
            if (replyMessage.imageMessage) {
                const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image');
                if (filePath) {
                    content = {
                        image: { url: filePath },
                        caption: messageText || replyMessage.imageMessage.caption || '',
                        mentions: nonAdmins
                    };
                }
            } 
            else if (replyMessage.videoMessage) {
                const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video');
                if (filePath) {
                    content = {
                        video: { url: filePath },
                        caption: messageText || replyMessage.videoMessage.caption || '',
                        mentions: nonAdmins
                    };
                }
            } 
            else if (replyMessage.documentMessage) {
                const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document');
                if (filePath) {
                    content = {
                        document: { url: filePath },
                        fileName: replyMessage.documentMessage.fileName || 'document',
                        caption: messageText || '',
                        mentions: nonAdmins
                    };
                }
            } 
            else {
                // Text only
                const text = replyMessage.conversation || replyMessage.extendedTextMessage?.text || messageText || "Hidetag message";
                content = { text: text, mentions: nonAdmins };
            }
        } else {
            // ==================== NORMAL TEXT HIDETAG ====================
            content = {
                text: messageText || `📢 Hidetag from @${senderId.split('@')[0]}`,
                mentions: nonAdmins
            };
        }

        if (Object.keys(content).length > 0) {
            await sock.sendMessage(chatId, content, { quoted: message });
        }

        // Cleanup temp files
        setTimeout(() => {
            try {
                fs.readdirSync(TEMP_DIR).forEach(file => {
                    try { fs.unlinkSync(path.join(TEMP_DIR, file)); } catch {}
                });
            } catch {}
        }, 10000);

    } catch (error) {
        console.error('Error in hideTagCommand:', error);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Kuna tatizo katika kutekeleza .hidetag command._*' 
        }, { quoted: message });
    }
}

module.exports = hideTagCommand;