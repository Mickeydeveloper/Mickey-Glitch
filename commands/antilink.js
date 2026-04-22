const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const { checkAdminPermissions } = require('../lib/adminCheck');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, dummy, message) {
    try {
        /**
         * FIX: Tunatumia 'try-catch' hapa kuzuia ile error isitokee kwny chat.
         * Pia tunapitisha 'message' badala ya 'senderId' pekee.
         */
        let isBotAdmin = false;
        try {
            const adminStatus = await checkAdminPermissions(sock, chatId, message);
            isBotAdmin = adminStatus.isBotAdmin;
        } catch (e) {
            // Ikishindwa kucheki, tunakaa kimya (No more "❌ Error checking...")
            console.log("Admin check failed silently");
        }

        // --- FREE FOR ALL ---
        // Kila mtu anaweza kuwasha, lakini Bot LAZIMA iwe admin ili ifanye kazi
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Bot lazima iwe admin ili Antilink ifanye kazi!*' 
            }, { quoted: message });
        }

        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            return await sock.sendMessage(chatId, { 
                text: '```ANTILINK SETUP\n\n.antilink on\n.antilink set delete | kick\n.antilink off```' 
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '✅ *Antilink turned ON*' : '❌ *Failed to turn on*' 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '✅ *Antilink turned OFF*' }, { quoted: message });
                break;

            case 'set':
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    return await sock.sendMessage(chatId, { text: '*_Choose: delete, kick, or warn_*' });
                }
                await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { text: `✅ *Action set to ${setAction}*` }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: '*_Use .antilink to see usage._*' });
        }
    } catch (error) {
        // Hapa tunazuia bot isitume ujumbe wa error kwny kundi
        console.error('Antilink Command Error:', error);
    }
}

module.exports = { handleAntilinkCommand };
