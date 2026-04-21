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
        
        // Check if command can execute
        const canExecute = adminStatus.isSenderAdmin && adminStatus.isBotAdmin;

        // Send error messages if necessary
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Bot lazima iwe admin!*\n\nTafadhali nika-promote bot kuwa admin wa group.\n\n_(Admins! Promote the bot first to use this command)_',
                quoted: message 
            }).catch(() => {});
            return { ...adminStatus, canExecute: false };
        }

        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Admins tu ndio wanaweza kuitumia hii command!*',
                quoted: message 
            }).catch(() => {});
            return { ...adminStatus, canExecute: false };
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
