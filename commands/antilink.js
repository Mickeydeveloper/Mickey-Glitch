const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        const msgText = typeof userMessage === 'string' ? userMessage : "";
        // Tenganisha maneno: .antilink [0] on [1]
        const args = msgText.trim().split(/\s+/);
        // Action sasa ni args[1] kwa sababu args[0] ni ".antilink"
        const action = args[1]?.toLowerCase();

        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;

        // Ikiwa mtumiaji ameandika ".antilink" pekee (bila on/off)
        if (!action) {
            const statusMsg = `*『 ANTILINK CONFIG 』*\n\n` +
                             `💡 *Maelekezo (Usage):*\n` +
                             `• *.antilink on*\n` +
                             `• *.antilink off*\n` +
                             `• *.antilink set kick*\n\n` +
                             `🛡️ *Bot Admin:* ${isBotAdmin ? 'Tayari ✅' : 'Hajapewa ❌'}`;
            return await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });
        }

        // TEKELEZA AMRI
        if (action === 'on') {
            await setAntilink(chatId, 'on', 'delete');
            let txt = '✅ *Antilink imewashwa!*';
            if (!isBotAdmin) txt += '\n⚠️ _Nipe Admin ili nifute links!_';
            return await sock.sendMessage(chatId, { text: txt }, { quoted: message });
        }

        if (action === 'off') {
            await removeAntilink(chatId, 'on');
            return await sock.sendMessage(chatId, { text: '✅ *Antilink imezimwa.*' }, { quoted: message });
        }

        if (action === 'set') {
            const setAction = args[2]?.toLowerCase(); // mfano: .antilink set kick
            if (!['delete', 'kick', 'warn'].includes(setAction)) {
                return await sock.sendMessage(chatId, { text: '❌ *Tumia: .antilink set delete au kick*' }, { quoted: message });
            }
            await setAntilink(chatId, 'on', setAction);
            return await sock.sendMessage(chatId, { text: `✅ *Action imewekwa: ${setAction.toUpperCase()}*` }, { quoted: message });
        }

    } catch (error) {
        console.error('Antilink Error:', error.message);
    }
}

module.exports = handleAntilinkCommand;
