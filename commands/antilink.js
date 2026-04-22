const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, dummy, message) {
    try {
        // --- SILENT LOGIC: Tunacheki kama bot ni admin bila kutumia library ya nje ---
        let isBotAdmin = false;
        try {
            const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
            if (groupMetadata) {
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                isBotAdmin = groupMetadata.participants.some(p => 
                    (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
                );
            }
        } catch (e) {
            isBotAdmin = false; // Ukifeli hapa bot inakaa kimya tu
        }

        // --- FREE FOR ALL: Hatujacheki 'isSenderAdmin' kabisa ---

        const args = userMessage.trim().split(/\s+/).slice(1);
        const action = args[0]?.toLowerCase();

        if (!action) {
            return await sock.sendMessage(chatId, { 
                text: '```ANTILINK SETUP (FREE)\n\n.antilink on\n.antilink off\n.antilink set delete | kick```' 
            }, { quoted: message });
        }

        // Warning inatokea TU ukijaribu kuwasha (ON) wakati bot si admin
        if (action === 'on' && !isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Bot lazima iwe admin kwanza ili iweze kufuta links.*' 
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '✅ *Antilink turned ON*' : '❌ *Failed*' 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '✅ *Antilink turned OFF*' }, { quoted: message });
                break;

            case 'set':
                const setAction = args[1]?.toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    return await sock.sendMessage(chatId, { text: '*_Choose: delete, kick, or warn_*' });
                }
                await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { text: `✅ *Action set to ${setAction}*` }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: '*_Use .antilink on/off._*' });
        }
    } catch (error) {
        // Hapa hakuna tena sock.sendMessage ya error, bot inatulia
        console.error('Antilink silent error:', error.message);
    }
}

module.exports = { handleAntilinkCommand };
