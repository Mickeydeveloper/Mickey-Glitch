/**
 * antilink.js - Monitor and delete group links (Stylish)
 */
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const { checkAdminPermissions, requireAdmin, requireBotAdmin } = require('../lib/commandHelper');

async function handleAntilinkCommand(sock, chatId, m, text, options) {
    try {
        // 1. CHECK ADMIN PERMISSIONS
        const adminCheck = await checkAdminPermissions(sock, chatId, m, options);
        
        if (!options.isAdmin && !options.isOwner) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ *Wewe lazima uwe admin ili kutumia amri hii!*'
            }, { quoted: m });
        }

        // 2. PARSE COMMAND
        const msgText = typeof text === 'string' ? text.trim() : "";
        const args = msgText.split(/\s+/);
        const action = args[0]?.toLowerCase();

        // 3. CHECK BOT ADMIN STATUS
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;

        // 4. HANDLE ACTIONS
        if (action === 'on') {
            await setAntilink(chatId, 'on', 'delete');
            let resOn = `╭━━━━〔 *ANTILINK ON* 〕━━━━┈⊷\n┃\n┃ ✅ *Hali:* \`ENABLED\`\n┃ 🛡️ *Bot Admin:* ${isBotAdmin ? '`Active ✅`' : '`Missing ❌`'}\n┃ 📌 *Hati:* \`Delete Links\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            await sock.sendMessage(chatId, { text: resOn }, { quoted: m });
            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});
            return;
        }

        if (action === 'off') {
            await removeAntilink(chatId, 'on');
            let resOff = `╭━━━━〔 *ANTILINK OFF* 〕━━━━┈⊷\n┃\n┃ ✅ *Hali:* \`DISABLED\`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
            await sock.sendMessage(chatId, { text: resOff }, { quoted: m });
            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});
            return;
        }

        if (action === 'set') {
            const mode = args[1]?.toLowerCase();
            if (!['delete', 'kick'].includes(mode)) {
                return await sock.sendMessage(chatId, { text: '⚠️ *Tumia:* `.antilink set delete` au `.antilink set kick`' }, { quoted: m });
            }
            await setAntilink(chatId, 'on', mode);
            await sock.sendMessage(chatId, { text: `✅ *Action imewekwa kuwa:* \`${mode.toUpperCase()}\`` }, { quoted: m });
            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});
            return;
        }

        // 5. EXTENDED MENU (Kama hajaandika on/off)
        const menu = 
            `╭━━━━〔 *ANTILINK SETTINGS* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 📌 *AMRI:*\n` +
            `┃ • \`.antilink on\` - Washa\n` +
            `┃ • \`.antilink off\` - Zima\n` +
            `┃ • \`.antilink set delete\` - Futa link\n` +
            `┃ • \`.antilink set kick\` - Tumaani sender\n` +
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
