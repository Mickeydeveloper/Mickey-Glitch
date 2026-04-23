/**
 * antilink.js - Fix kwa command kutokurespond
 */
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const { checkAdminPermissions, requireAdmin, requireBotAdmin } = require('../lib/commandHelper');

async function handleAntilinkCommand(sock, chatId, m, text, options) {
    try {
        // 1. ADMIN CHECK
        if (!options.isAdmin && !options.isOwner) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ *Wewe lazima uwe admin!*'
            }, { quoted: m });
        }

        // 2. SMART PARSING (Hapa ndipo fix ilipo)
        const fullText = typeof text === 'string' ? text.trim() : "";
        const args = fullText.split(/\s+/);
        
        // Hii itatafuta maneno on/off/set popote yalipo kwenye amri
        let action = "";
        if (args.some(a => a.toLowerCase() === 'on')) action = 'on';
        else if (args.some(a => a.toLowerCase() === 'off')) action = 'off';
        else if (args.some(a => a.toLowerCase() === 'set')) action = 'set';

        // 3. BOT ADMIN CHECK
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;

        // 4. EXECUTE ACTIONS
        if (action === 'on') {
            await setAntilink(chatId, 'on', 'delete');
            let resOn = `╭━━━━〔 *ANTILINK ON* 〕━━━━┈⊷\n┃\n┃ ✅ *Hali:* \`ENABLED\`\n┃ 🛡️ *Bot Admin:* ${isBotAdmin ? '`Active ✅`' : '`Missing ❌`'}\n┃ 📌 *Hati:* \`Delete Links\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            return await sock.sendMessage(chatId, { text: resOn }, { quoted: m });
        }

        if (action === 'off') {
            await removeAntilink(chatId, 'on');
            let resOff = `╭━━━━〔 *ANTILINK OFF* 〕━━━━┈⊷\n┃\n┃ ✅ *Hali:* \`DISABLED\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            return await sock.sendMessage(chatId, { text: resOff }, { quoted: m });
        }

        if (action === 'set') {
            // Tafuta neno baada ya "set"
            const setIndex = args.findIndex(a => a.toLowerCase() === 'set');
            const mode = args[setIndex + 1]?.toLowerCase();

            if (!['delete', 'kick'].includes(mode)) {
                return await sock.sendMessage(chatId, { text: '⚠️ *Tumia:* `.antilink set delete` au `.antilink set kick`' }, { quoted: m });
            }
            await setAntilink(chatId, 'on', mode);
            return await sock.sendMessage(chatId, { text: `✅ *Action imewekwa:* \`${mode.toUpperCase()}\`` }, { quoted: m });
        }

        // 5. MENU (Kama action haikupatikana)
        const menu = 
            `╭━━━━〔 *ANTILINK SETTINGS* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 📌 *AMRI:*\n` +
            `┃ • \`.antilink on\` - Washa\n` +
            `┃ • \`.antilink off\` - Zima\n` +
            `┃ • \`.antilink set delete\` - Futa link\n` +
            `┃ • \`.antilink set kick\` - Toa mtu\n` +
            `┃\n` +
            `┃ 🛡️ *Bot Admin Status:* ${isBotAdmin ? '`✅ ACTIVE`' : '`❌ MISSING`'}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        return await sock.sendMessage(chatId, { text: menu }, { quoted: m });

    } catch (e) {
        console.error('Antilink Error:', e.message);
    }
}

module.exports = handleAntilinkCommand;
