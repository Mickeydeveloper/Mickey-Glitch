const { isAdmin } = require('../lib/isAdmin');

async function resetlinkCommand(sock, chatId, message, text) {
    try {
        // Extract sender ID from message
        const senderId = message.key.participant || message.key.remoteJid;
        
        // Check if sender is admin using the isAdmin function
        const adminStatus = await isAdmin(sock, chatId, senderId);

        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Only admins can use this command!' }, { quoted: message });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Bot must be admin to reset group link!' }, { quoted: message });
            return;
        }

        // Reset the group link
        const newCode = await sock.groupRevokeInvite(chatId);
        
        // Send the new link
        await sock.sendMessage(chatId, { 
            text: `✅ Group link has been successfully reset\n\n📌 New link:\nhttps://chat.whatsapp.com/${newCode}`,
            quoted: message
        });

    } catch (error) {
        console.error('Error in resetlink command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to reset group link!', quoted: message });
    }
}

module.exports = resetlinkCommand; 