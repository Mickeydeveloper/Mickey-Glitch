/**
 * Unified Admin Check Helper - FIXED VERSION
 */

// ONDOA MABANO { } HAPA:
const isAdmin = require('./isAdmin'); 
const isOwnerOrSudo = require('./isOwner');

/**
 * Check if sender and bot are admins
 */
async function checkAdminPermissions(sock, chatId, message) {
    try {
        // Tunapata ID ya mtumaji (sender)
        const senderId = message.key.participant || message.key.remoteJid;

        // 1. Angalia kama ni Owner (Sudo) kupitia helper nyingine
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (isOwner) {
            return { isSenderAdmin: true, isBotAdmin: true, canExecute: true };
        }

        // 2. ITA FUNCTION YA isAdmin (Sasa itafanya kazi bila error)
        const adminStatus = await isAdmin(sock, chatId, senderId);

        // canExecute itakuwa true kama sender ni admin au sudo
        const canExecute = adminStatus.isSenderAdmin;

        // 3. Kama mtumiaji si admin, mpe jibu la kukataliwa
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Admins tu ndio wanaweza kuitumia hii command!*',
                quoted: message 
            }).catch(() => {});
            return { ...adminStatus, canExecute: false };
        }

        // 4. Kama bot si admin, mpe onyo (Warning) lakini ruhusu amri iendelee
        if (!adminStatus.isBotAdmin && adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *Kumbuka:* Bot sio admin wa kundi hili. Baadhi ya vitu kama kufuta link (antilink) havitafanya kazi.',
                quoted: message 
            }).catch(() => {});
        }

        return { ...adminStatus, canExecute: true };
    } catch (e) {
        console.error('[adminCheck] Error:', e.message);
        return { isSenderAdmin: false, isBotAdmin: false, canExecute: false };
    }
}

module.exports = { checkAdminPermissions };
