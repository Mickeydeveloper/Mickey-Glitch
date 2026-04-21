const { getGroupMetadataWithCache } = require('./groupMetadataCache'); 

// Ongeza parameter ya forceRefresh hapa
async function isAdmin(sock, chatId, senderId, forceRefresh = false) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };

        // Tunapitisha forceRefresh hapa kwenda kwenye cache system
        const groupMetadata = await getGroupMetadataWithCache(
            sock.groupMetadata.bind(sock), 
            chatId, 
            forceRefresh 
        );

        if (!groupMetadata) return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };

        const participants = groupMetadata.participants || [];
        
        // Safisha ID ya sender (Ondoa device suffix kama :4 au :12)
        const cleanSenderId = senderId.split(':')[0] + '@s.whatsapp.net';
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        const admins = participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        return {
            isGroup: true,
            isSenderAdmin: admins.includes(cleanSenderId),
            isBotAdmin: admins.includes(botId)
        };
    } catch (e) {
        console.error('Error in isAdmin:', e);
        return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = { isAdmin };
