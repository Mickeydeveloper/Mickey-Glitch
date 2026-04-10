// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');

if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
if (!fs.existsSync(customTmp)) fs.mkdirSync(customTmp, { recursive: true });

process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Global performance cache
const performanceCache = {
    lastCleanup: Date.now(),
    messageCount: 0
};

// 🧹 Temp cleanup (Every 30 mins)
setInterval(() => {
  const foldersToClean = [customTemp, customTmp];
  foldersToClean.forEach(folder => {
    try {
      if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);
        if (files.length > 200) {
          files.forEach(file => {
            try { fs.rmSync(path.join(folder, file), { recursive: true, force: true }); } catch (e) {}
          });
        }
      }
    } catch (e) {}
  });
  performanceCache.lastCleanup = Date.now();
}, 30 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
const { safeSendMessage } = require('./lib/myfunc');
const isOwnerOrSudo = require('./lib/isOwner');

// --- � STATUS HANDLERS IMPORTS ---
const { handleStatusUpdate, autoLike, autoView } = require('./commands/autostatus');
const { handleStatusForward } = require('./commands/statusforward');

// --- �🚀 AUTOMATIC COMMAND LOADER SETUP ---
const { autoLoadCommands, getCommand } = require('./lib/autoCommandLoader');
let allCommands = {}; 

// Pakia commands zote toka folder la 'commands' wakati wa kuanza
try {
    allCommands = autoLoadCommands();
    console.log(chalk.green(`✅ Auto-loaded ${Object.keys(allCommands).length} commands from folder.`));
} catch (e) {
    console.error(chalk.red('❌ Failed to auto-load commands:'), e);
}

// --- 📦 STATIC COMMAND IMPORTS (Zile ulizozitaja) ---
const helpCommand = require('./commands/help');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
// ... (Weka zingine kama zilivyo mwanzo)

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        if (!sock || !sock.user) return;

        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // --- 🔘 UNIVERSAL BUTTON/LIST HANDLE ---
        const mType = Object.keys(message.message)[0];
        let buttonId = null;

        if (mType === 'buttonsResponseMessage') {
            buttonId = message.message.buttonsResponseMessage.selectedButtonId;
        } else if (mType === 'templateButtonReplyMessage') {
            buttonId = message.message.templateButtonReplyMessage.selectedId;
        } else if (mType === 'listResponseMessage') {
            buttonId = message.message.listResponseMessage.singleSelectReply?.selectedRowId || message.message.listResponseMessage.selectedRowId;
        } else if (mType === 'interactiveResponseMessage') {
            const paramsJson = message.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                try { buttonId = JSON.parse(paramsJson).id; } catch (e) { buttonId = null; }
            }
        }

        // Convert button click to command format
        let decodedCmd = buttonId;
        if (buttonId) {
            if (buttonId.startsWith('play_')) {
                decodedCmd = `.play ${decodeURIComponent(buttonId.replace('play_video_', '').replace('play_', ''))}`;
            } 
            if (decodedCmd && !decodedCmd.startsWith('.')) {
                decodedCmd = '.' + decodedCmd;
            }
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        // --- 📝 MESSAGE PARSING ---
        let userMessage = (
            decodedCmd || 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        ).trim();

        if (!userMessage.startsWith('.')) return; // Kama sio command, acha

        userMessage = userMessage.replace(/^\.\s+/, "."); 
        const args = userMessage.split(' ');
        const cmdName = args[0].toLowerCase().slice(1); // Toa dot (.)
        const fullCmd = args[0].toLowerCase();

        console.log(chalk.cyan(`📝 Processing: ${fullCmd}`));

        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // --- 🚀 DYNAMIC & STATIC COMMAND EXECUTION ---
        // 1. Angalia kama ni Static Command (Switch case)
        switch (fullCmd) {
            case '.help': case '.menu': return await helpCommand(sock, chatId, message, userMessage);
            case '.ping': return await pingCommand(sock, chatId, message);
            case '.alive': return await aliveCommand(sock, chatId, message);
        }

        // 2. Kama haipo kwenye switch, itafute Automatic kwenye folder (Dynamic Handle)
        const dynamicCommand = getCommand(allCommands, cmdName);
        
        if (dynamicCommand) {
            // Kama command inahitaji sudo tu
            const sudoOnlyCmds = ['sudo', 'setpp', 'update', 'cleartmp'];
            if (sudoOnlyCmds.includes(cmdName) && !isOwnerOrSudoCheck) {
                return await sock.sendMessage(chatId, { text: "❌ Command hii ni kwa Owner tu!" });
            }

            // Tekeleza command iliyopatikana toka folder
            await dynamicCommand(sock, chatId, message, userMessage);
        } else {
            // Optional: Kama command haitambuliki kabisa
            // console.log(`Command .${cmdName} not found.`);
        }

    } catch (e) {
        console.error('Mickey Bot Error:', e.message);
    }
}

// --- 📤 HANDLE STATUS UPDATES ---
async function handleStatus(sock, statusUpdate) {
    try {
        if (!sock) return;
        
        // Handle AutoStatus (View + Like)
        await handleStatusUpdate(sock, statusUpdate);
        
        // Handle Status Forward (Download & Send to Owner)
        await handleStatusForward(sock, statusUpdate);
        
    } catch (err) {
        console.error('[Status Handler] Error:', err.message);
    }
}

module.exports = { handleMessages, handleStatus };
