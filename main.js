const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// --- Setup Temp Folders ---
const folders = [path.join(process.cwd(), 'temp'), path.join(process.cwd(), 'tmp')];
folders.forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true }); });

process.env.TMPDIR = folders[0];
process.env.TEMP = folders[0];
process.env.TMP = folders[0];

const settings = require('./settings');
require('./config.js');
const { safeSendMessage } = require('./lib/myfunc');
const isOwnerOrSudo = require('./lib/isOwner');

// Status & Chatbot Handlers
const { handleStatusUpdate } = require('./commands/autostatus');
const { handleChatbotMessage } = require('./commands/chatbot');

// Command loader - Ielekeze kusoma /commands pekee
const { autoLoadCommands, getCommand } = require('./lib/autoCommandLoader');
let allCommands = {}; 
global.MICKEY_COMMANDS = {};

function loadAllCommandsInitial() {
    try {
        // Hakikisha loader yako inasoma path ya /commands pekee
        allCommands = autoLoadCommands(path.join(process.cwd(), 'commands'));
        global.MICKEY_COMMANDS = allCommands;
        console.log(chalk.green(`✅ Commands: ${Object.keys(allCommands).length} loaded from /commands`));
        return allCommands;
    } catch (e) {
        console.error(chalk.red('❌ Load Error:'), e.message);
        return {};
    }
}

loadAllCommandsInitial();

async function handleMessages(sock, messageUpdate) {
    try {
        if (!sock || !sock.user) return;
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const m = messages[0];
        if (!m?.message || m.key.remoteJid === 'status@broadcast') return;

        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderId = m.key.participant || m.key.remoteJid;
        const mType = Object.keys(m.message)[0];

        // --- 🤖 1. Chatbot (Iwekwe kando isiblock execution) ---
        handleChatbotMessage(sock, chatId, m).catch(() => {});

        // --- 📝 2. Message Parsing ---
        let rawBody = (mType === 'conversation') ? m.message.conversation :
                      (mType === 'extendedTextMessage') ? m.message.extendedTextMessage.text :
                      (mType === 'imageMessage' || mType === 'videoMessage') ? m.message.caption : 
                      (mType === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId :
                      (mType === 'interactiveResponseMessage') ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '';

        if (!rawBody || !rawBody.startsWith('.')) return;

        const args = rawBody.trim().split(/ +/).slice(1);
        const cmdName = rawBody.trim().split(/ +/)[0].toLowerCase().slice(1);

        // --- 🛡️ 3. Admin & Owner Detection ---
        const groupMetadata = isGroup ? await sock.groupMetadata(chatId).catch(() => ({})) : {};
        const participants = isGroup ? groupMetadata.participants : [];
        const userStats = participants.find(p => p.id === senderId) || {};
        
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId) || m.key.fromMe;
        const isAdmin = isGroup ? (userStats.admin === 'admin' || userStats.admin === 'superadmin' || isOwner) : false;

        // --- 🚀 4. Execution Logic ---
        const selectedCommand = getCommand(global.MICKEY_COMMANDS, cmdName);

        if (selectedCommand) {
            // Check restrictions
            if (selectedCommand.ownerOnly && !isOwner) return sock.sendMessage(chatId, { text: "❌ Owner only!" });
            if (selectedCommand.adminOnly && !isAdmin) return sock.sendMessage(chatId, { text: "❌ Admins only!" });

            // Run command huku ikiruhusu message zingine kupita (Async execution)
            setImmediate(async () => {
                try {
                    await selectedCommand.execute(sock, chatId, m, { args, isAdmin, isOwner, rawBody });
                } catch (err) {
                    console.error(`[${cmdName} Error]:`, err.message);
                }
            });
        }

    } catch (e) {
        console.error(chalk.red('❌ Critical Error:'), e.message);
    }
}

// --- 📱 Autostatus Handler ---
async function handleStatus(sock, messageUpdate) {
    if (messageUpdate.key?.remoteJid === 'status@broadcast') {
        await handleStatusUpdate(sock, messageUpdate).catch(() => {});
    }
}

module.exports = { handleMessages, handleStatus };
