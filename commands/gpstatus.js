/**
 * 📸 Real WhatsApp Status Command (.gpstatus)
 * Share replied-to media directly to your WhatsApp Stories
 * Enhanced with group status feature and better error handling
 */

const baileys = require('baileys');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Temporary directory for media processing
const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Function to check if user is group admin
async function isGroupAdmin(sock, groupId, participantId) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const participant = groupMetadata.participants.find(p => p.id === participantId);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch (err) {
        console.error('Error checking admin status:', err);
        return false;
    }
}

// Function to post status to group members only
async function postGroupStatusToMembers(sock, groupId, mediaBuffer, caption, senderId, mediaType) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const members = groupMetadata.participants.map(p => p.id);
        
        let successCount = 0;
        let failCount = 0;
        
        // Send to each group member individually
        for (const member of members) {
            if (member === senderId) continue; // Skip sender
            
            try {
                if (mediaType === 'image') {
                    await sock.sendMessage(member, {
                        image: mediaBuffer,
                        caption: `📢 *GROUP STATUS*\nFrom: ${groupMetadata.subject}\n\n${caption || 'No caption'}\n\n🟣 This is a group status update`
                    });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(member, {
                        video: mediaBuffer,
                        caption: `📢 *GROUP STATUS*\nFrom: ${groupMetadata.subject}\n\n${caption || 'No caption'}\n\n🟣 This is a group status update`
                    });
                }
                successCount++;
            } catch (err) {
                failCount++;
                console.error(`Failed to send to ${member}:`, err.message);
            }
            
            // Small delay to avoid rate limiting
            await delay(100);
        }
        
        return { successCount, failCount, total: members.length };
    } catch (err) {
        console.error('Error posting group status:', err);
        throw err;
    }
}

async function fetchParticipants(sock, ...jids) {
    const results = [];
    for (const jid of jids) {
        if (!jid) continue;
        try {
            const { participants = [] } = await sock.groupMetadata(jid);
            results.push(...participants.map(({ id }) => id));
        } catch (err) {
            console.error('Group metadata fetch failed for', jid, err);
        }
    }
    return [...new Set(results)];
}

async function mentionStatus(sock, jids, content) {
    if (!sock?.relayMessage) throw new Error('Socket relayMessage is unavailable');

    const baileysModule = await import('baileys');
    const baileysLib = baileysModule.default || baileysModule;

    if (!baileysLib?.proto?.Message?.ProtocolMessage?.Type?.STATUS_MENTION_MESSAGE) {
        throw new Error('No STATUS_MENTION_MESSAGE found in ProtocolMessage (is your WAProto up-to-date?)');
    }

    const msg = await baileysLib.generateWAMessage(baileysLib.STORIES_JID, content, {
        upload: sock.waUploadToServer,
    });

    let statusJidList = [];
    for (const jid of jids || []) {
        if (!jid) continue;
        if (jid.endsWith('@g.us')) {
            statusJidList.push(...await fetchParticipants(sock, jid));
        } else {
            statusJidList.push(jid);
        }
    }

    statusJidList = [...new Set(statusJidList.filter(Boolean))];

    await sock.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id,
        statusJidList,
        additionalNodes: [
            {
                tag: 'meta',
                attrs: {},
                content: [
                    {
                        tag: 'mentioned_users',
                        attrs: {},
                        content: jids.map((jid) => ({
                            tag: 'to',
                            attrs: { jid },
                            content: undefined,
                        }))
                    }
                ]
            }
        ]
    });

    for (const jid of jids || []) {
        if (!jid) continue;
        const type = jid.endsWith('@g.us') ? 'groupStatusMentionMessage' : 'statusMentionMessage';
        await sock.relayMessage(jid, {
            [type]: {
                message: {
                    protocolMessage: {
                        key: msg.key,
                        type: 25,
                    }
                }
            }
        }, {
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: { is_status_mention: 'true' },
                    content: undefined,
                }
            ]
        });
    }

    return msg;
}

async function postToWhatsAppStatus(sock, mediaBuffer, caption, mediaType, options = {}) {
    try {
        const targetJids = options.targetJids || ['status@broadcast'];

        if (targetJids.length === 1 && targetJids[0] === 'status@broadcast') {
            const statusPayload = mediaType === 'image'
                ? { image: mediaBuffer, caption: caption || '📸 Status update', viewOnce: options.viewOnce || false }
                : { video: mediaBuffer, caption: caption || '🎥 Status update', gifPlayback: false, seconds: options.seconds || 30 };

            try {
                return await sock.sendMessage('status@broadcast', statusPayload);
            } catch (sendError) {
                console.error('Direct status send failed, trying mention flow:', sendError);
                return mentionStatus(sock, ['status@broadcast'], statusPayload);
            }
        }

        return mentionStatus(sock, targetJids, mediaType === 'image'
            ? { image: mediaBuffer, caption: caption || '📸 Status update', viewOnce: options.viewOnce || false }
            : { video: mediaBuffer, caption: caption || '🎥 Status update', gifPlayback: false, seconds: options.seconds || 30 }
        );
    } catch (err) {
        console.error('Error posting to status:', err);
        throw err;
    }
}

