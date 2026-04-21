const { checkAdminPermissions } = require('../lib/adminCheck');

async function resetlinkCommand(sock, chatId, message, text) {
    try {
        // Check admin permissions (includes owner bypass)
        const adminCheck = await checkAdminPermissions(sock, chatId, message);
        if (!adminCheck.canExecute) {
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