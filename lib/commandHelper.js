/**
 * commandHelper.js - Common utilities for command execution
 */

const isAdminLib = require('./isAdmin');

/**
 * Extract sender ID from message object
 * Handles different message sources (group, private, etc)
 */
function getSenderId(m) {
    if (!m || !m.key) return null;
    return m.key.participant || m.key.remoteJid;
}

/**
 * Comprehensive admin check with proper error handling
 * Returns: { isAdmin: boolean, isBotAdmin: boolean, error?: string }
 */
async function checkAdminPermissions(sock, chatId, m, options) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        
        // If not a group, return false
        if (!isGroup) {
            return {
                isAdmin: false,
                isBotAdmin: false,
                error: 'Amri hii ni ya makundi tu'
            };
        }

        // Use the passed options if available (from main.js)
        if (options?.isAdmin !== undefined) {
            const senderId = getSenderId(m);
            
            // Get bot admin status from group metadata
            const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
            if (!groupMeta) {
                return {
                    isAdmin: options.isAdmin,
                    isBotAdmin: false,
                    error: 'Imeshindwa kupata taarifa za kikundi'
                };
            }

            const botId = sock.user?.id;
            const botParticipant = groupMeta.participants.find(p => 
                p.id === botId || String(p.id).includes(String(botId).split(':')[0])
            );
            const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

            return {
                isAdmin: options.isAdmin,
                isBotAdmin: isBotAdmin,
                isOwner: options.isOwner
            };
        }

        // Fallback: use isAdmin library
        const senderId = getSenderId(m);
        const adminStatus = await isAdminLib(sock, chatId, senderId);

        return {
            isAdmin: adminStatus.isSenderAdmin,
            isBotAdmin: adminStatus.isBotAdmin,
            isOwner: options?.isOwner || false
        };

    } catch (err) {
        console.error('Admin check error:', err.message);
        return {
            isAdmin: false,
            isBotAdmin: false,
            error: 'Hitilafu ya admin check'
        };
    }
}

/**
 * Validate that user has admin permission
 * Shows error message if not admin
 */
async function requireAdmin(sock, chatId, m, adminCheck) {
    if (!adminCheck.isAdmin && !adminCheck.isOwner) {
        await sock.sendMessage(chatId, {
            text: '⚠️ *Wewe lazima uwe admin au owner ili kutumia amri hii!*'
        }, { quoted: m }).catch(() => {});
        return false;
    }
    return true;
}

/**
 * Validate that bot has admin permission
 * Shows error message if bot is not admin
 */
async function requireBotAdmin(sock, chatId, m, adminCheck) {
    if (!adminCheck.isBotAdmin) {
        await sock.sendMessage(chatId, {
            text: '❌ *Bot lazima iwe admin ili iweze kutekeleza amri hii!*'
        }, { quoted: m }).catch(() => {});
        return false;
    }
    return true;
}

module.exports = {
    getSenderId,
    checkAdminPermissions,
    requireAdmin,
    requireBotAdmin
};
