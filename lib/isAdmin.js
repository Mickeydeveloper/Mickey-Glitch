// isAdmin.js
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

/**
 * Normalize any WhatsApp ID (jid/lid/number)
 */
function normalize(id = '') {
    try {
        return jidNormalizedUser(id);
    } catch {
        return id;
    }
}

async function isAdmin(sock, chatId, senderId) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];

        // Normalize IDs
        const botId = normalize(sock.user?.id);
        const sender = normalize(senderId);

        // Find bot in group
        const bot = participants.find(p => normalize(p.id) === botId);

        // Find sender in group
        const user = participants.find(p => normalize(p.id) === sender);

        const isBotAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin';
        const isSenderAdmin = user?.admin === 'admin' || user?.admin === 'superadmin';

        // 🔥 Optional strict mode (bot lazma awe admin)
        if (!isBotAdmin) {
            console.log('⚠️ Bot is NOT admin in this group!');
        }

        return {
            isSenderAdmin: !!isSenderAdmin,
            isBotAdmin: !!isBotAdmin
        };

    } catch (err) {
        console.error('❌ Error in isAdmin:', err);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;