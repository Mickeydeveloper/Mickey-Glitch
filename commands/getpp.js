/**
 * profile.js - Get WhatsApp Profile Picture
 * Simple version using sock.sendMessage only
 * Usage: .profile [@mention or phone number]
 */

const DEFAULT_AVATAR = 'https://i.imgur.com/6N4H8Xj.png';
const { A2UI, sendA2UIWidget } = require('../lib/a2ui');

// ─── HELPERS ──────────────────────────────────────────────────────────────
function extractJid(value) {
    if (!value) return null;

    if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
    }
    
    // If it's already a string with @
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.includes('@s.whatsapp.net')) return trimmed;
        if (trimmed.includes('@g.us')) return trimmed;
        if (trimmed.includes('@')) {
            const parts = trimmed.split('@');
            if (parts[0] && parts[0].length >= 10) {
                return `${parts[0]}@s.whatsapp.net`;
            }
            return trimmed;
        }
        // Just numbers
        const numbers = trimmed.replace(/[^0-9]/g, '');
        if (numbers.length >= 10 && numbers.length <= 15) {
            return `${numbers}@s.whatsapp.net`;
        }
    }
    
    // If it's an object with jid property
    if (value && typeof value === 'object') {
        const jid = value.jid || value.id || value.participant || value.remoteJid || value.sender;
        if (jid) return extractJid(jid);
    }
    
    return null;
}

function getDisplayName(jid, message) {
    if (!jid) return 'User';
    
    try {
        // Check store
        if (global.store?.contacts?.[jid]) {
            const contact = global.store.contacts[jid];
            return contact.name || contact.notify || contact.verifiedName || jid.split('@')[0];
        }
        
        // Check message pushName
        if (message?.pushName) {
            return message.pushName;
        }
        
        // Fallback to phone number
        const phone = jid.split('@')[0];
        if (phone && phone.length >= 10) {
            // Format phone number
            if (phone.startsWith('255') && phone.length === 12) {
                return `+${phone.slice(0,3)} ${phone.slice(3,6)} ${phone.slice(6,9)} ${phone.slice(9)}`;
            }
            return phone;
        }
        return 'User';
    } catch {
        return jid.split('@')[0] || 'User';
    }
}

function formatJid(jid) {
    if (!jid) return 'Unknown';
    const phone = jid.split('@')[0];
    if (!phone) return 'Unknown';
    
    // Format with country code
    if (phone.startsWith('255') && phone.length === 12) {
        return `+${phone.slice(0,3)} ${phone.slice(3,6)} ${phone.slice(6,9)} ${phone.slice(9)}`;
    }
    if (phone.startsWith('1') && phone.length === 11) {
        return `+${phone.slice(0,1)} ${phone.slice(1,4)} ${phone.slice(4,7)} ${phone.slice(7)}`;
    }
    if (phone.length === 10) {
        return `+${phone.slice(0,3)} ${phone.slice(3,6)} ${phone.slice(6)}`;
    }
    return phone;
}

