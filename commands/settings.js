const fs = require('fs');
const { AIRich } = require('../lib/messageBuilder');

function readJsonSafe(path, fallback) {
    try {
        const txt = fs.readFileSync(path, 'utf8');
        return JSON.parse(txt);
    } catch (_) {
        return fallback;
    }
}

const isOwnerOrSudo = require('../lib/isOwner');

async function safeSendMessage(sock, chatId, message, content, options = {}) {
    try {
        if (typeof content === 'string') {
            return await sock.sendMessage(chatId, { text: content }, { quoted: message, ...options });
        }
        return await sock.sendMessage(chatId, content, { quoted: message, ...options });
    } catch (error) {
        console.error('[SETTINGS SAFE SEND]', error?.message || error);
        try {
            const text = typeof content === 'string' ? content : content?.text || '⚠️ Unable to display settings.';
            return await sock.sendMessage(chatId, { text }, { quoted: message, ...options });
        } catch (fallbackError) {
            console.error('[SETTINGS SAFE SEND FALLBACK]', fallbackError?.message || fallbackError);
            return null;
        }
    }
}

async function settingsCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await safeSend({ text: 'Only bot owner can use this command!' }, { quoted: message });
            return;
        }

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

        // Per-group features
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const welcomeOn = groupId ? Boolean(userGroupData.welcome && userGroupData.welcome[groupId]) : false;
        const goodbyeOn = groupId ? Boolean(userGroupData.goodbye && userGroupData.goodbye[groupId]) : false;
        const chatbotOn = groupId ? Boolean(userGroupData.chatbot && userGroupData.chatbot[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;

        const rows = [
            ['Setting', 'Status'],
            ['Mode', mode.isPublic ? 'Public' : 'Private'],
            ['Auto Status', autoStatus.enabled ? 'ON' : 'OFF'],
            ['Autoread', autoread.enabled ? 'ON' : 'OFF'],
            ['Autotyping', autotyping.enabled ? 'ON' : 'OFF'],
            ['Autorecording', autorecording.enabled ? 'ON' : 'OFF'],
            ['PM Blocker', pmblocker.enabled ? 'ON' : 'OFF'],
            ['Anticall', anticall.enabled ? 'ON' : 'OFF'],
            ['Auto Reaction', autoReaction ? 'ON' : 'OFF']
        ];

        if (groupId) {
            rows.push(['Group', groupId]);
            rows.push(['Antilink', antilinkOn ? `ON (${(userGroupData.antilink[groupId] || {}).action || 'delete'})` : 'OFF']);
            rows.push(['Antibadword', antibadwordOn ? `ON (${(userGroupData.antibadword[groupId] || {}).action || 'delete'})` : 'OFF']);
            rows.push(['Welcome', welcomeOn ? 'ON' : 'OFF']);
            rows.push(['Goodbye', goodbyeOn ? 'ON' : 'OFF']);
            rows.push(['Chatbot', chatbotOn ? 'ON' : 'OFF']);
            rows.push(['Antitag', antitagCfg && antitagCfg.enabled ? `ON (${antitagCfg.action || 'delete'})` : 'OFF']);
        } else {
            rows.push(['Note', 'Per-group settings appear inside groups.']);
        }

        const table = new AIRich(sock)
            .setTitle('⚙️ BOT SETTINGS')
            .addText('Here are the current bot settings in table form.')
            .addTable(rows)
            .addSuggest(['.menu', '.help']);

        await table.send(chatId, {
            quoted: message,
            forwarded: false,
            fallbackText: rows.map((row) => row.join(' | ')).join('\n')
        });
    } catch (error) {
        console.error('Error in settings command:', error?.message || error);
        await safeSendMessage(sock, chatId, message, '❌ Failed to load settings. Please try again later.');
    }
}

module.exports = settingsCommand;


