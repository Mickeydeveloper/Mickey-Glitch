const fs = require('fs');
const { createCtx, ButtonV2, Toolkit } = require('../lib/messageBuilder');

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
async function settingsCommand(sock, chatId, message) {
    try {
        // ─── CREATE CTX ──────────────────────────────────────────────────
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

        // ─── BUILD SETTINGS TEXT ──────────────────────────────────────────
        let settingsText = `⚙️ *BOT SETTINGS*\n\n`;
        settingsText += `*📋 General Settings:*\n`;
        settingsText += `┌─────────────────────────\n`;
        settingsText += `│ 📌 Mode: ${mode.isPublic ? '🌍 Public' : '🔒 Private'}\n`;
        settingsText += `│ 📌 Auto Status: ${autoStatus.enabled ? '✅ ON' : '❌ OFF'}\n`;
        settingsText += `│ 📌 Autoread: ${autoread.enabled ? '✅ ON' : '❌ OFF'}\n`;
        settingsText += `│ 📌 Autotyping: ${autotyping.enabled ? '✅ ON' : '❌ OFF'}\n`;
        settingsText += `│ 📌 Autorecording: ${autorecording.enabled ? '✅ ON' : '❌ OFF'}\n`;
        settingsText += `│ 📌 PM Blocker: ${pmblocker.enabled ? '✅ ON' : '❌ OFF'}\n`;
        settingsText += `│ 📌 Anticall: ${anticall.enabled ? '✅ ON' : '❌ OFF'}\n`;
        settingsText += `│ 📌 Auto Reaction: ${autoReaction ? '✅ ON' : '❌ OFF'}\n`;
        settingsText += `└─────────────────────────\n\n`;

        if (groupId) {
            settingsText += `*👥 Group Settings:*\n`;
            settingsText += `┌─────────────────────────\n`;
            settingsText += `│ 📌 Antilink: ${antilinkOn ? `✅ ON (${(userGroupData.antilink[groupId] || {}).action || 'delete'})` : '❌ OFF'}\n`;
            settingsText += `│ 📌 Antibadword: ${antibadwordOn ? `✅ ON (${(userGroupData.antibadword[groupId] || {}).action || 'delete'})` : '❌ OFF'}\n`;
            settingsText += `│ 📌 Welcome: ${welcomeOn ? '✅ ON' : '❌ OFF'}\n`;
            settingsText += `│ 📌 Goodbye: ${goodbyeOn ? '✅ ON' : '❌ OFF'}\n`;
            settingsText += `│ 📌 Chatbot: ${chatbotOn ? '✅ ON' : '❌ OFF'}\n`;
            settingsText += `│ 📌 Antitag: ${antitagCfg && antitagCfg.enabled ? `✅ ON (${antitagCfg.action || 'delete'})` : '❌ OFF'}\n`;
            settingsText += `└─────────────────────────\n\n`;
        } else {
            settingsText += `*💡 Note:*\n`;
            settingsText += `Per-group settings appear inside groups.\n\n`;
        }

        settingsText += `📅 *Updated:* ${new Date().toLocaleString()}\n`;
        settingsText += `> ⚡ Mickey Glitch Sub`;

        // ─── TRY TO SEND WITH BUTTONV2 ──────────────────────────────────
        try {
            const builder = new ButtonV2(sock)
                .setTitle("⚙️ Bot Settings")
                .setBody(settingsText)
                .setFooter("⚡ Mickey Glitch Sub")
                .addButton("🔄 Refresh", ".settings")
                .addButton("📊 Stats", ".stats")
                .addButton("📋 Menu", ".menu");

            await builder.send(chatId, {
                quoted: message,
                fallbackText: settingsText
            });
            
        } catch (buttonError) {
            console.error('[SETTINGS BUTTON ERROR]', buttonError.message);
            
            // ─── FALLBACK: Send plain text ──────────────────────────────
            await ctx.reply(settingsText);
        }

    } catch (error) {
        console.error('[SETTINGS ERROR]', error?.message || error);
        
        // ─── ULTIMATE FALLBACK ──────────────────────────────────────────
        try {
            await ctx.reply('❌ *Failed to load settings.*\n\nPlease try again later.');
        } catch (e) {
            console.error('[SETTINGS FATAL]', e.message);
        }
    }
}

module.exports = settingsCommand;