// ─── MAIN PROFILE COMMAND ──────────────────────────────────────────────────
async function profileCommand(sock, chatId, senderId, message, args) {
    try {
        if (senderId && typeof senderId === 'object' && senderId.message && (typeof message === 'string' || Array.isArray(message))) {
            const telegramMessage = senderId;
            senderId = telegramMessage.sender || chatId;
            args = message;
            message = telegramMessage;
        }

        // ─── 1. VALIDATE INPUTS ──────────────────────────────────────────
        if (!sock) throw new Error('Socket not available');
        if (!chatId) throw new Error('Chat ID missing');
        if (!senderId) throw new Error('Sender ID missing');

        // ─── 2. DETERMINE TARGET JID ────────────────────────────────────
        let targetJid = null;
        
        // Get sender JID
        const senderJid = extractJid(senderId);
        if (!senderJid) throw new Error('Could not determine sender');

        const commandArgs = Array.isArray(args)
            ? args
            : typeof args === 'string'
                ? args.trim().split(/\s+/).filter(Boolean)
                : args == null
                    ? []
                    : [String(args)];

        // Check for mentions
        const mentionedJids = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0 && mentionedJids[0]) {
            const jid = extractJid(mentionedJids[0]);
            if (jid) targetJid = jid;
        }
        
        // Check for quoted message
        if (!targetJid && message?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = message.message.extendedTextMessage.contextInfo;
            if (quoted?.participant) {
                const jid = extractJid(quoted.participant);
                if (jid) targetJid = jid;
            }
        }
        
        // Check for phone number in args
        if (!targetJid && commandArgs.length > 0) {
            const arg = commandArgs[0] || '';
            const numbers = arg.replace(/[^0-9]/g, '');
            if (numbers.length >= 10 && numbers.length <= 15) {
                targetJid = `${numbers}@s.whatsapp.net`;
            }
        }
        
        // Default to sender
        if (!targetJid) {
            targetJid = senderJid;
        }

        // Validate target JID
        if (!targetJid || targetJid.length < 10) {
            throw new Error('Invalid target user');
        }

        // ─── 3. GET PROFILE PICTURE ─────────────────────────────────────
        let ppUrl = DEFAULT_AVATAR;
        let hasProfilePic = false;
        
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
            hasProfilePic = true;
        } catch (err) {
            console.log('[PROFILE] No profile picture:', err.message);
            ppUrl = DEFAULT_AVATAR;
        }

        // ─── 4. GET USER INFO ────────────────────────────────────────────
        const displayName = getDisplayName(targetJid, message);
        const phoneNumber = formatJid(targetJid);
        const isSelf = targetJid === senderJid;
        
        // Get status
        let status = 'No status set';
        try {
            const statusData = await sock.getStatus(targetJid);
            if (statusData?.status) {
                status = statusData.status;
            }
        } catch {
            // Ignore status errors
        }

        // ─── 5. BUILD CAPTION ────────────────────────────────────────────
        let caption = `👤 *PROFILE*\n\n`;
        caption += `📋 *Name:* ${displayName}\n`;
        caption += `📱 *Phone:* ${phoneNumber}\n`;
        caption += `📝 *Status:* ${status}\n`;
        caption += `🔄 *Type:* ${isSelf ? 'Your Profile' : 'User Profile'}\n`;
        caption += `🖼️ *Photo:* ${hasProfilePic ? '✅ Available' : '❌ Not Set'}\n\n`;
        caption += `🆔 *JID:* ${targetJid}`;

        // ─── 6. SEND MESSAGE ─────────────────────────────────────────────
        // Send the profile picture through A2UI, with a normal image fallback.
        const isTelegram = typeof chatId !== 'string' || !chatId.includes('@');
        try {
            if (isTelegram) {
                await sock.sendMessage(chatId, {
                    image: { url: ppUrl },
                    caption,
                }, { quoted: message });
            } else {
            const ui = new A2UI();
            const profileImage = ui.image(ppUrl, { variant: 'header', fit: 'cover' });
            const profileTitle = ui.text(displayName, { variant: 'h1' });
            const profileDetails = ui.text(`${phoneNumber}\n${status}`, { variant: 'body' });
            const profileCard = ui.card(ui.column([profileImage, profileTitle, profileDetails]));
            ui.root([profileCard]);

            await sendA2UIWidget(sock, chatId, {
                a2ui: ui,
                bodyText: caption,
                footer: 'Mickey Glitch Profile',
                quoted: message,
            });
            }
        } catch (a2uiError) {
            console.error('[PROFILE] A2UI send failed, using image fallback:', a2uiError);
            await sock.sendMessage(chatId, {
                image: { url: ppUrl },
                caption,
            }, { quoted: message });
        }

        // Send success reaction
        await sock.sendMessage(chatId, { 
            react: { text: '✅', key: message.key } 
        });

    } catch (err) {
        console.error('[PROFILE] Error:', err);
        
        try {
            // Send error reaction
            await sock.sendMessage(chatId, { 
                react: { text: '❌', key: message.key } 
            });
            
            // Send error message
            await sock.sendMessage(chatId, { 
                text: `❌ *Profile Error*\n\n${err.message || 'Unknown error'}\n\n` +
                      `📌 *Usage:*\n` +
                      `• .profile - Your profile\n` +
                      `• .profile @user - Tagged user\n` +
                      `• .profile 255xxx - Phone number\n` +
                      `• Reply .profile to message` 
            }, { quoted: message });
        } catch (err2) {
            console.error('[PROFILE] Failed to send error:', err2);
        }
    }
}

// ─── SIMPLE VERSION ──────────────────────────────────────────────────────
async function profileSimple(sock, chatId, senderId, message, args) {
    try {
        const senderJid = extractJid(senderId);
        if (!senderJid) throw new Error('Invalid sender');

        const commandArgs = Array.isArray(args)
            ? args
            : typeof args === 'string'
                ? args.trim().split(/\s+/).filter(Boolean)
                : args == null
                    ? []
                    : [String(args)];

        let targetJid = senderJid;

        // Check mentions
        const mentionedJids = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0 && mentionedJids[0]) {
            const jid = extractJid(mentionedJids[0]);
            if (jid) targetJid = jid;
        }
        
        // Check args
        if (commandArgs.length > 0) {
            const numbers = commandArgs[0].replace(/[^0-9]/g, '');
            if (numbers.length >= 10) {
                targetJid = `${numbers}@s.whatsapp.net`;
            }
        }

        // Get profile picture
        let ppUrl = DEFAULT_AVATAR;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch {
            // Use default
        }

        // Get name
        const name = getDisplayName(targetJid, message);

        // Send message
        await sock.sendMessage(chatId, {
            image: { url: ppUrl },
            caption: `👤 *${name}*\n📱 ${formatJid(targetJid)}`
        }, { quoted: message });

    } catch (err) {
        console.error('[PROFILE] Simple error:', err);
        await sock.sendMessage(chatId, { 
            text: `❌ ${err.message || 'Error'}` 
        });
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = profileCommand;
module.exports.simple = profileSimple;
module.exports.name = 'profile';
module.exports.aliases = ['pp', 'avatar', 'pic', 'foto', 'getpp'];
module.exports.category = 'utility';
module.exports.description = 'Get WhatsApp profile picture';
module.exports.usage = '.profile [@mention|phone number]';
module.exports.default = profileCommand;
module.exports.handler = profileCommand;