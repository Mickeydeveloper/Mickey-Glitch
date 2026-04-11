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

// --- 🚀 AUTOMATIC COMMAND LOADER ---
const { autoLoadCommands, getCommand } = require('./lib/autoCommandLoader');
let allCommands = {}; 

try {
    allCommands = autoLoadCommands();
    console.log(chalk.green(`✅ MICKEY GLITCH: Loaded ${Object.keys(allCommands).length} commands from /commands/`));
} catch (e) {
    console.error(chalk.red('❌ Failed to load commands:'), e);
}

// Static Imports (Kama bado unazihitaji manually)
const helpFunc = require('./commands/help');

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

        // --- 🔘 INTERACTIVE BUTTONS DECODER ---
        let buttonId = null;
        if (mType === 'interactiveResponseMessage') {
            const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                try {
                    const parsed = JSON.parse(paramsJson);
                    buttonId = parsed.id || parsed.selectedRowId;
                } catch (e) { console.log("JSON Parse Error on button"); }
            }
        } else if (mType === 'buttonsResponseMessage') {
            buttonId = m.message.buttonsResponseMessage.selectedButtonId;
        } else if (mType === 'templateButtonReplyMessage') {
            buttonId = m.message.templateButtonReplyMessage.selectedId;
        } else if (mType === 'listResponseMessage') {
            buttonId = m.message.listResponseMessage.singleSelectReply?.selectedRowId;
        }

        // --- 📝 MESSAGE PARSING (Mchanganyiko wa Text & Buttons) ---
        // Ikiwa ni button, tunaipa prefix (.) kama haina
        let body = '';
        if (buttonId) {
            body = buttonId.startsWith('.') ? buttonId : '.' + buttonId;
            console.log(chalk.yellow(`🔘 Button Clicked: ${body}`));
        } else {
            body = (
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                m.message?.videoMessage?.caption ||
                ''
            ).trim();
        }

        // Ikiwa ujumbe hauna prefix (nukta), usiendelee (Ignored)
        if (!body.startsWith('.')) return;

        const args = body.split(' ');
        const cmdName = args[0].toLowerCase().slice(1); // Toa nukta
        const fullCmd = args[0].toLowerCase();

        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerCheck = m.key.fromMe || senderIsOwnerOrSudo;

        // --- 🚀 EXECUTION ENGINE ---
        
        // 1. Static Case kwa Help/Menu (Inasoma file lako jipya)
        if (fullCmd === '.help' || fullCmd === '.menu') {
            // Kama ume-export kama { execute: func }
            if (helpFunc.execute) {
                return await helpFunc.execute(sock, chatId, m);
            } else {
                return await helpFunc(sock, chatId, m);
            }
        }

        // 2. Dynamic Handle (Inasink na Folder la Commands)
        const selectedCommand = getCommand(allCommands, cmdName);

        if (selectedCommand) {
            // Sudo Restriction
            const sudoOnly = ['setpp', 'update', 'broadcast', 'cleartmp'];
            if (sudoOnly.includes(cmdName) && !isOwnerCheck) {
                return await sock.sendMessage(chatId, { text: "❌ *ACCESS DENIED:* Amri hii ni kwa Owner tu!" });
            }

            console.log(chalk.cyan(`🚀 Executing: ${fullCmd}`));
            
            // Execute command (Inategemea kama ume-export command.execute au command pekee)
            if (typeof selectedCommand === 'function') {
                await selectedCommand(sock, chatId, m, body);
            } else if (selectedCommand.execute) {
                await selectedCommand.execute(sock, chatId, m, body);
            }
        }

    } catch (e) {
        console.error(chalk.red('Mickey Bot Error:'), e);
    }
}

module.exports = { handleMessages };
