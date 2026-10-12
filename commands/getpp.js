async function getppCommand(sock, chatId, message) {
    try {
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        const messageText = message.message?.conversation
            || message.message?.extendedTextMessage?.text
            || message.message?.imageMessage?.caption
            || '';
        const phoneNumber = messageText.trim().split(/\s+/).slice(1).join('').replace(/\D/g, '');
        const explicitTarget = phoneNumber ? `${phoneNumber}@s.whatsapp.net` : null;
        const targetJid = contextInfo?.mentionedJid?.[0]
            || contextInfo?.participant
            || explicitTarget
            || message.key?.participant
            || message.key?.remoteJid
            || chatId;

        const profileUrl = await sock.profilePictureUrl(targetJid, 'image');

        await sock.sendMessage(chatId, {
            image: { url: profileUrl },
            caption: `Profile picture of @${targetJid.split('@')[0]}`,
            mentions: [targetJid]
        }, { quoted: message });
    } catch (error) {
        console.error('Error in getpp command:', error);
        await sock.sendMessage(chatId, {
            text: 'No profile picture was found for this user.'
        }, { quoted: message });
    }
}

module.exports = getppCommand;