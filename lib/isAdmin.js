/**
 * Function ya ku-check admin status (Imeboreshwa na kurekebishwa)
 */
async function isAdmin(sock, chatId, senderId) {
    try {
        const cId = (chatId || '').toString().trim();
        const sId = (senderId || '').toString().trim();

        if (!cId.endsWith('@g.us')) {
            return { isSenderAdmin: false, isBotAdmin: false, isGroup: false };
        }

        const metadata = await sock.groupMetadata(cId);
        const participants = metadata.participants || [];

        // Normalize IDs (muhimu sana!)
        const normalizeId = (id) => {
            if (!id) return '';
            return id.toString().split(':')[0].split('@')[0].trim();
        };

        const botId = normalizeId(sock.user?.id);
        const senderNumber = normalizeId(sId);

        let isBotAdmin = false;
        let isSenderAdmin = false;

        for (const p of participants) {
            const pId = normalizeId(p.id || p.jid);
            
            const isAdminRole = p.admin === 'admin' || p.admin === 'superadmin';

            // Check Bot
            if (pId === botId && isAdminRole) {
                isBotAdmin = true;
            }

            // Check Sender
            if (pId === senderNumber && isAdminRole) {
                isSenderAdmin = true;
            }

            // Ikiwa zote mbili zimepatikana, unaweza ku-break (optimization)
            if (isBotAdmin && isSenderAdmin) break;
        }

        return { 
            isSenderAdmin, 
            isBotAdmin, 
            isGroup: true,
            totalParticipants: participants.length 
        };

    } catch (err) {
        console.error('❌ Error in isAdmin utility:', err.message || err);
        return { isSenderAdmin: false, isBotAdmin: false, isGroup: false };
    }
}