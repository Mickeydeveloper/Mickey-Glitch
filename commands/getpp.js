/**
 * profile.js - Get WhatsApp Profile Picture with Interactive Card
 * Features: Profile picture display with interactive buttons
 * Usage: .profile [@mention or phone number]
 */

const { 
    generateWAMessageFromContent, 
    prepareWAMessageMedia,
    proto 
} = require('@whiskeysockets/baileys');

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const FOOTER = '© Mickey Glith ™';
const DEFAULT_AVATAR = 'https://i.imgur.com/6N4H8Xj.png'; // Default avatar fallback

// ─── HELPERS ──────────────────────────────────────────────────────────────
function normalizeJid(value, fallback = '') {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    } else if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
    } else if (Array.isArray(value) && value.length > 0) {
        return normalizeJid(value[0], fallback);
    } else if (value && typeof value === 'object') {
        const candidate = value.jid || value.id || value.userJid || 
                         value.participant || value.remoteJid || value.sender;
        if (candidate) return normalizeJid(candidate, fallback);
    }

    return typeof fallback === 'string' ? fallback.trim() : '';
}

function toWhatsAppJid(value, fallback = '') {
    const normalized = normalizeJid(value, fallback);
    if (!normalized) return '';

    // Already has @s.whatsapp.net
    if (normalized.includes('@s.whatsapp.net')) return normalized;
    
    // Has @ but not s.whatsapp.net
    if (normalized.includes('@')) {
        const [number, suffix] = normalized.split('@');
        if (suffix === 'g.us' || suffix === 'broadcast') {
            return normalized; // Group or broadcast
        }
        return `${number}@s.whatsapp.net`;
    }

    // Just numbers
    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
        return `${digitsOnly}@s.whatsapp.net`;
    }

    return normalized;
}

function formatPhoneNumber(jid) {
    if (!jid) return 'Unknown';
    const clean = jid.split('@')[0];
    if (clean.length <= 10) return clean;
    // Format: +XXX XXX XXX XXX
    if (clean.startsWith('255') && clean.length === 12) {
        return `+${clean.slice(0,3)} ${clean.slice(3,6)} ${clean.slice(6,9)} ${clean.slice(9)}`;
    }
    if (clean.length === 12 && clean.startsWith('1')) {
        return `+${clean.slice(0,1)} ${clean.slice(1,4)} ${clean.slice(4,7)} ${clean.slice(7)}`;
    }
    return clean;
}

async function getUserName(sock, jid, message) {
    try {
        // Try to get from store first
        if (global.store?.contacts?.[jid]) {
            const contact = global.store.contacts[jid];
            return contact.name || contact.notify || contact.verifiedName || null;
        }

        // Try to get from message
        if (message.pushName && jid === message.key?.remoteJid) {
            return message.pushName;
        }

        // Try to fetch presence
        try {
            const presence = await sock.presenceSubscribe(jid);
            if (presence?.presence?.participants?.[0]?.name) {
                return presence.presence.participants[0].name;
            }
        } catch {
            // Ignore presence errors
        }

        return null;
    } catch {
        return null;
    }
}

async function getProfilePicture(sock, jid) {
    try {
        // Try primary method
        const ppUrl = await sock.profilePictureUrl(jid, 'image');
        return ppUrl;
    } catch (err) {
        console.log('[PROFILE] Profile picture not found, using default:', err.message);
        
        // Try alternative method for groups
        if (jid.includes('@g.us')) {
            try {
                const metadata = await sock.groupMetadata(jid);
                if (metadata?.profilePictureUrl) {
                    return metadata.profilePictureUrl;
                }
            } catch (groupErr) {
                console.log('[PROFILE] Group picture not found:', groupErr.message);
            }
        }
        
        // Return default avatar
        return DEFAULT_AVATAR;
    }
}

