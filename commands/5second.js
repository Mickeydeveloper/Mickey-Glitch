const isAdmin = require('../lib/isAdmin');

async function fiveSecondCommand(sock, chatId, message, args = []) {
    const action = (Array.isArray(args) ? args[0] : args)
        ?.toString()
        .trim()
        .toLowerCase();

    if (action !== 'on' && action !== 'off') {
        await sock.sendMessage(chatId, {
            text: 'Matumizi: .5second on/off\nWasha au zima disappearing messages za chat; timer hii inahusu ujumbe mpya unaotumwa na pande zote.',
        }, { quoted: message });
        return;
    }

    const enabled = action === 'on';
    const isGroup = chatId.endsWith('@g.us');

    try {
        if (isGroup) {
            const senderId = message.key.participant || message.key.remoteJid;
            const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, {
                    text: 'Admin wa group pekee anaweza kubadilisha disappearing messages.',
                }, { quoted: message });
                return;
            }
        }

        await sock.sendMessage(chatId, {
            disappearingMessagesInChat: enabled ? 5 : 0,
        });

        await sock.sendMessage(chatId, {
            text: enabled
                ? 'Disappearing messages zimewashwa kwa sekunde 5 kwenye chat hii. Ujumbe mpya wa pande zote mbili utatoweka baada ya muda huo.'
                : 'Disappearing messages zimezimwa kwenye chat hii.',
        }, { quoted: message });
    } catch (error) {
        console.error('[5SECOND] Failed to update disappearing messages:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kubadilisha disappearing messages. Hakikisha WhatsApp/Baileys inaunga mkono setting hii na ujaribu tena.',
        }, { quoted: message });
    }
}

fiveSecondCommand.description = 'Washa au zima disappearing messages kwenye chat husika';
fiveSecondCommand.category = 'TOOLS';

module.exports = fiveSecondCommand;
