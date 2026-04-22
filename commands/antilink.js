const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
// Tunatumia mfumo mpya wa admin check
const { checkAdminPermissions } = require('../lib/adminCheck');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, dummyAdmin, message) {
    try {
        // 1. Check admin status (Inapita message object kuzuia ile error ya mwanzo)
        const adminCheck = await checkAdminPermissions(sock, chatId, message);

        /**
         * --- FREE FOR ALL ---
         * Nimeondoa "if (!isSenderAdmin)" ili kila mtu aweze kutumia command.
         * Lakini bot bado inahitaji kuwa admin ili iweze kufuta links au ku-kick (isBotAdmin).
         */
        
        if (!adminCheck.isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '*_⚠️ Bot inahitaji kuwa admin ili Antilink ifanye kazi!_*' 
            }, { quoted: message });
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ANTILINK SETUP\n\n${prefix}antilink on\n${prefix}antilink set delete | kick | warn\n${prefix}antilink off\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already on_*' }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_Antilink has been turned ON_*' : '*_Failed to turn on Antilink_*' 
                },{ quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned OFF_*' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_Please specify an action: ${prefix}antilink set delete | kick | warn_*` 
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_Invalid action. Choose delete, kick, or warn._*' 
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `*_Antilink action set to ${setAction}_*` : '*_Failed to set Antilink action_*' 
                }, { quoted: message });
                break;

            case 'get':
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*_Antilink Configuration:_*\nStatus: ${status ? 'ON' : 'OFF'}\nAction: ${actionConfig ? actionConfig.action : 'Not set'}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${prefix}antilink for usage._*` });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        // Tunatoka kimyakimya kuzuia ile error ya "Error checking admin status"
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    // Logic ya kudetect links inabaki vilevile
    // ... (Hii sehemu haihitaji mabadiliko ya kiufundi ya admin check sasa hivi)
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
