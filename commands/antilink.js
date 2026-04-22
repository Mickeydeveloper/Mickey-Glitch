const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        // Hakikisha msg ni string
        const msgText = (typeof userMessage === 'string' ? userMessage : "").toLowerCase().trim();
        
        // 1. CHEKI ADMIN WA BOT (SILENT)
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;

        // 2. LOGIC YA KUCHEKI AMRI (Hapa ndio fix ilipo)
        if (msgText.includes('on')) {
            await setAntilink(chatId, 'on', 'delete');
            let jibu = '✅ *Antilink imewashwa (ON)*';
            if (!isBotAdmin) jibu += '\n⚠️ _Nifanye admin ili nifute links!_';
            return await sock.sendMessage(chatId, { text: jibu }, { quoted: message });
        } 
        
        if (msgText.includes('off')) {
            await removeAntilink(chatId, 'on');
            return await sock.sendMessage(chatId, { text: '✅ *Antilink imezimwa (OFF)*' }, { quoted: message });
        }

        if (msgText.includes('set')) {
            const setAction = msgText.includes('kick') ? 'kick' : (msgText.includes('warn') ? 'warn' : 'delete');
            await setAntilink(chatId, 'on', setAction);
            return await sock.sendMessage(chatId, { text: `✅ *Action imewekwa: ${setAction.toUpperCase()}*` }, { quoted: message });
        }

        // 3. MENU (Inatokea tu kama hujatuma on, off, au set)
        const statusMsg = `*『 ANTILINK CONFIG 』*\n\n` +
                         `💡 *Tumia hivi:*\n` +
                         `• *.antilink on*\n` +
                         `• *.antilink off*\n` +
                         `• *.antilink set kick*\n\n` +
                         `🛡️ *Bot Admin:* ${isBotAdmin ? 'Tayari ✅' : 'Hajapewa ❌'}`;
        
        return await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });

    } catch (error) {
        console.error('Antilink Error:', error.message);
    }
}

module.exports = handleAntilinkCommand;
