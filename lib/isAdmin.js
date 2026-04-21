/**
 * isAdmin.js
 * Function ya ku-check admin status ya Sender na Bot kwenye group
 * Imeboreshwa kwa Baileys v6+ na kufanya kazi vizuri zaidi
 */

async function isAdmin(sock, chatId, senderId) {
    try {
        const cId = (chatId || '').toString().trim();
        const sId = (senderId || '').toString().trim();

        // Check kama ni group
        if (!cId.endsWith('@g.us')) {
            return { 
                isSenderAdmin: false, 
                isBotAdmin: false, 
                isGroup: false 
            };
        }

        const metadata = await sock.groupMetadata(cId);
        const participants = metadata.participants || [];

        // Helper function ku-normalize ID (muhimu sana!)
        const normalizeId = (id) => {
            if (!id) return '';
            let cleanId = id.toString()
                .split(':')[0]      // Remove :0 or :1
                .split('@')[0]      // Remove @s.whatsapp.net au @g.us
                .trim();
            return cleanId;
        };

        // Bot ID
        const botId = normalizeId(sock.user?.id || sock.user?.jid);

        // Sender ID
        const senderNumber = normalizeId(sId);

        let isBotAdmin = false;
        let isSenderAdmin = false;

        // Loop kupitia participants
        for (const p of participants) {
            const participantId = normalizeId(p.id || p.jid);

            const isAdminRole = (p.admin === 'admin' || p.admin === 'superadmin');

            // Check kama ni Bot
            if (participantId === botId && isAdminRole) {
                isBotAdmin = true;
            }

            // Check kama ni Sender
            if (participantId === senderNumber && isAdminRole) {
                isSenderAdmin = true;
            }

            // Optimization: Ikiwa zote mbili zimepatikana, acha loop
            if (isBotAdmin && isSenderAdmin) break;
        }

        return { 
            isSenderAdmin, 
            isBotAdmin, 
            isGroup: true,
            totalParticipants: participants.length,
            groupName: metadata.subject || 'Unknown Group'
        };

    } catch (err) {
        console.error('❌ Error in isAdmin utility:', err.message || err);
        return { 
            isSenderAdmin: false, 
            isBotAdmin: false, 
            isGroup: false 
        };
    }
}

/**
 * Handler ya kuonyesha Admin Status (Command: .admincheck au .isadmin)
 */
async function handleAdminCheckCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin, isGroup, groupName } = await isAdmin(sock, chatId, senderId);

        if (!isGroup) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
            return;
        }

        let response = `*📊 ADMIN STATUS CHECK*\n\n`;
        response += `🏷️ *Group:* ${groupName}\n\n`;
        response += `👤 *Wewe:* ${isSenderAdmin ? '✅ Admin' : '❌ Sio Admin'}\n`;
        response += `🤖 *Bot:* ${isBotAdmin ? '✅ Admin' : '❌ Sio Admin'}\n\n`;
        
        if (!isBotAdmin) {
            response += `⚠️ *Kumbuka:* Bot inahitaji kuwa Admin ili kufanya kazi vizuri (antilink, welcome, etc)`;
        }

        await sock.sendMessage(chatId, { text: response }, { quoted: message });

    } catch (error) {
        console.error('Error in handleAdminCheckCommand:', error);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Kuna tatizo katika kuangalia admin status_*' 
        }, { quoted: message });
    }
}

module.exports = {
    isAdmin,
    handleAdminCheckCommand
};