const isAdmin = require('../lib/isAdmin');

async function unmuteCommand(sock, chatId, senderId, message) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use the unmute command.' }, { quoted: message });
        return;
    }

    try {
        await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute the group
        await sock.sendMessage(chatId, { text: 'The group has been unmuted.' }, { quoted: message });
    } catch (error) {
        console.error('Error unmuting the group:', error);
        await sock.sendMessage(chatId, { text: 'An error occurred while unmuting the group. Please try again.' }, { quoted: message });
    }
}

module.exports = unmuteCommand;
