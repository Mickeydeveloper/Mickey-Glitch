const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const { checkAdminPermissions } = require('../lib/adminCheck');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, dummy, message) {
    try {
        /**
         * 1. SILENT ADMIN CHECK
         * Tunacheki u-admin wa bot kimyakimya bila kurusha error kwny chat.
         */
        let isBotAdmin = false;
        try {
            const adminStatus = await checkAdminPermissions(sock, chatId, message);
            isBotAdmin = adminStatus.isBotAdmin;
        } catch (e) {
            console.log("Admin check failed silently kuzuia kelele kwny chat.");
            isBotAdmin = false;
        }

        /**
         * 2. BOT ADMIN VALIDATION
         * Bot LAZIMA iwe admin ili antilink iweze kufanya kazi (kufuta links).
         * Lakini tumeshaondoa kizuizi cha 'isSenderAdmin' ili kila mtu aitumie.
         */
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Bot inahitaji u-admin ili Antilink ifanye kazi (Bot needs admin power).* ' 
            }, { quoted: message });
        }

        // Tunachukua maneno baada ya ".antilink "
        const args = userMessage.split(/\s+/).slice(1);
        const action = args[0]?.toLowerCase();

        if (!action) {
            return await sock.sendMessage(chatId, { 
                text: '```ANTILINK SETUP (FREE)\n\n.antilink on\n.antilink off\n.antilink set delete | kick | warn```' 
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '✅ *Antilink imewashwa na kila mtu (Turned ON by User)*' : '❌ *Imeshindwa kuwaka*' 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: '✅ *Antilink imezimwa (Turned OFF)*' 
                }, { quoted: message });
                break;

            case 'set':
                const setAction = args[1]?.toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    return await sock.sendMessage(chatId, { 
                        text: '*_Chagua action sahihi: delete, kick, au warn_*' 
                    }, { quoted: message });
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `✅ *Antilink action sasa ni: ${setAction}*` : '❌ *Imeshindwa kuset*' 
                }, { quoted: message });
                break;

            case 'get':
                const config = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*ANTILINK STATUS*\n\nStatus: ${config ? 'ON ✅' : 'OFF ❌'}\nAction: ${config?.action || 'delete'}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: '*_Tumia .antilink on/off/set._*' });
        }
    } catch (error) {
        // Tunazuia error zisitokee kwny WhatsApp, zinabaki kwny terminal tu
        console.error('Antilink Command Error:', error);
    }
}

module.exports = { handleAntilinkCommand };
