// 🧹 Fix for ENOSPC / temp overflow
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

// --- � STATUS HANDLERS ---
const { handleStatusUpdate } = require('./commands/autostatus');
const { handleStatusForward } = require('./commands/statusforward');

// --- �🚀 AUTOMATIC COMMAND LOADER ---
const { autoLoadCommands, getCommand } = require('./lib/autoCommandLoader');
let allCommands = {}; 

try {
    allCommands = autoLoadCommands();
    console.log(chalk.green(`✅ MICKEY GLITCH: Loaded ${Object.keys(allCommands).length} commands`));
} catch (e) {
    console.error(chalk.red('❌ Failed to load commands:'), e);
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
        await handleChatbotMessage(sock, chatId, m);

        // --- 🔘 INTERACTIVE BUTTONS DECODER ---
        let buttonId = null;
        if (mType === 'interactiveResponseMessage') {
            const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                try {
                    const parsed = JSON.parse(paramsJson);
                    buttonId = parsed.id || parsed.selectedRowId;
                } catch (e) { console.log("JSON Parse Error"); }
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
        // Hii inafanya ". menu" iwe ".menu"
        const cleanBody = rawBody.startsWith('. ') 
            ? '.' + rawBody.slice(1).trim() 
            : rawBody.trim();

        const args = cleanBody.split(' ');
        const cmdName = args[0].toLowerCase().slice(1); // Mfano: "menu"
        const fullCmd = args[0].toLowerCase(); // Mfano: ".menu"

        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerCheck = m.key.fromMe || senderIsOwnerOrSudo;

        // --- 🚀 EXECUTION ENGINE ---

        // Case 1: Help/Menu (Inakubali .menu na . menu)
        if (cmdName === 'help' || cmdName === 'menu') {
            console.log(chalk.cyan(`🚀 Executing Menu: ${cleanBody}`));
            if (helpFunc.execute) {
                return await helpFunc.execute(sock, chatId, m);
            } else {
                return await helpFunc(sock, chatId, m);
            }
        }

        // Case 2: Dynamic Commands from /commands/ folder
        const selectedCommand = getCommand(allCommands, cmdName);

        if (selectedCommand) {
            // Sudo Restriction
            const sudoOnly = ['setpp', 'update', 'broadcast', 'cleartmp'];
            if (sudoOnly.includes(cmdName) && !isOwnerCheck) {
                return await sock.sendMessage(chatId, { 
                    text: "❌ *ACCESS DENIED (HURUHUSIWI):* Amri hii ni kwa Owner tu!" 
                }, { quoted: m });
            }

            console.log(chalk.cyan(`🚀 Executing Dynamic: ${fullCmd}`));

            if (typeof selectedCommand === 'function') {
                await selectedCommand(sock, chatId, m, cleanBody);
            } else if (selectedCommand.execute) {
                await selectedCommand.execute(sock, chatId, m, cleanBody);
            }
        }

    } catch (e) {
        console.error(chalk.red('Mickey Bot Error:'), e);
    }
}

// --- 📌 STATUS UPDATE HANDLER (for autostatus & statusforward) ---
async function handleStatus(sock, messageUpdate) {
    try {
        if (!sock || !messageUpdate?.messages?.length) return;

        // Run both handlers in parallel
        await Promise.allSettled([
            handleStatusUpdate(sock, messageUpdate),
            handleStatusForward(sock, messageUpdate)
        ]);
    } catch (e) {
        console.error(chalk.red('Status Handler Error:'), e);
    }
}

module.exports = { handleMessages, handleStatus };