async function getStatus(sock, jid) {
    try {
        const status = await sock.getStatus(jid);
        return status?.status || 'No status set';
    } catch {
        return 'Status not available';
    }
}

// ─── MAIN PROFILE COMMAND ──────────────────────────────────────────────────
async function profileCommand(sock, chatId, senderId, message, args) {
    try {
        const normalizedSenderJid = toWhatsAppJid(senderId, '');
        let targetJid = normalizedSenderJid;
        let isGroup = chatId.includes('@g.us');
        let targetName = '';

        // ─── 1. DETERMINE TARGET ──────────────────────────────────────────
        // Check mentions
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0) {
            targetJid = toWhatsAppJid(mentionedJids[0], normalizedSenderJid);
        } 
        // Check args (phone number)
        else if (args.length > 0) {
            const rawArg = normalizeJid(args[0], '');
            const num = rawArg.replace(/[^0-9]/g, '');
            if (num.length >= 10) {
                targetJid = `${num}@s.whatsapp.net`;
            }
        }
        // Check quoted message
        else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = message.message.extendedTextMessage.contextInfo;
            if (quoted.participant) {
                targetJid = toWhatsAppJid(quoted.participant, normalizedSenderJid);
            }
        }

        // Validate target JID
        if (!targetJid) {
            throw new Error('Invalid target user');
        }

        // ─── 2. GET USER INFORMATION ──────────────────────────────────────
        // Get name
        const nameFromStore = await getUserName(sock, targetJid, message);
        const displayName = nameFromStore || targetJid.split('@')[0] || 'User';
        targetName = displayName;

        // Get profile picture
        let ppUrl;
        try {
            ppUrl = await getProfilePicture(sock, targetJid);
        } catch (err) {
            console.error('[PROFILE] Error getting profile picture:', err);
            ppUrl = DEFAULT_AVATAR;
        }

        // Get status
        const status = await getStatus(sock, targetJid);

        // ─── 3. PREPARE MEDIA ─────────────────────────────────────────────
        let mediaMessage;
        try {
            // Download and prepare image
            const imageResponse = await fetch(ppUrl);
            if (!imageResponse.ok) throw new Error('Failed to fetch image');
            
            const imageBuffer = await imageResponse.arrayBuffer();
            
            mediaMessage = await prepareWAMessageMedia(
                { image: Buffer.from(imageBuffer) },
                { upload: sock.waUploadToServer }
            );
        } catch (mediaErr) {
            console.error('[PROFILE] Media preparation error:', mediaErr);
            
            // Fallback: Use direct URL
            mediaMessage = {
                imageMessage: {
                    url: ppUrl,
                    mimetype: 'image/jpeg',
                    caption: 'Profile picture',
                    fileSha256: Buffer.alloc(32),
                    fileLength: 0,
                    height: 512,
                    width: 512,
                    mediaKey: Buffer.alloc(32),
                    fileEncSha256: Buffer.alloc(32),
                    directPath: '/',
                    mediaKeyTimestamp: 0
                }
            };
        }

        // ─── 4. BUILD CARD ──────────────────────────────────────────────
        const phoneNumber = formatPhoneNumber(targetJid);
        const isSelf = targetJid === normalizedSenderJid;
        const userType = isSelf ? '👤 You' : '👤 User';
        
        let bodyText = `✨ *Profile Retrieved Successfully!*\n\n`;
        bodyText += `📋 *Name:* ${targetName}\n`;
        bodyText += `🆔 *Phone:* ${phoneNumber}\n`;
        bodyText += `📝 *Status:* ${status}\n`;
        bodyText += `👥 *Type:* ${targetJid.includes('@g.us') ? '👥 Group' : '🧑 Person'}\n`;
        bodyText += `🔄 *Self:* ${isSelf ? '✅ Yes' : '❌ No'}\n\n`;
        bodyText += `📱 *JID:* ${targetJid}\n`;
        bodyText += `🕐 *Retrieved:* ${new Date().toLocaleString()}`;

        // ─── 5. CREATE BUTTONS ──────────────────────────────────────────
        const buttons = [];

        // Chat button (if not self)
        if (!isSelf && !targetJid.includes('@g.us')) {
            buttons.push({
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: "💬 Chat with them",
                    url: `https://wa.me/${targetJid.split('@')[0]}`
                })
            });
        }

        // Voice call button (if not self and not group)
        if (!isSelf && !targetJid.includes('@g.us')) {
            buttons.push({
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: "📞 Voice Call",
                    url: `tel:+${targetJid.split('@')[0]}`
                })
            });
        }

        // Download button
        buttons.push({
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: "📥 Download Image",
                url: ppUrl
            })
        });

        // ─── 6. SEND CARD ──────────────────────────────────────────────
        const cardMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: `👤 PROFILE: ${targetName.toUpperCase().substring(0, 30)}`,
                            hasMediaAttachment: true,
                            imageMessage: mediaMessage.imageMessage || mediaMessage
                        },
                        body: {
                            text: bodyText
                        },
                        footer: {
                            text: FOOTER
                        },
                        nativeFlowMessage: {
                            buttons: buttons,
                            version: 3
                        }
                    }
                }
            }
        };

        // Generate and send message
        const msg = generateWAMessageFromContent(chatId, cardMessage, { quoted: message });
        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

        // ─── 7. REACTION ──────────────────────────────────────────────────
        await sock.sendMessage(chatId, { 
            react: { text: '✅', key: message.key } 
        });

    } catch (err) {
        console.error('[PROFILE] Error:', err);
        
        // Send error message
        try {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key } 
            });
            
            await sock.sendMessage(chatId, { 
                text: `❌ *Profile Error*\n\n${err.message || 'Unknown error'}\n\n` +
                      `💡 *Usage:*\n` +
                      `• .profile - Show your profile\n` +
                      `• .profile @user - Show tagged user's profile\n` +
                      `• .profile 255xxx - Show user by phone number\n` +
                      `• Reply to a message with .profile` 
            }, { quoted: message });
        } catch (sockErr) {
            console.error('[PROFILE] Failed to send error:', sockErr);
        }
    }
}

