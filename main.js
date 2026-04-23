// ═══════════════════════════════════════════════════════════════════════════
// MICKEY GLITCH BOT - MAIN COMMAND HANDLER (FIXED VERSION)
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ═══════════════════════════════════════════════════════════════════════════
// SETUP: Temp folders & environment
// ═══════════════════════════════════════════════════════════════════════════
const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');
[customTemp, customTmp].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// ═══════════════════════════════════════════════════════════════════════════
// LOAD: Core dependencies & helpers
// ═══════════════════════════════════════════════════════════════════════════
const settings = require('./settings');
require('./config.js');
const isOwnerOrSudo = require('./lib/isOwner');
const { autoLoadCommands } = require('./lib/autoCommandLoader');
const { handleChatbotMessage } = require('./commands/chatbot');
const { handleStatusUpdate } = require('./commands/autostatus');
const { getAntilink } = require('./lib/index');
const { checkAdminPermissions } = require('./lib/commandHelper');
const { antilink2Engine } = require('./commands/antilink2'); // Import ya Antilink Pro

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY: Auto-load all commands
// ═══════════════════════════════════════════════════════════════════════════
let allCommands = {};
let commandsLoaded = 0;

function loadCommandRegistry() {
    try {
        const commandsDir = path.join(process.cwd(), 'commands');
        if (!fs.existsSync(commandsDir)) {
            console.error(chalk.red('❌ Commands folder not found!'));
            return 0;
        }
        allCommands = autoLoadCommands();
        commandsLoaded = Object.keys(allCommands).length;
        console.log(chalk.green(`✅ Loaded ${commandsLoaded} commands automatically`));
        return commandsLoaded;
    } catch (e) {
        console.error(chalk.red('Failed to load commands:'), e.message);
        return 0;
    }
}

function reloadCommands() {
    try {
        const commandsDir = path.join(process.cwd(), 'commands');
        Object.keys(require.cache).forEach(key => {
            if (key.includes(commandsDir)) delete require.cache[key];
        });
        const newCount = loadCommandRegistry();
        console.log(chalk.cyan(`🔄 Commands reloaded: ${newCount} available`));
        return newCount;
    } catch (e) {
        console.error(chalk.red('Reload failed:'), e.message);
        return commandsLoaded;
    }
}

loadCommandRegistry();

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS: Message processor
// ═══════════════════════════════════════════════════════════════════════════

async function handleMessages(sock, messageUpdate) {
    try {
        if (!sock || !sock.user || messageUpdate.type !== 'notify') return;

        const m = messageUpdate.messages[0];
        if (!m?.message || m.key.remoteJid === 'status@broadcast') return;

        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderId = m.key.participant || m.key.remoteJid;

        // 1. Chatbot
        handleChatbotMessage(sock, chatId, m).catch(() => {});

        // 2. Parse Text
        const mType = Object.keys(m.message)[0];
        let body = '';

        if (mType === 'conversation') {
            body = m.message.conversation;
        } else if (mType === 'extendedTextMessage') {
            body = m.message.extendedTextMessage.text;
        } else if (mType === 'imageMessage' || mType === 'videoMessage') {
            body = m.message[mType]?.caption || '';
        } else if (mType === 'buttonsResponseMessage') {
            body = m.message.buttonsResponseMessage.selectedButtonId;
        } else if (mType === 'interactiveResponseMessage') {
            try {
                const parsed = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                body = parsed.id || parsed.selectedRowId || '';
            } catch (e) {}
        }

        if (!body || typeof body !== 'string') return;
        const msgText = body.trim();

        // 🛡️ ANTILINK 2 PRO ENGINE (Execute on all messages in groups)
        if (isGroup) {
            await antilink2Engine(sock, chatId, m, msgText).catch(e => console.log('Antilink2 Error:', e.message));
        }

        // Check if it's a command
        if (!msgText.startsWith('.')) return;

        // 🎯 3. PARSE COMMAND
        const prefix = '.';
        const parts = msgText.slice(1).trim().split(/ +/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        const textFromMessage = msgText.slice(prefix.length + commandName.length).trim();

        if (!commandName) return;

        // 🛡️ AUTHORIZATION
        const perm = await checkAdminPermissions(sock, chatId, m);
        const isAdmin = perm.isSenderAdmin;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId) || m.key.fromMe;

        // 🚀 EXECUTE
        const cmdFile = allCommands[commandName];
        if (!cmdFile) return;

        const ownerOnly = ['setpp', 'update', 'broadcast', 'cleartmp', 'admin', 'restart'];
        if (ownerOnly.includes(commandName) && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Owner tu ndio wanaweza!' }, { quoted: m }).catch(() => {});
            return;
        }

        setImmediate(async () => {
            try {
                let timeout = 20000;
                if (commandName.includes('play') || commandName.includes('video')) timeout = 60000;

                let commandFn = null;
                if (typeof cmdFile === 'function') {
                    commandFn = cmdFile;
                } else if (cmdFile.execute && typeof cmdFile.execute === 'function') {
                    commandFn = cmdFile.execute;
                } else {
                    const camelCaseName = commandName + 'Command';
                    if (cmdFile[camelCaseName] && typeof cmdFile[camelCaseName] === 'function') {
                        commandFn = cmdFile[camelCaseName];
                    }
                }

                if (!commandFn) return;

                await Promise.race([
                    commandFn(sock, chatId, m, textFromMessage, { args, isAdmin, isOwner, commandName }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
                ]);
            } catch (err) {
                if (!err.message.includes('Timeout')) {
                    console.error(chalk.red(`❌ Error in [${commandName}]:`), err.message);
                }
            }
        });

    } catch (e) {
        console.error(chalk.red('❌ CRITICAL ERROR in handleMessages:'), e.message);
    }
}

async function handleStatus(sock, messageUpdate) {
    try {
        if (messageUpdate.key?.remoteJid === 'status@broadcast' && messageUpdate?.messages?.length) {
            await handleStatusUpdate(sock, messageUpdate).catch(() => {});
        }
    } catch (e) {
        console.error(chalk.red('❌ Status handler error:'), e.message);
    }
}

module.exports = { 
    handleMessages, 
    handleStatus,
    reloadCommands 
};
