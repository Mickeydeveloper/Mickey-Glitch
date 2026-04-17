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
            console.error(chalk.yellow('Chatbot error (non-critical):'), chatErr.message);
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
            rawBody = (
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                m.message?.videoMessage?.caption ||
                ''
            ).trim();
        }

        // 1. Check if it starts with prefix (.)
        if (!rawBody.startsWith('.')) return;

        // 2. FIX: Handle ". menu" by removing space after dot
        const cleanBody = rawBody.startsWith('. ') 
            ? '.' + rawBody.slice(1).trim() 
            : rawBody.trim();

        const args = cleanBody.split(' ');
        const cmdName = args[0].toLowerCase().slice(1); // Mfano: "menu"
        const fullCmd = args[0].toLowerCase(); // Mfano: ".menu"

        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerCheck = m.key.fromMe || senderIsOwnerOrSudo;

        // --- 🚀 EXECUTION ENGINE ---

        // Case 1: Help/Menu
        if (cmdName === 'help' || cmdName === 'menu') {
            try {
                if (helpFunc.execute) {
                    await helpFunc.execute(sock, chatId, m);
                } else if (typeof helpFunc === 'function') {
                    await helpFunc(sock, chatId, m);
                } else {
                    console.error(chalk.red('Help function invalid'));
                }
            } catch (hexErr) {
                console.error(chalk.red('Help error:'), hexErr.message);
            }
            return;
        }

        // Case 2: Dynamic Commands from /commands/ folder
        const selectedCommand = getCommand(allCommands, cmdName);

        if (selectedCommand) {
            // Sudo Restriction
            const sudoOnly = ['setpp', 'update', 'broadcast', 'cleartmp'];
            if (sudoOnly.includes(cmdName) && !isOwnerCheck) {
                await sock.sendMessage(chatId, { 
                    text: "❌ *ACCESS DENIED:* Owner only!" 
                }, { quoted: m }).catch(() => {});
                return;
            }

            try {
                if (typeof selectedCommand === 'function') {
                    await selectedCommand(sock, chatId, m, cleanBody);
                } else if (selectedCommand.execute && typeof selectedCommand.execute === 'function') {
                    await selectedCommand.execute(sock, chatId, m, cleanBody);
                } else {
                    await sock.sendMessage(chatId, {
                        text: `❌ Command error`
                    }, { quoted: m }).catch(() => {});
                }
            } catch (cmdErr) {
                console.error(chalk.red(`Command error: ${cmdErr.message}`));
                await sock.sendMessage(chatId, {
                    text: `❌ Error: ${cmdErr.message}`
                }, { quoted: m }).catch(() => {});
            }
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
