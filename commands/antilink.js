const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        // 1. FIX: Hakikisha userMessage ni string kuzuia ".trim is not a function"
        const msgText = typeof userMessage === 'string' ? userMessage : "";
        const args = msgText.trim().split(/\s+/).slice(1);
        const action = args[0]?.toLowerCase();

        // 2. KIMYAKIMYA: Cheki kama bot ni admin (Muhimu kwa kufuta links)
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;

        // 3. IKIWA HAKUNA ACTION (.antilink pekee)
        if (!action) {
            const statusMsg = `*『 ANTILINK CONFIG 』*\n\n` +
                             `💡 *Maelekezo (Usage):*\n` +
                             `• *.antilink on* (Washa)\n` +
                             `• *.antilink off* (Zima)\n` +
                             `• *.antilink set kick* (Auto-kick)\n` +
                             `• *.antilink set delete* (Futa tu)\n\n` +
                             `🛡️ *Bot Admin:* ${isBotAdmin ? 'Tayari ✅' : 'Hajapewa ❌'}\n` +
                             `🔓 *Hali:* FREE (Kila mtu anaweza kutumia)`;
            
            return await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });
        }

        // 4. TEKELEZA AMRI
        switch (action) {
            case 'on':
                await setAntilink(chatId, 'on', 'delete');
                let onResponse = '✅ *Antilink imewashwa kikamilifu!*';
                if (!isBotAdmin) onResponse += '\n\n⚠️ _Kumbuka: Bot lazima iwe admin ili iweze kufuta links._';
                await sock.sendMessage(chatId, { text: onResponse }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '✅ *Antilink imezimwa.*' }, { quoted: message });
                break;

            case 'set':
                const setAction = args[1]?.toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    return await sock.sendMessage(chatId, { text: '❌ *Chagua action sahihi: delete au kick.*' }, { quoted: message });
                }
                await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { text: `✅ *Antilink sasa itafanya: ${setAction.toUpperCase()}*` }, { quoted: message });
                break;

            case 'get':
                const config = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*『 ANTILINK STATUS 』*\n\n• Hali: ${config ? 'ON ✅' : 'OFF ❌'}\n• Action: ${config?.action || 'delete'}` 
                }, { quoted: message });
                break;

            default:
                // Ikitumika amri isiyojulikana, bot inakaa kimya au inatoa mwongozo mfupi
                break;
        }

    } catch (error) {
        // Hapa tunahakikisha bot haifungi (crash) hata kukiwa na error kubwa
        console.error('Antilink Silent Error Fix:', error.message);
    }
}

// Hakikisha hapa unatoa function yenyewe
module.exports = handleAntilinkCommand;
