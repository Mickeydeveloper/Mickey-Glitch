/**
 * profile.js - Get WhatsApp Profile Picture
 * Features: Display profile picture with user info
 * Usage: .profile [@mention or phone number]
 */

const { 
    generateWAMessageFromContent,
    proto 
} = require('@whiskysockets/baileys');

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const FOOTER = '© Mickey Glith ™';
const DEFAULT_AVATAR = 'https://i.imgur.com/6N4H8Xj.png';

// ─── HELPERS ──────────────────────────────────────────────────────────────
function normalizeJid(value, fallback = '') {
    if (!value) return fallback;
    
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
            return normalized;
        }
        if (number && number.length >= 10) {
            return `${number}@s.whatsapp.net`;
        }
        return normalized;
    }

    // Just numbers
    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
        return `${digitsOnly}@s.whatsapp.net`;
    }

    return normalized;
}

function formatPhoneNumber(jid) {
    if (!jid) return 'Unknown';
    const clean = jid.split('@')[0];
    if (!clean) return 'Unknown';
    
    // Format with country code
    if (clean.startsWith('255') && clean.length === 12) {
        return `+${clean.slice(0,3)} ${clean.slice(3,6)} ${clean.slice(6,9)} ${clean.slice(9)}`;
    }
    if (clean.startsWith('1') && clean.length === 11) {
        return `+${clean.slice(0,1)} ${clean.slice(1,4)} ${clean.slice(4,7)} ${clean.slice(7)}`;
    }
    if (clean.length === 10) {
        return `+${clean.slice(0,3)} ${clean.slice(3,6)} ${clean.slice(6)}`;
    }
    return clean;
}

