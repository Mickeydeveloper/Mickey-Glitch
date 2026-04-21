/**
 * lib/isAdmin.js
 * Inakagua kama mtumiaji na Bot ni ma-admin
 */

async function isAdmin(sock, chatId, senderId) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };
        }

        // Pata taarifa za group
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        // Pata ID ya bot
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Tafuta nani ni admin
        const admins = participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        return {
            isGroup: true,
            isSenderAdmin: admins.includes(senderId),
            isBotAdmin: admins.includes(botId),
            participants: participants
        };
    } catch (e) {
        console.error('Error in isAdmin:', e);
        return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = { isAdmin };
