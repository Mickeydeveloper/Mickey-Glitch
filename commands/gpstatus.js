/**
 * 📸 Group Status Command (.gpstatus)
 * Share replied-to media as a status/story in the group
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function gpstatusCommand(sock, chatId, message) {
    try {
        // Check if replying to a message
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        
        if (!contextInfo || !contextInfo.quotedMessage) {
            await sock.sendMessage(chatId, {
                text: '📸 *Usage:* Reply to a media message with `.gpstatus` to share it as a status in this group.\n\n✅ Supports: Images, Videos, Documents'
            }, { quoted: message });
            return;
        }

        const quotedMessage = contextInfo.quotedMessage;

        // Extract media from quoted message
        const mediaMessage = quotedMessage.imageMessage || 
                            quotedMessage.videoMessage || 
                            quotedMessage.documentMessage;

        if (!mediaMessage) {
            await sock.sendMessage(chatId, {
                text: '❌ Please reply to an image, video, or document to share as status.'
            }, { quoted: message });
            return;
        }

        // Send "Processing" indicator
        await sock.sendMessage(chatId, { 
            text: '⏳ Processing media...' 
        }, { quoted: message });

        // Build message object for download with proper fallbacks
        const stanzaId = contextInfo.stanzaId || contextInfo.id || message.key.id;
        const participant = contextInfo.participant || message.key.participant || message.key.remoteJid;
        
        if (!stanzaId) {
            throw new Error('Cannot retrieve message ID from context');
        }

        const targetMessage = {
            key: {
                remoteJid: chatId,
                id: stanzaId,
                participant: participant
            },
            message: quotedMessage
        };

        // Download media
        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!mediaBuffer) {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to download media. Please try again.'
            }, { quoted: message });
            return;
        }

        // Determine media type and caption
        const caption = mediaMessage.caption || '✨ Status Update';
        let statusPayload = {};

        if (quotedMessage.imageMessage) {
            statusPayload = {
                image: mediaBuffer,
                caption: caption,
                mimetype: mediaMessage.mimetype || 'image/jpeg'
            };
        } else if (quotedMessage.videoMessage) {
            statusPayload = {
                video: mediaBuffer,
                caption: caption,
                mimetype: mediaMessage.mimetype || 'video/mp4'
            };
        } else if (quotedMessage.documentMessage) {
            statusPayload = {
                document: mediaBuffer,
                fileName: mediaMessage.fileName || 'document.pdf',
                mimetype: mediaMessage.mimetype || 'application/pdf',
                caption: caption
            };
        }

        // Send to group with viewOnce effect (like a story)
        const sentMessage = await sock.sendMessage(chatId, statusPayload, {
            quoted: message,
            contextInfo: {
                mentionedJid: [message.key.participant || message.key.remoteJid],
                isForwarded: true,
                forwardingScore: 1
            }
        });

        // Confirm
        const mediaType = quotedMessage.imageMessage ? '📸 Image' :
                         quotedMessage.videoMessage ? '🎥 Video' : '📄 Document';
        
        // Safe extraction of sender number for attribution
        const senderJid = message.key.participant || message.key.remoteJid;
        const senderNumber = senderJid ? senderJid.split('@')[0] : 'Unknown';
        
        await sock.sendMessage(chatId, {
            text: `✅ ${mediaType} shared as status in group!\n\n💫 Posted by: @${senderNumber}`
        }, { quoted: message });

    } catch (err) {
        console.error('❌ GPStatus Error:', err.message || err);
        await sock.sendMessage(chatId, {
            text: `❌ Error sharing status: ${err.message || 'Failed to process media'}`
        }, { quoted: message });
    }
}

module.exports = gpstatusCommand;
