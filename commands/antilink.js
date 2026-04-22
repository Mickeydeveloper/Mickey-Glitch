/**
 * antilink.js - Monitor and delete group links (Stylish)
 */
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');

async function handleAntilinkCommand(sock, chatId, userMessage, message) {
    try {
        // 1. CLEAN MESSAGE (Fix kwa .trim error)
        const msgText = typeof userMessage === 'string' ? userMessage : "";
        const args = msgText.trim().split(/\s+/);
        const action = args[1]?.toLowerCase();

        // 2. CHECK BOT ADMIN STATUS
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;

        // 3. LOGIC YA AMRI
        if (action === 'on') {
            await setAntilink(chatId, 'on', 'delete');
            let resOn = `╭━━━━〔 *ANTILINK ON* 〕━━━━┈⊷\n┃\n┃ ✅ *Hali:* \`ENABLED\`\n┃ 🛡️ *Bot Admin:* ${isBotAdmin ? '`Active ✅`' : '`Missing ❌`'}\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            return await sock.sendMessage(chatId, { text: resOn }, { quoted: message });
        }

        if (action === 'off') {
            await removeAntilink(chatId, 'on');
            let resOff = `╭━━━━〔 *ANTILINK OFF* 〕━━━━┈⊷\n┃\n┃ ✅ *Hali:* \`DISABLED\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            return await sock.sendMessage(chatId, { text: resOff }, { quoted: message });
        }

        if (action === 'set') {
            const mode = args[2]?.toLowerCase();
            if (!['delete', 'kick'].includes(mode)) {
                return await sock.sendMessage(chatId, { text: '⚠️ *Tumia:* `.antilink set delete` au `.antilink set kick`' });
            }
            await setAntilink(chatId, 'on', mode);
            return await sock.sendMessage(chatId, { text: `✅ *Action imewekwa kuwa:* \`${mode.toUpperCase()}\`` });
        }

        // 4. MENU (Kama hajaandika on/off)
        const menu = 
            `╭━━━━〔 *ANTILINK CFG* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 💡 *Usage:* \`.antilink on\` (Washa)\n` +
            `┃ 💡 *Usage:* \`.antilink off\` (Zima)\n` +
            `┃ 💡 *Usage:* \`.antilink set kick\`\n` +
            `┃\n` +
            `┃ 🛡️ *Bot Admin:* ${isBotAdmin ? '`Tayari ✅`' : '`Hajapewa ❌`'}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        return await sock.sendMessage(chatId, { text: menu }, { quoted: message });

    } catch (e) {
        console.error('Antilink Error:', e.message);
    }
}

module.exports = handleAntilinkCommand;
