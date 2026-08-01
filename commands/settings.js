/**
 * settings.js - Bot settings with ctx and fallback
 * Usage: .settings
 */

const fs = require('fs');
const { createCtx, AIRich, ButtonV2, Toolkit } = require('../lib/messageBuilder');

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────
function readJsonSafe(path, fallback) {
    try {
        const txt = fs.readFileSync(path, 'utf8');
        return JSON.parse(txt);
    } catch (_) {
        return fallback;
    }
}

async function isOwnerOrSudo(senderId, sock, chatId) {
    try {
        const ownerFile = './data/owner.json';
        const sudoFile = './data/sudo.json';
        
        const owners = readJsonSafe(ownerFile, { owners: [] });
        const sudo = readJsonSafe(sudoFile, { sudo: [] });
        
        const allAllowed = [...(owners.owners || []), ...(sudo.sudo || [])];
        return allAllowed.includes(senderId) || allAllowed.includes(senderId.split('@')[0]);
    } catch (_) {
        return false;
    }
}

// ─── MAIN SETTINGS COMMAND ────────────────────────────────────────────────
module.exports = async (sock, chatId, message) => {
    try {
        const ctx = createCtx(sock, chatId, message);
        
        // ─── CHECK PERMISSIONS ──────────────────────────────────────────
        const senderId = message.key?.participant || message.key?.remoteJid || chatId;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key?.fromMe && !isOwner) {
            return await ctx.reply('🔒 *Only bot owner can use this command!*');
        }

        // ─── READ SETTINGS ──────────────────────────────────────────────
        const isGroup = chatId.endsWith('@g.us');
        const dataDir = './data';

        const mode = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatus = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: false });
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autorecording = readJsonSafe(`${dataDir}/autorecording.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {}
        });
        const autoReaction = Boolean(userGroupData.autoReaction);

        // ─── PER-GROUP FEATURES ──────────────────────────────────────────
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const welcomeOn = groupId ? Boolean(userGroupData.welcome && userGroupData.welcome[groupId]) : false;
        const goodbyeOn = groupId ? Boolean(userGroupData.goodbye && userGroupData.goodbye[groupId]) : false;
        const chatbotOn = groupId ? Boolean(userGroupData.chatbot && userGroupData.chatbot[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;

        // ─── BUILD TABLE DATA ────────────────────────────────────────────
        const tableData = [
            ["📌 SETTING", "📊 STATUS", "📝 COMMAND"],
            ["━━━━━━━━━━━━━━", "━━━━━━━━━━━━", "━━━━━━━━━━━━"],
            ["⚙️ GENERAL", "", ""],
            ["Mode", mode.isPublic ? "🌍 Public" : "🔒 Private", ".mode toggle"],
            ["Auto Status", autoStatus.enabled ? "✅ ON" : "❌ OFF", ".autostatus toggle"],
            ["Autoread", autoread.enabled ? "✅ ON" : "❌ OFF", ".autoread toggle"],
            ["Autotyping", autotyping.enabled ? "✅ ON" : "❌ OFF", ".autotyping toggle"],
            ["Autorecording", autorecording.enabled ? "✅ ON" : "❌ OFF", ".autorecording toggle"],
            ["PM Blocker", pmblocker.enabled ? "✅ ON" : "❌ OFF", ".pmblocker toggle"],
            ["Anticall", anticall.enabled ? "✅ ON" : "❌ OFF", ".anticall toggle"],
            ["Auto Reaction", autoReaction ? "✅ ON" : "❌ OFF", ".autoreaction toggle"]
        ];

        if (groupId) {
            tableData.push(["━━━━━━━━━━━━━━", "━━━━━━━━━━━━", "━━━━━━━━━━━━"]);
            tableData.push(["👥 GROUP", "", ""]);
            tableData.push(["Antilink", antilinkOn ? `✅ ON (${(userGroupData.antilink[groupId] || {}).action || 'delete'})` : "❌ OFF", ".antilink toggle"]);
            tableData.push(["Antibadword", antibadwordOn ? `✅ ON (${(userGroupData.antibadword[groupId] || {}).action || 'delete'})` : "❌ OFF", ".antibadword toggle"]);
            tableData.push(["Welcome", welcomeOn ? "✅ ON" : "❌ OFF", ".welcome toggle"]);
            tableData.push(["Goodbye", goodbyeOn ? "✅ ON" : "❌ OFF", ".goodbye toggle"]);
            tableData.push(["Chatbot", chatbotOn ? "✅ ON" : "❌ OFF", ".chatbot toggle"]);
            tableData.push(["Antitag", antitagCfg && antitagCfg.enabled ? `✅ ON (${antitagCfg.action || 'delete'})` : "❌ OFF", ".antitag toggle"]);
        }

        tableData.push(["━━━━━━━━━━━━━━", "━━━━━━━━━━━━", "━━━━━━━━━━━━"]);
        tableData.push(["📅 UPDATED", new Date().toLocaleString(), ""]);

        // ─── FORMAT AS TEXT ──────────────────────────────────────────────
        const settingsText = formatTableAsText(tableData);

        // ─── TRY AIRICH (WITH FALLBACK) ──────────────────────────────────
        try {
            const rich = new AIRich(sock)
                .setTitle('⚙️ BOT SETTINGS')
                .setBody(`📋 *Current Configuration*`)
                .addTable(tableData)
                .addTip('💡 Use .help for more commands')
                .addSuggest(['Toggle mode', 'Show all settings', 'Reset settings']);

            await rich.send(chatId, {
                quoted: message,
                forwarded: false,
                notification: false,
                fallbackText: settingsText
            });

            console.log('[SETTINGS] Sent with AIRich');
            return;

        } catch (richError) {
            console.error('[AIRICH ERROR]', richError.message);
        }

        // ─── FALLBACK 1: BUTTONV2 ──────────────────────────────────────────
        try {
            const builder = new ButtonV2(sock)
                .setTitle('⚙️ Bot Settings')
                .setBody(settingsText)
                .setFooter(`📅 ${new Date().toLocaleString()} | ⚡ Mickey Glitch Sub`)
                .addButton('🔄 Refresh', '.settings')
                .addButton('📊 Stats', '.stats')
                .addButton('📋 Menu', '.menu');

            await builder.send(chatId, {
                quoted: message,
                fallbackText: settingsText
            });

            console.log('[SETTINGS] Sent with ButtonV2');
            return;

        } catch (buttonError) {
            console.error('[BUTTONV2 ERROR]', buttonError.message);
        }

        // ─── FALLBACK 2: PLAIN TEXT ──────────────────────────────────────
        await ctx.reply(settingsText);
        console.log('[SETTINGS] Sent with Plain Text');

    } catch (error) {
        console.error('[SETTINGS ERROR]', error?.message || error);

        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply('❌ *Failed to load settings.*\n\nPlease try again later.');
        } catch (e) {
            console.error('[SETTINGS FATAL]', e.message);
        }
    }
};

// ─── FORMAT TABLE AS TEXT ──────────────────────────────────────────────────
function formatTableAsText(tableData) {
    let text = '⚙️ *BOT SETTINGS*\n\n';
    
    const colWidths = tableData.reduce((widths, row) => {
        return row.map((cell, i) => Math.max(widths[i] || 0, String(cell).length));
    }, [0, 0, 0]);
    
    const separator = '┌' + '─'.repeat(colWidths[0] + 2) + '┬' + '─'.repeat(colWidths[1] + 2) + '┬' + '─'.repeat(colWidths[2] + 2) + '┐';
    const divider = '├' + '─'.repeat(colWidths[0] + 2) + '┼' + '─'.repeat(colWidths[1] + 2) + '┼' + '─'.repeat(colWidths[2] + 2) + '┤';
    const footer = '└' + '─'.repeat(colWidths[0] + 2) + '┴' + '─'.repeat(colWidths[1] + 2) + '┴' + '─'.repeat(colWidths[2] + 2) + '┘';
    
    text += separator + '\n';
    
    tableData.forEach((row, index) => {
        const cells = row.map((cell, i) => {
            const padding = colWidths[i] - String(cell).length;
            return ' ' + String(cell) + ' '.repeat(padding) + ' ';
        });
        text += '│' + cells.join('│') + '│\n';
        
        if (index === 0 || row[0] === '👥 GROUP' || row[0] === '⚙️ GENERAL' || row[0] === '━━━━━━━━━━━━━━') {
            text += divider + '\n';
        }
    });
    
    text += footer + '\n\n';
    text += `📅 *Updated:* ${new Date().toLocaleString()}\n`;
    text += `> ⚡ Mickey Glitch Sub`;
    
    return text;
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────
module.exports.name = 'settings';
module.exports.aliases = ['config', 'preferences'];
module.exports.category = 'admin';
module.exports.default = module.exports;
module.exports.handler = module.exports;