function truncateString(str, maxLength = 30) {
    if (!str) return 'User';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

// ─── MAIN PROFILE COMMAND ──────────────────────────────────────────────────
async function profileCommand(sock, chatId, senderId, message, args) {
    try {
        // Validate inputs
        if (!sock || !chatId || !senderId) {
            throw new Error('Invalid socket or chat ID');
        }

        // Get sender JID
        const normalizedSenderJid = toWhatsAppJid(senderId);
        if (!normalizedSenderJid) {
            throw new Error('Could not determine sender ID');
        }

        let targetJid = normalizedSenderJid;
        let isGroup = chatId.includes('@g.us');

        // ─── 1. DETERMINE TARGET ──────────────────────────────────────────
        try {
            // Check mentions
            const mentionedJids = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0 && mentionedJids[0]) {
                const mentioned = toWhatsAppJid(mentionedJids[0]);
                if (mentioned) targetJid = mentioned;
            } 
            // Check args (phone number)
            else if (args && args.length > 0) {
                const rawArg = args[0] || '';
                const num = rawArg.replace(/[^0-9]/g, '');
                if (num.length >= 10 && num.length <= 15) {
                    targetJid = `${num}@s.whatsapp.net`;
                }
            }
            // Check quoted message
            else if (message?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = message.message.extendedTextMessage.contextInfo;
                if (quoted.participant) {
                    const quotedJid = toWhatsAppJid(quoted.participant);
                    if (quotedJid) targetJid = quotedJid;
                }
            }
        } catch (err) {
            console.log('[PROFILE] Target detection error:', err);
            // Continue with default target
        }

        // Validate target JID
        if (!targetJid || targetJid.length < 10) {
            throw new Error('Invalid target user');
        }

        // ─── 2. GET USER INFORMATION ──────────────────────────────────────
        let displayName = targetJid.split('@')[0] || 'User';
        let ppUrl = DEFAULT_AVATAR;
        let status = 'No status set';

        // Get name from store
        try {
            if (global.store?.contacts?.[targetJid]) {
                const contact = global.store.contacts[targetJid];
                displayName = contact.name || contact.notify || contact.verifiedName || displayName;
            } else if (message?.pushName && targetJid === normalizedSenderJid) {
                displayName = message.pushName;
            }
        } catch (err) {
            console.log('[PROFILE] Name fetch error:', err);
        }

        // Get profile picture
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (err) {
            console.log('[PROFILE] No profile picture:', err.message);
            ppUrl = DEFAULT_AVATAR;
        }

        // Get status
        try {
            const statusData = await sock.getStatus(targetJid);
            if (statusData?.status) {
                status = statusData.status;
            }
        } catch (err) {
            console.log('[PROFILE] Status fetch error:', err);
        }

        // ─── 3. SEND PROFILE INFO ────────────────────────────────────────
        const phoneNumber = formatPhoneNumber(targetJid);
        const isSelf = targetJid === normalizedSenderJid;
        const userType = isSelf ? '👤 You' : '👤 User';
        const cleanName = truncateString(displayName, 30);

        // Build caption
        let caption = `👤 *PROFILE: ${cleanName}*\n\n`;
        caption += `📋 *Name:* ${cleanName}\n`;
        caption += `🆔 *Phone:* ${phoneNumber}\n`;
        caption += `📝 *Status:* ${status}\n`;
        caption += `🔄 *Type:* ${isSelf ? 'Your Profile' : 'User Profile'}\n`;
        caption += `👥 *Group:* ${isGroup ? '✅ Yes' : '❌ No'}\n\n`;
        caption += `📱 *JID:* ${targetJid}\n`;
        caption += `🕐 *Fetched:* ${new Date().toLocaleString()}`;

        // ─── 4. SEND MESSAGE ─────────────────────────────────────────────
        try {
            // Send as image with caption
            await sock.sendMessage(chatId, {
                image: { url: ppUrl },
                caption: caption,
                contextInfo: {
                    mentionedJid: [targetJid]
                }
            }, { quoted: message });

            // Send reaction
            await sock.sendMessage(chatId, { 
                react: { text: '✅', key: message.key } 
            });

        } catch (sendErr) {
            console.error('[PROFILE] Send error:', sendErr);
            
            // Fallback: Send text only
            await sock.sendMessage(chatId, {
                text: `👤 *${cleanName}*\n🆔 ${phoneNumber}\n📝 ${status}`
            }, { quoted: message });
        }

    } catch (err) {
        console.error('[PROFILE] Error:', err);
        
        // Send simple error message
        try {
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key } 
            });
            
            await sock.sendMessage(chatId, { 
                text: `❌ *Profile Error*\n\n${err.message || 'Unknown error'}\n\n` +
                      `💡 *Usage:*\n` +
                      `• .profile - Show your profile\n` +
                      `• .profile @user - Show tagged user\n` +
                      `• .profile 255xxx - Show by phone number\n` +
                      `• Reply to message with .profile` 
            }, { quoted: message });
        } catch (err2) {
            console.error('[PROFILE] Failed to send error:', err2);
        }
    }
}

// ─── SIMPLE VERSION ──────────────────────────────────────────────────────
async function profileSimple(sock, chatId, senderId, message, args) {
    try {
        const senderJid = toWhatsAppJid(senderId);
        if (!senderJid) {
            throw new Error('Invalid sender');
        }

        let targetJid = senderJid;

        // Determine target
        const mentionedJids = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0 && mentionedJids[0]) {
            targetJid = mentionedJids[0];
        } else if (args && args.length > 0) {
            const num = args[0].replace(/\D/g, '');
            if (num.length >= 10) targetJid = `${num}@s.whatsapp.net`;
        } else if (message?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
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

        // Send message
        await sock.sendMessage(chatId, {
            image: { url: ppUrl },
            caption: `👤 *${name}*\n🆔 ${targetJid.split('@')[0]}\n\n${FOOTER}`
        }, { quoted: message });

    } catch (err) {
        console.error('[PROFILE] Simple error:', err);
        await sock.sendMessage(chatId, { 
            text: `❌ Error: ${err.message || 'Unknown'}` 
        });
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = profileCommand;
module.exports.simple = profileSimple;
module.exports.name = 'profile';
module.exports.aliases = ['pp', 'avatar', 'pic', 'foto', 'getpp'];
module.exports.category = 'utility';
module.exports.description = 'Get WhatsApp profile picture with user info';
module.exports.usage = '.profile [@mention|phone number]';
module.exports.default = profileCommand;
module.exports.handler = profileCommand;