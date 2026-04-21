const { getGroupMetadataWithCache } = require('./groupMetadataCache'); 

// Namba za ma-admin wa kudumu (Hardcoded admin numbers)
const SUDO_NUMBERS = [
    '255612130873@s.whatsapp.net',
    '255615944741@s.whatsapp.net'
];

async function isAdmin(sock, chatId, senderId, forceRefresh = false) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };

        const groupMetadata = await getGroupMetadataWithCache(
            sock.groupMetadata.bind(sock), 
            chatId, 
            forceRefresh 
        );

        if (!groupMetadata) return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };

        const participants = groupMetadata.participants || [];

        const cleanSenderId = senderId.split(':')[0] + '@s.whatsapp.net';
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Pata list ya admin wa group (Get group admins)
        const admins = participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        // Angalia kama ni admin wa group AU yupo kwenye list ya SUDO
        const isSenderAdmin = admins.includes(cleanSenderId) || SUDO_NUMBERS.includes(cleanSenderId);

        return {
            isGroup: true,
            isSenderAdmin: isSenderAdmin,
            isBotAdmin: admins.includes(botId)
        };
    } catch (e) {
        console.error('Err in isAdmin:', e);
        return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = { isAdmin };
