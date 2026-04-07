const fs = require('fs');
const { sendButtons } = require('gifted-btns');

function readJsonSafe(path, fallback) {
    try {
        const txt = fs.readFileSync(path, 'utf8');
        return JSON.parse(txt);
    } catch (_) {
        return fallback;
    }
}

const isOwnerOrSudo = require('../lib/isOwner');

async function settingsCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: 'Only bot owner can use this command!' }, { quoted: message });
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        const dataDir = './data';

        const mode = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatusRaw = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: true, viewEnabled: true, likeEnabled: true });
        const autoStatus = {
            enabled: typeof autoStatusRaw.enabled === 'boolean' ? autoStatusRaw.enabled : (autoStatusRaw.viewEnabled || autoStatusRaw.likeEnabled),
            viewEnabled: typeof autoStatusRaw.viewEnabled === 'boolean' ? autoStatusRaw.viewEnabled : true,
            likeEnabled: typeof autoStatusRaw.likeEnabled === 'boolean' ? autoStatusRaw.likeEnabled : true,
        };
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {}
        });
        const autoReaction = Boolean(userGroupData.autoReaction);

        // Per-group features
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const welcomeOn = groupId ? Boolean(userGroupData.welcome && userGroupData.welcome[groupId]) : false;
        const goodbyeOn = groupId ? Boolean(userGroupData.goodbye && userGroupData.goodbye[groupId]) : false;
        const chatbotOn = groupId ? Boolean(userGroupData.chatbot && userGroupData.chatbot[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;

        const settingsText = `
⚙️ *BOT SETTINGS PANEL*
━━━━━━━━━━━━━━━━━━━━━━
🔧 *Global Settings:*
• Mode: ${mode.isPublic ? '🟢 Public' : '🔴 Private'}
• Auto Status: ${autoStatus.enabled ? '🟢 ON' : '🔴 OFF'}
• Autoread: ${autoread.enabled ? '🟢 ON' : '🔴 OFF'}
• Autotyping: ${autotyping.enabled ? '🟢 ON' : '🔴 OFF'}
• PM Blocker: ${pmblocker.enabled ? '🟢 ON' : '🔴 OFF'}
• Anticall: ${anticall.enabled ? '🟢 ON' : '🔴 OFF'}
• Auto Reaction: ${autoReaction ? '🟢 ON' : '🔴 OFF'}

${groupId ? `📍 *Group Settings (${groupId}):*
• Antilink: ${antilinkOn ? '🟢 ON' : '🔴 OFF'}
• Antibadword: ${antibadwordOn ? '🟢 ON' : '🔴 OFF'}
• Welcome: ${welcomeOn ? '🟢 ON' : '🔴 OFF'}
• Goodbye: ${goodbyeOn ? '🟢 ON' : '🔴 OFF'}
• Chatbot: ${chatbotOn ? '🟢 ON' : '🔴 OFF'}
• Antitag: ${antitagCfg && antitagCfg.enabled ? '🟢 ON' : '🔴 OFF'}` : '📍 *Group Settings:* Use in group to see'}

━━━━━━━━━━━━━━━━━━━━━━
*Choose category to modify:*`;

        const settingButtons = [
            { id: 'settings_global', text: '🌐 GLOBAL' },
            { id: 'settings_group', text: '👥 GROUP' },
            { id: 'settings_status', text: '📊 STATUS' },
            { id: 'settings_refresh', text: '🔄 REFRESH' }
        ];

        await sendButtons(sock, chatId, {
            title: '⚙️ SETTINGS CONTROL',
            text: settingsText,
            footer: 'Mickey Glitch Tech',
            buttons: settingButtons
        }, { quoted: message });
    } catch (error) {
        console.error('Error in settings command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to read settings.' }, { quoted: message });
    }
}

module.exports = settingsCommand;