// Function to download and process media
async function processMedia(sock, chatId, contextInfo, quotedMessage, mediaMessage) {
    try {
        // Download media buffer
        const mediaBuffer = await downloadMediaMessage(
            { 
                key: { 
                    remoteJid: chatId, 
                    id: contextInfo.stanzaId, 
                    participant: contextInfo.participant 
                }, 
                message: quotedMessage 
            },
            'buffer',
            {},
            { 
                reuploadRequest: sock.updateMediaMessage,
                logger: console
            }
        );
        
        if (!mediaBuffer) {
            throw new Error('Failed to download media');
        }
        
        return mediaBuffer;
    } catch (err) {
        console.error('Media download error:', err);
        throw new Error(`Media download failed: ${err.message}`);
    }
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Help command
async function gpstatusHelp(sock, chatId, message) {
    const helpText = `📸 *GPSTATUS COMMAND HELP*

*Usage:* 
\`.gpstatus\` - Reply to media to post to WhatsApp Status
\`.gpstatus group\` - Post to group members only (admin only)
\`.gpstatus both\` - Post to both Status and Group
\`.gpstatus viewonce\` - Post as view once status

*Examples:*
1. Reply to an image with \`.gpstatus\`
2. Reply to a video with \`.gpstatus group\`
3. Reply to media with \`.gpstatus both viewonce\`

*Features:*
✅ Post images/videos to WhatsApp Stories
✅ Share to group members (admin only)
✅ View once privacy option
✅ Automatic media compression

*Note:* Group status feature requires admin privileges.

📞 *Support:* Contact bot owner for issues`;
    
    await sock.sendMessage(chatId, { text: helpText }, { quoted: message });
}

// Main command function
async function gpstatusCommand(sock, chatId, message, args = []) {
    try {
        // Check if help is requested
        if (args && args.length > 0 && (args[0] === 'help' || args[0] === '--help')) {
            return gpstatusHelp(sock, chatId, message);
        }
        
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        
        // Check if message is quoted
        if (!contextInfo || !contextInfo.quotedMessage) {
            await sock.sendMessage(chatId, {
                text: '📸 *Usage:* Reply to a media with `.gpstatus` to post it on your Status/Stories.\n\n' +
                      '📌 *Options:*\n' +
                      '• `.gpstatus group` - Post to group members only\n' +
                      '• `.gpstatus viewonce` - Post as view once status\n' +
                      '• `.gpstatus both` - Post to both status and group\n\n' +
                      '• `.gpstatus help` - Show detailed help'
            }, { quoted: message });
            return;
        }
        
        const quotedMessage = contextInfo.quotedMessage;
        const mediaMessage = quotedMessage.imageMessage || 
                            quotedMessage.videoMessage || 
                            quotedMessage.documentMessage;
        
        if (!mediaMessage) {
            await sock.sendMessage(chatId, { 
                text: '❌ Please reply to an image or video message.' 
            }, { quoted: message });
            return;
        }
        
        // Determine media type
        const mediaType = quotedMessage.imageMessage ? 'image' : 
                         (quotedMessage.videoMessage ? 'video' : null);
        
        if (!mediaType) {
            await sock.sendMessage(chatId, { 
                text: '❌ Unsupported media type. Only images and videos are supported.' 
            }, { quoted: message });
            return;
        }
        
        // Parse arguments safely
        const firstArg = args && args.length > 0 ? args[0].toLowerCase() : '';
        const secondArg = args && args.length > 1 ? args[1].toLowerCase() : '';
        
        const isGroupMode = firstArg === 'group' || firstArg === 'both';
        const isStatusMode = firstArg === 'status' || firstArg === 'both' || firstArg === '';
        const isViewOnce = firstArg === 'viewonce' || secondArg === 'viewonce';
        
        // Send processing message
        await sock.sendMessage(chatId, { 
            text: '⏳ *Processing media...*\n\n📥 Downloading media...' 
        }, { quoted: message });
        
        // Download media
        const mediaBuffer = await processMedia(sock, chatId, contextInfo, quotedMessage, mediaMessage);
        const caption = mediaMessage.caption || '';
        
        let results = [];
        let success = false;
        
        // Mode 1: Post to WhatsApp Status (Stories)
        if (isStatusMode) {
            try {
                await postToWhatsAppStatus(sock, mediaBuffer, caption, mediaType, { viewOnce: isViewOnce });
                results.push('✅ *WhatsApp Status:* Posted successfully!');
                success = true;
            } catch (err) {
                results.push(`❌ *WhatsApp Status:* Failed - ${err.message}`);
                console.error('Status post error:', err);
            }
        }
        
        // Mode 2: Post to Group Members only
        if (isGroupMode) {
            // Check if sender is admin
            const senderId = message.key.participant || message.key.remoteJid;
            const isAdmin = await isGroupAdmin(sock, chatId, senderId);
            
            if (!isAdmin) {
                results.push('❌ *Group Status:* Only group admins can post group status!');
            } else {
                try {
                    const groupResult = await postGroupStatusToMembers(
                        sock, chatId, mediaBuffer, caption, senderId, mediaType
                    );
                    
                    results.push(`✅ *Group Status:* Posted to ${groupResult.successCount}/${groupResult.total} group members!`);
                    if (groupResult.failCount > 0) {
                        results.push(`⚠️ Failed to send to ${groupResult.failCount} members`);
                    }
                    success = true;
                } catch (err) {
                    results.push(`❌ *Group Status:* Failed - ${err.message}`);
                    console.error('Group post error:', err);
                }
            }
        }
        
        // Send final results
        const finalMessage = results.length > 0 ? results.join('\n\n') : '❌ No action performed';
        const emoji = success ? '✅' : '❌';
        
        await sock.sendMessage(chatId, { 
            text: `${emoji} *Status Post Complete*\n\n${finalMessage}\n\n💡 Tip: Use .gpstatus help for more options`
        }, { quoted: message });
        
    } catch (err) {
        console.error('❌ GPStatus Command Error:', err);
        await sock.sendMessage(chatId, { 
            text: `❌ *Error:* ${err.message}\n\nPlease try again or contact support.` 
        }, { quoted: message });
    }
}

// Export kama za code za awali (direct function export)
module.exports = gpstatusCommand;