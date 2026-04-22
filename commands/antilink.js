const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, dummy, message) {
    try {
        // 1. TAFUTA METADATA KIMYAKIMYA (SILENT)
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // Angalia kama bot ni admin
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;

        // 2. PARSE COMMAND ARGS
        const args = userMessage.trim().split(/\s+/).slice(1);
        const action = args[0]?.toLowerCase();

        // Kama mtumiaji kaandika ".antilink" pekee, muonyeshe maelekezo
        if (!action) {
            return await sock.sendMessage(chatId, { 
                text: '*『 ANTILINK CONFIG 』*\n\n' +
                     '• *.antilink on* (Washa)\n' +
                     '• *.antilink off* (Zima)\n' +
                     '• *.antilink set kick/delete* (Badili action)\n' +
                     '• *.antilink get* (Angalia hali)\n\n' +
                     '_Amri hii ni FREE kwa wote._' 
            }, { quoted: message });
        }

        // 3. EXECUTE ACTIONS
        switch (action) {
            case 'on':
                // Hapa tunawasha bila kujali u-admin wa mtumiaji
                const resOn = await setAntilink(chatId, 'on', 'delete');
                let onText = resOn ? '✅ *Antilink imewashwa!*' : '❌ *Imefeli kuwaka.*';
                if (!isBotAdmin) onText += '\n\n⚠️ _Kumbuka: Bot si admin, hivyo haitaweza kufuta link._';
                
                await sock.sendMessage(chatId, { text: onText }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '✅ *Antilink imezimwa.*' }, { quoted: message });
                break;

            case 'set':
                const setAction = args[1]?.toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    return await sock.sendMessage(chatId, { text: '❌ *Chagua: delete, kick, au warn.*' });
                }
                await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { text: `✅ *Action imewekwa kuwa: ${setAction}*` }, { quoted: message });
                break;

            case 'get':
                const config = await getAntilink(chatId, 'on');
                const status = config ? 'ON ✅' : 'OFF ❌';
                await sock.sendMessage(chatId, { 
                    text: `*『 ANTILINK STATUS 』*\n\n• Hali: ${status}\n• Action: ${config?.action || 'delete'}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: '❓ *Amri haijatambuliwa. Tumia .antilink on/off*' });
        }
    } catch (error) {
        console.error('Antilink Error:', error.message);
        // Hatutumi error yoyote kwenye WhatsApp ili bot iwe silent ikifeli
    }
}

module.exports = { handleAntilinkCommand };
