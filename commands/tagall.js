const isAdmin = require('../lib/isAdmin');  // Move isAdmin to helpers

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: 'Only group admins can use the .tagall command.' }, { quoted: message });
            return;
        }

        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: 'No participants found in the group.' });
            return;
        }

        // Create message with each member on a new line
        let messageText = 'MICKEY GLITCH\n\n';
        participants.forEach(participant => {
            messageText += `@${participant.id.split('@')[0]}\n`; // Add \n for new line
        });

        // Send message with mentions and schedule deletion after 30 seconds
        const sent = await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        });

        // Schedule removal of the tag message after 30 seconds (30000 ms)
        try {
            const msgId = sent?.key?.id || (sent?.message?.conversation && sent.message.conversation.key && sent.message.conversation.key.id);
            if (msgId) {
                setTimeout(async () => {
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: true,
                                id: msgId
                            }
                        });
                    } catch (err) {
                        // log but don't throw
                        console.error('Failed to auto-delete tagall message:', err?.message || err);
                    }
                }, 30000);
            }
        } catch (e) {
            // ignore scheduling errors
        }

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to tag all members.' });
    }
}

module.exports = tagAllCommand;  // Export directly
