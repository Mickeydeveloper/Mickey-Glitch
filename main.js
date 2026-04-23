// ═══════════════════════════════════════════════════════════════════════════
// MICKEY GLITCH BOT - MAIN COMMAND HANDLER
// Auto-loads commands, handles chatbot & autostatus automatically
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

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY: Auto-load all commands
// ═══════════════════════════════════════════════════════════════════════════
let allCommands = {};
let commandsLoaded = 0;

/**
 * Load all commands from /commands folder automatically
 */
function loadCommandRegistry() {
    try {
        const commandsDir = path.join(process.cwd(), 'commands');
        if (!fs.existsSync(commandsDir)) {
            console.error(chalk.red('❌ Commands folder not found!'));
            return 0;
        }

        // Use auto-loader to scan and load all commands
        allCommands = autoLoadCommands();
        commandsLoaded = Object.keys(allCommands).length;
        
        console.log(chalk.green(`✅ Loaded ${commandsLoaded} commands automatically`));
        return commandsLoaded;
    } catch (e) {
        console.error(chalk.red('Failed to load commands:'), e.message);
        return 0;
    }
}

/**
 * Reload commands after reconnection
 */
function reloadCommands() {
    try {
        const commandsDir = path.join(process.cwd(), 'commands');
        Object.keys(require.cache).forEach(key => {
            if (key.includes(commandsDir)) {
                delete require.cache[key];
            }
        });
        
        const newCount = loadCommandRegistry();
        console.log(chalk.cyan(`🔄 Commands reloaded: ${newCount} available`));
        return newCount;
    } catch (e) {
        console.error(chalk.red('Reload failed:'), e.message);
        return commandsLoaded;
    }
}

// Initial load on startup
loadCommandRegistry();

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS: Message processor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main message handler - processes incoming WhatsApp messages
 * 1. Handles chatbot automatically (async)
 * 2. Parses command text
 * 3. Executes matching commands
 */
async function handleMessages(sock, messageUpdate) {
    try {
        if (!sock || !sock.user || messageUpdate.type !== 'notify') return;

        const m = messageUpdate.messages[0];
        if (!m?.message || m.key.remoteJid === 'status@broadcast') return;

        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderId = m.key.participant || m.key.remoteJid;

        // ─────────────────────────────────────────────────────────────────────
        // 🤖 1. CHATBOT HANDLER (runs async, non-blocking)
        // ─────────────────────────────────────────────────────────────────────
        handleChatbotMessage(sock, chatId, m).catch(() => {});

        // ─────────────────────────────────────────────────────────────────────
        // 📝 2. PARSE MESSAGE TEXT
        // ─────────────────────────────────────────────────────────────────────
        const mType = Object.keys(m.message)[0];
        let body = '';

        // Extract text from various message types
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
        } else {
            return; // Ignore other message types
        }

        if (!body || typeof body !== 'string') return;
        body = body.trim();

        // Check if it's a command (starts with .)
        if (!body.startsWith('.')) return;

        // ─────────────────────────────────────────────────────────────────────
        // 🎯 3. PARSE COMMAND
        // ─────────────────────────────────────────────────────────────────────
        const prefix = '.';
        const parts = body.slice(1).trim().split(/ +/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        const textFromMessage = body.slice(prefix.length + commandName.length).trim();

        if (!commandName) return;

        // ─────────────────────────────────────────────────────────────────────
        // 🛡️ 4. AUTHORIZATION CHECK (isAdmin/isOwner)
        // ─────────────────────────────────────────────────────────────────────
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId) || m.key.fromMe;
        
        let isAdmin = false;
        if (isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(chatId).catch(() => ({}));
                const participants = groupMetadata.participants || [];
                const user = participants.find(p => p.id === senderId);
                isAdmin = user?.admin === 'admin' || user?.admin === 'superadmin' || isOwner;
            } catch (e) {}
        }

        // ─────────────────────────────────────────────────────────────────────
        // 🚀 5. EXECUTE COMMAND
        // ─────────────────────────────────────────────────────────────────────
        const cmdFile = allCommands[commandName];

        if (!cmdFile) {
            return; // Command not found - silent fail
        }

        // Owner-only commands restriction
        const ownerOnly = ['setpp', 'update', 'broadcast', 'cleartmp', 'admin', 'restart'];
        if (ownerOnly.includes(commandName) && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Owner only' }, { quoted: m }).catch(() => {});
            return;
        }

        // Execute command asynchronously without blocking
        setImmediate(async () => {
            try {
                // Determine command timeout based on type
                let timeout = 20000; // Default 20s
                if (commandName.includes('play') || commandName.includes('video') || 
                    commandName.includes('download') || commandName.includes('youtube')) {
                    timeout = 60000; // 60s for heavy downloads
                } else if (commandName.includes('button') || commandName.includes('menu')) {
                    timeout = 5000; // 5s for quick responses
                }

                // Execute with timeout protection
                await Promise.race([
                    cmdFile(sock, chatId, m, textFromMessage, { 
                        args, 
                        isAdmin, 
                        isOwner, 
                        commandName 
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Command timeout')), timeout)
                    )
                ]);
            } catch (err) {
                if (!err.message.includes('timeout')) {
                    console.error(chalk.red(`❌ Error in [${commandName}]:`), err.message);
                }
            }
        });

    } catch (e) {
        console.error(chalk.red('❌ CRITICAL ERROR in handleMessages:'), e.message);
    }
}

/**
 * Status/AutoStatus handler - processes status updates
 */
async function handleStatus(sock, messageUpdate) {
    try {
        // Check if it's a status message
        if (messageUpdate.key?.remoteJid === 'status@broadcast' && messageUpdate?.messages?.length) {
            // Call autostatus handler
            await handleStatusUpdate(sock, messageUpdate).catch(() => {});
        }
    } catch (e) {
        console.error(chalk.red('❌ Status handler error:'), e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: Make handlers available to server
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { 
    handleMessages, 
    handleStatus,
    reloadCommands  // Export reload function for reconnection events
};
