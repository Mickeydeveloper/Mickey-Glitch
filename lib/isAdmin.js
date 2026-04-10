async function isAdmin(sock, chatId, senderId) {
    try {
        // --- FIX: Hakikisha senderId ni string kuzuia .includes() error ---
        const sId = (senderId || '').toString();
        const cId = (chatId || '').toString();

        if (!cId.endsWith('@g.us')) return { isSenderAdmin: false, isBotAdmin: false };

        const metadata = await sock.groupMetadata(cId);
        const participants = metadata.participants || [];

        // Extract bot's pure phone number & IDs
        const botId = (sock.user?.id || '').toString();
        const botLid = (sock.user?.lid || '').toString();
        
        const botNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
        const botIdWithoutSuffix = botId.split('@')[0];
        const botLidNumeric = botLid.split(':')[0].split('@')[0];

        // Process sender IDs
        const senderNumber = sId.includes(':') ? sId.split(':')[0] : (sId.includes('@') ? sId.split('@')[0] : sId);
        const senderIdWithoutSuffix = sId.split('@')[0];

        // 🤖 Check if bot is admin
        const isBotAdmin = participants.some(p => {
            const pId = (p.id || '').toString();
            const pLid = (p.lid || '').toString();
            const pPhoneNumber = pId.split('@')[0];

            const botMatches = (
                botId === pId || 
                botLid === pLid || 
                botLidNumeric === pLid.split(':')[0].split('@')[0] ||
                botNumber === pPhoneNumber ||
                botIdWithoutSuffix === pPhoneNumber
            );

            return botMatches && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        // 👤 Check if sender is admin
        const isSenderAdmin = participants.some(p => {
            const pId = (p.id || '').toString();
            const pLid = (p.lid || '').toString();
            const pPhoneNumber = pId.split('@')[0];

            const senderMatches = (
                sId === pId || 
                sId === pLid || 
                senderNumber === pPhoneNumber ||
                senderIdWithoutSuffix === pPhoneNumber ||
                senderIdWithoutSuffix === pLid.split('@')[0]
            );

            return senderMatches && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        return { isSenderAdmin, isBotAdmin };
    } catch (err) {
        console.error('❌ Error in isAdmin:', err);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;
