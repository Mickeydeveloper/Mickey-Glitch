const { getGroupMetadataWithCache } = require('./groupMetadataCache'); // Hakikisha path ni sahihi

async function isAdmin(sock, chatId, senderId) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) return { isGroup: false, isSenderAdmin: false, isBotAdmin: false };

        // BADILIKO: Badala ya sock.groupMetadata, tumia ile ya Cache
        // Tunapitisha sock.groupMetadata.bind(sock) kama 'original function'
        const groupMetadata = await getGroupMetadataWithCache(
            sock.groupMetadata.bind(sock), 
            chatId, 
            false // Weka true hapa kama unataka bot i-refresh kila wakati (haishauriwi sana)
        );

        if (!groupMetadata) return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };

        const participants = groupMetadata.participants || [];
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        const admins = participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        return {
            isGroup: true,
            isSenderAdmin: admins.includes(senderId),
            isBotAdmin: admins.includes(botId)
        };
    } catch (e) {
        console.error('Error in isAdmin with cache:', e);
        return { isGroup: true, isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = { isAdmin };