// ─── ALTERNATIVE SIMPLE VERSION ──────────────────────────────────────────
async function profileSimple(sock, chatId, senderId, message, args) {
    try {
        const senderJid = toWhatsAppJid(senderId);
        let targetJid = senderJid;

        // Determine target
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0) {
            targetJid = mentionedJids[0];
        } else if (args.length > 0) {
            const num = args[0].replace(/\D/g, '');
            if (num.length >= 10) targetJid = `${num}@s.whatsapp.net`;
        } else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = message.message.extendedTextMessage.contextInfo;
            if (quoted.participant) targetJid = quoted.participant;
        }

        // Get profile picture
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch {
            ppUrl = DEFAULT_AVATAR;
        }

        // Get name
        let name = targetJid.split('@')[0];
        if (global.store?.contacts?.[targetJid]) {
            name = global.store.contacts[targetJid].name || name;
        }

        // Send simple message
        await sock.sendMessage(chatId, {
            image: { url: ppUrl },
            caption: `👤 *${name}*\n🆔 ${targetJid.split('@')[0]}\n\n${FOOTER}`
        }, { quoted: message });

    } catch (err) {
        console.error('[PROFILE] Simple version error:', err);
        await sock.sendMessage(chatId, { 
            text: `❌ Error: ${err.message}` 
        });
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = profileCommand;
module.exports.simple = profileSimple;
module.exports.name = 'profile';
module.exports.aliases = ['pp', 'avatar', 'pic', 'foto'];
module.exports.category = 'utility';
module.exports.description = 'Get WhatsApp profile picture with interactive card';
module.exports.usage = '.profile [@mention|phone number]';
module.exports.default = profileCommand;
module.exports.handler = profileCommand;