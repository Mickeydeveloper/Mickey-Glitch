// Temp folder setup for file handling
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
if (!fs.existsSync(customTmp)) fs.mkdirSync(customTmp, { recursive: true });

process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

const settings = require('./settings');
require('./config.js');
const { safeSendMessage } = require('./lib/myfunc');
const isOwnerOrSudo = require('./lib/isOwner');

// Status handlers
const { handleStatusUpdate } = require('./commands/autostatus');
const { handleStatusForward } = require('./commands/statusforward');

// Command loader
const { autoLoadCommands, getCommand } = require('./lib/autoCommandLoader');
let allCommands = {}; 

try {
    allCommands = autoLoadCommands();
    console.log(chalk.green(`✅ Loaded ${Object.keys(allCommands).length} commands`))
    console.log(chalk.blue(`Available commands: ${Object.keys(allCommands).slice(0, 10).join(', ')}...`))
} catch (e) {
    console.error(chalk.red('Failed to load commands:'), e.message)
}

// Static Import for Help
const helpFunc = require('./commands/help');
// --- 🤖 CHATBOT HANDLER ---
const { handleChatbotMessage } = require('./commands/chatbot');
async function handleMessages(sock, messageUpdate) {
    try {
        if (!sock || !sock.user) return;
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const m = messages[0];
        if (!m?.message) return;

        const chatId = m.key.remoteJid;
        const senderId = m.key.participant || m.key.remoteJid;
        const mType = Object.keys(m.message)[0];

        // --- 🤖 HANDLE CHATBOT FOR ALL MESSAGES ---
        try {
            await handleChatbotMessage(sock, chatId, m);
        } catch (chatErr) {
            // Silent chatbot error
        }

        // --- 🔘 INTERACTIVE BUTTONS DECODER ---
        let buttonId = null;
        if (mType === 'interactiveResponseMessage') {
            const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                try {
                    const parsed = JSON.parse(paramsJson);
                    buttonId = parsed.id || parsed.selectedRowId;
                } catch (e) { }
            }
        } else if (mType === 'buttonsResponseMessage') {
            buttonId = m.message.buttonsResponseMessage.selectedButtonId;
        }

        // --- 📝 MESSAGE PARSING ---
        let rawBody = '';
        if (buttonId) {
            rawBody = buttonId.startsWith('.') ? buttonId : '.' + buttonId;
        } else {
            // Try different message types
            const msg = m.message;
            if (msg.conversation) {
                rawBody = msg.conversation;
            } else if (msg.extendedTextMessage) {
                rawBody = msg.extendedTextMessage.text;
            } else if (msg.imageMessage) {
                rawBody = msg.imageMessage.caption || '';
            } else if (msg.videoMessage) {
                rawBody = msg.videoMessage.caption || '';
            } else if (msg.documentMessage) {
                rawBody = msg.documentMessage.caption || '';
            } else if (msg.audioMessage) {
                rawBody = msg.audioMessage.caption || '';
            } else if (msg.stickerMessage) {
                rawBody = ''; // Stickers don't have text
            } else {
                rawBody = '';
            }
        }

        rawBody = rawBody.trim();

        // 1. Check if it starts with prefix (.)
        if (!rawBody.startsWith('.')) {
            return;
        }

        // 2. FIX: Handle ". menu" by removing space after dot
        const cleanBody = rawBody.startsWith('. ')
            ? '.' + rawBody.slice(1).trim()
            : rawBody.trim();

        console.log(chalk.cyan(`📨 Raw: "${rawBody}" → Clean: "${cleanBody}"`))

        const args = cleanBody.split(' ');
        const cmdName = args[0].toLowerCase().slice(1); // Extract command name
        const fullCmd = args[0].toLowerCase(); // Full command with dot

        console.log(chalk.cyan(`   Command: ${cmdName} (from ${fullCmd})`))

        // Owner check
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerCheck = m.key.fromMe || senderIsOwnerOrSudo; // Bot's own messages count as owner
        console.log(chalk.cyan(`   Is owner: ${isOwnerCheck ? 'YES' : 'NO'}`))

        // --- 🚀 EXECUTION ENGINE ---

        // Case 2: Dynamic Commands from /commands/ folder
        const selectedCommand = getCommand(allCommands, cmdName);
        console.log(chalk.cyan(`   Looking for command: ${cmdName}`))
        console.log(chalk.cyan(`   Command found: ${selectedCommand ? 'YES' : 'NO'}`))

        // TEMPORARY TEST: Simple response for .test command
        if (cmdName === 'test') {
            console.log(chalk.green(`🧪 TEST COMMAND: Responding with pong`))
            await sock.sendMessage(chatId, { text: '🏓 Pong! Commands are working!' }, { quoted: m }).catch(() => {})
            return;
        }

        // TEMPORARY TEST: Simple response for .hi command
        if (cmdName === 'hi') {
            console.log(chalk.green(`👋 HI COMMAND: Responding with greeting`))
            await sock.sendMessage(chatId, { text: '👋 Hello! Bot is responding!' }, { quoted: m }).catch(() => {})
            return;
        }

        // TEMPORARY TEST: Simple menu response
        if (cmdName === 'menu' || cmdName === 'help') {
            console.log(chalk.green(`📋 MENU COMMAND: Showing menu`))
            await sock.sendMessage(chatId, { 
                text: `📋 *MICKEY GLITCH MENU*\n\n🤖 Bot is working!\n\nAvailable commands:\n• .test - Test command\n• .hi - Greeting\n• .menu - Show this menu\n• .help - Show full help\n\nTry other commands too!` 
            }, { quoted: m }).catch(() => {})
            return;
        }

        if (selectedCommand) {
            // Sudo Restriction
            const sudoOnly = ['setpp', 'update', 'broadcast', 'cleartmp'];
            if (sudoOnly.includes(cmdName) && !isOwnerCheck) {
                await sock.sendMessage(chatId, { 
                    text: "❌ *ACCESS DENIED:* Owner only!" 
                }, { quoted: m }).catch(() => {});
                return;
            }

            console.log(chalk.blue(`   Executing ${cmdName}...`))
            try {
                if (typeof selectedCommand === 'function') {
                    console.log(chalk.blue(`   Type: Function`))
                    await selectedCommand(sock, chatId, m, cleanBody);
                } else if (selectedCommand.execute && typeof selectedCommand.execute === 'function') {
                    console.log(chalk.blue(`   Type: Module.execute()`))
                    await selectedCommand.execute(sock, chatId, m, cleanBody);
                } else {
                    console.log(chalk.yellow(`   Type: Unknown format`))
                    await sock.sendMessage(chatId, {
                        text: `❌ Command error`
                    }, { quoted: m }).catch(() => {});
                }
                console.log(chalk.green(`✅ Command executed`))
            } catch (cmdErr) {
                console.error(chalk.red(`❌ Execution error: ${cmdErr.message}`));
                await sock.sendMessage(chatId, {
                    text: `❌ Error: ${cmdErr.message}`
                }, { quoted: m }).catch(() => {});
            }
        } else {
            console.log(chalk.yellow(`⚠️ Command not found: ${cmdName}`))
        }

    } catch (e) {
        console.error(chalk.red('Message handler error:'), e.message);
    }
}

// Status update handler (autostatus & statusforward)
async function handleStatus(sock, messageUpdate) {
    try {
        if (!sock || !messageUpdate?.messages?.length) return;
        await Promise.allSettled([
            handleStatusUpdate(sock, messageUpdate),
            handleStatusForward(sock, messageUpdate)
        ]);
    } catch (e) {
        // Silent fail for status handler
    }
}

module.exports = { handleMessages, handleStatus };
