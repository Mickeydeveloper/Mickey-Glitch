const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

/**
 * 🔹 Check if user is admin (SELF DETECTION)
 */
async function checkIfAdmin(sock, chatId, senderId) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;

        const user = participants.find(p => p.id === senderId);
        return user && (user.admin === 'admin' || user.admin === 'superadmin');
    } catch (e) {
        console.error('Error checking admin:', e);
        return false;
    }
}

/**
 * 🔹 ANTILINK COMMAND HANDLER
 */
async function handleAntilinkCommand(sock, chatId, userMessage, senderId, message) {
    try {
        const isSenderAdmin = await checkIfAdmin(sock, chatId, senderId);

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ANTILINK SETUP

${prefix}antilink on
${prefix}antilink set delete | kick | warn
${prefix}antilink off
${prefix}antilink get
\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already ON_*' }, { quoted: message });
                    return;
                }

                await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned ON_*' }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned OFF_*' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_Specify action: ${prefix}antilink set delete | kick | warn_*` 
                    }, { quoted: message });
                    return;
                }

                const setAction = args[1];

                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_Invalid action. Use delete, kick, or warn._*' 
                    }, { quoted: message });
                    return;
                }

                await setAntilink(chatId, 'on', setAction);

                await sock.sendMessage(chatId, { 
                    text: `*_Antilink action set to ${setAction}_*` 
                }, { quoted: message });
                break;

            case 'get':
                const config = await getAntilink(chatId, 'on');

                await sock.sendMessage(chatId, { 
                    text: `*_Antilink Config:_*
Status: ${config?.enabled ? 'ON' : 'OFF'}
Action: ${config?.action || 'Not set'}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${prefix}antilink_*` });
        }

    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*' });
    }
}

/**
 * 🔹 LINK DETECTION HANDLER
 */
async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    try {
        const config = await getAntilink(chatId, 'on');
        if (!config || !config.enabled) return;

        // 🔹 Skip admins
        const isAdmin = await checkIfAdmin(sock, chatId, senderId);
        if (isAdmin) return;

        const linkRegex = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i;

        if (!linkRegex.test(userMessage)) return;

        const msgId = message.key.id;
        const participant = message.key.participant || senderId;

        // 🔥 ACTION HANDLING
        if (config.action === 'delete') {
            await sock.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    fromMe: false,
                    id: msgId,
                    participant: participant
                }
            });
        }

        if (config.action === 'kick') {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
        }

        if (config.action === 'warn') {
            // unaweza kubuild mfumo wa warning hapa (DB)
        }

        await sock.sendMessage(chatId, {
            text: `⚠️ @${senderId.split('@')[0]} links are not allowed!`,
            mentions: [senderId]
        });

    } catch (error) {
        console.error('Error detecting links:', error);
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};