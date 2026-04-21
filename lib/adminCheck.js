/**
 * Unified Admin Check Helper for all commands
 * Ensures consistent admin verification across all group commands
 */

const { isAdmin } = require('./isAdmin');
const isOwnerOrSudo = require('./isOwner');

/**
 * Check if sender and bot are admins, respond with appropriate message if not
 * @param {Object} sock - Socket object
 * @param {string} chatId - Chat/Group ID
 * @param {Object} message - Message object (contains key.participant, etc)
 * @returns {Object} - { isSenderAdmin, isBotAdmin, canExecute }
 */
async function checkAdminPermissions(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        
        // Check if sender is owner - if yes, allow execution
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (isOwner) {
            return { isSenderAdmin: true, isBotAdmin: true, canExecute: true };
        }
        
        // Get admin status
        const adminStatus = await isAdmin(sock, chatId, senderId);
        
        // Allow execution if sender is admin (bot admin not required)
        const canExecute = adminStatus.isSenderAdmin;

        // Send error message if sender is not admin
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Admins tu ndio wanaweza kuitumia hii command!*',
                quoted: message 
            }).catch(() => {});
            return { ...adminStatus, canExecute: false };
        }

        // Send warning if bot is not admin (but still allow execution)
        if (!adminStatus.isBotAdmin && adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *Kumbuka:* Bot sio admin. Baadhi ya commands zinaweza kushindwa.\n\n_Bot needs admin for full functionality_',
                quoted: message 
            }).catch(() => {});
        }

        return { ...adminStatus, canExecute: true };
    } catch (e) {
        console.error('[adminCheck] Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Error checking admin status*',
            quoted: message 
        }).catch(() => {});
        return { isSenderAdmin: false, isBotAdmin: false, canExecute: false };
    }
}

module.exports = { checkAdminPermissions };
