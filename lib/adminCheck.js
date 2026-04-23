/**
 * Unified Admin Check Helper for all commands
 */

// Hakikisha faili ya isAdmin.js ina-export function moja kwa moja
const isAdmin = require('./isAdmin'); 
const isOwnerOrSudo = require('./isOwner');

/**
 * Check if sender and bot are admins
 */
async function checkAdminPermissions(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;

        // 1. Check kama ni Owner/Sudo
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (isOwner) {
            return { isSenderAdmin: true, isBotAdmin: true, canExecute: true };
        }

        // 2. Angalia Admin Status
        // Hapa ndipo error ilikuwa inatokea
        const adminStatus = await isAdmin(sock, chatId, senderId);

        const canExecute = adminStatus.isSenderAdmin;

        // 3. Jibu kama sender sio admin
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Admins tu ndio wanaweza kuitumia hii command!*',
                quoted: message 
            }).catch(() => {});
            return { ...adminStatus, canExecute: false };
        }

        // 4. Warning kama Bot sio admin
        if (!adminStatus.isBotAdmin && adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *Kumbuka:* Bot sio admin. Ipe admin ili ifanye kazi vizuri.',
                quoted: message 
            }).catch(() => {});
        }

        return { ...adminStatus, canExecute: true };
    } catch (e) {
        console.error('[adminCheck] Error details:', e.message);
        return { isSenderAdmin: false, isBotAdmin: false, canExecute: false };
    }
}

module.exports = { checkAdminPermissions };
