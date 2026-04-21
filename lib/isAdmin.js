/**
 * Function ya ku-check admin status (Sender na Bot)
 * Imeboreshwa kufuata muundo wa handlers nyingine
 */
async function isAdmin(sock, chatId, senderId) {
    try {
        const sId = (senderId || '').toString();
        const cId = (chatId || '').toString();

        // Check kama ni group (Verify if it's a group)
        if (!cId.endsWith('@g.us')) {
            return { isSenderAdmin: false, isBotAdmin: false, isGroup: false };
        }

        const metadata = await sock.groupMetadata(cId);
        const participants = metadata.participants || [];

        // IDs za Bot
        const botId = (sock.user?.id || '').toString();
        const botLid = (sock.user?.lid || '').toString();
        const botNumber = botId.split(':')[0].split('@')[0];

        // IDs za Sender
        const senderNumber = sId.split(':')[0].split('@')[0];

        // 🤖 Check kama Bot ni Admin
        const isBotAdmin = participants.some(p => {
            const pId = (p.id || '').toString();
            const pLid = (p.lid || '').toString();
            const pNum = pId.split('@')[0];
            
            return (pId === botId || pLid === botLid || pNum === botNumber) && 
                   (p.admin === 'admin' || p.admin === 'superadmin');
        });

        // 👤 Check kama Sender ni Admin
        const isSenderAdmin = participants.some(p => {
            const pId = (p.id || '').toString();
            const pLid = (p.lid || '').toString();
            const pNum = pId.split('@')[0];

            return (pId === sId || pLid === sId || pNum === senderNumber) && 
                   (p.admin === 'admin' || p.admin === 'superadmin');
        });

        return { isSenderAdmin, isBotAdmin, isGroup: true };
    } catch (err) {
        console.error('❌ Error in isAdmin utility:', err);
        return { isSenderAdmin: false, isBotAdmin: false, isGroup: false };
    }
}

/**
 * Handler ya command (Inafata muundo wa handleAntilinkCommand)
 * Inatumika kuonyesha status ya admin kwenye chat
 */
async function handleAdminCheckCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin, isGroup } = await isAdmin(sock, chatId, senderId);

        if (!isGroup) {
            await sock.sendMessage(chatId, { text: '*_Hii command inafanya kazi kwenye group pekee!_*' }, { quoted: message });
            return;
        }

        let response = `*📊 ADMIN STATUS CHECK*\n\n`;
        response += `👤 *Wewe:* ${isSenderAdmin ? '✅ Admin' : '❌ Member'}\n`;
        response += `🤖 *Bot:* ${isBotAdmin ? '✅ Admin' : '❌ Sio Admin (Nipandishe vyeo nimudu kazi)'}`;

        await sock.sendMessage(chatId, { text: response }, { quoted: message });
    } catch (error) {
        console.error('Error in admin check command:', error);
    }
}

module.exports = {
    isAdmin, // Inatumika kama export ya kawaida (Utility)
    handleAdminCheckCommand // Inatumika kama handler ya command (Command Handler)
};
