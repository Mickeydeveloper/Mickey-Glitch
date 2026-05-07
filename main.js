// 🧹 Auto-folder & Temp setup
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Orodha ya folders muhimu (Auto-create kama hazipo)
const folders = ['./temp', './tmp', './data', './lib', './commands'];
folders.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

process.env.TMPDIR = path.join(process.cwd(), 'temp');

// 🔄 AUTO-LOADER KWA LIB NA DATA (Zinasajiliwa globaly au zinakuwa accessible)
const libFiles = fs.readdirSync('./lib').filter(file => file.endsWith('.js'));
libFiles.forEach(file => {
    try { require(`./lib/${file}`); } catch (e) { console.log(chalk.red(`⚠️ Lib error [${file}]: ${e.message}`)); }
});

const settings = require('./settings');
require('./config.js');

// Status handlers & Command Imports
const { handleAutoStatus, autoStatusCommand } = require('./commands/autostatus');
const { handleStatusForward, statusForwardCommand } = require('./commands/statusforward');
const { handleChatbotMessage } = require('./commands/chatbot');
const { handleAutoread } = require('./commands/autoread');
const { storeMessage, handleMessageRevocation } = require('./commands/antidelete');
const isOwnerOrSudo = require('./lib/isOwner');

// ────────────────────────────────────────────────
// MAIN MESSAGE HANDLER
// ────────────────────────────────────────────────
async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m?.message) return;

        const chatId = m.key.remoteJid;
        const senderId = m.key.participant || m.key.remoteJid;

        // 1. Huduma za Automatic (Background)
        await handleAutoread(sock, m);
        storeMessage(sock, m);
        if (m.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, m);
            return;
        }

        // 2. Parsing Message
        let body = (m.message.conversation || m.message.extendedTextMessage?.text || 
                    m.message.imageMessage?.caption || m.message.videoMessage?.caption || "").trim();
        
        if (!body.startsWith('.')) {
            // Chatbot inafanya kazi hapa kama hakuna dot (.)
            if (typeof handleChatbotMessage === 'function') await handleChatbotMessage(sock, chatId, m, body);
            return;
        }

        const args = body.split(' ');
        const userMessage = body.toLowerCase();
        const isOwner = m.key.fromMe || await isOwnerOrSudo(senderId, sock, chatId);

        // 3. 🚀 SWITCH-CASE (Zimerudishwa zote kama ulivyoomba)
        switch (true) {
            // Commands za Status
            case userMessage.startsWith('.autostatus'):
                await autoStatusCommand(sock, chatId, m, args.slice(1));
                break;
            case userMessage.startsWith('.statusforward'):
                await statusForwardCommand(sock, chatId, m, args.slice(1));
                break;

            // Commands za Group & Admin
            case userMessage.startsWith('.add'):
                const addCmd = require('./commands/add');
                await addCmd(sock, chatId, senderId, body.slice(5), m);
                break;
            case userMessage.startsWith('.kick'):
                const kickCmd = require('./commands/kick');
                await kickCmd(sock, chatId, senderId, m.message.extendedTextMessage?.contextInfo?.mentionedJid || [], m);
                break;

            // System Commands
            case userMessage === '.ping':
                const pingCmd = require('./commands/ping');
                await pingCmd(sock, chatId, m);
                break;
            case userMessage === '.menu':
                const menuCmd = require('./commands/menu');
                await menuCmd(sock, chatId, m);
                break;
            
            // Ongeza case zako nyingine hapa (kama .sticker, .play n.k.)
        }

    } catch (e) {
        console.error(chalk.red('❌ Error kwenye handleMessages:'), e.message);
    }
}

// ────────────────────────────────────────────────
// 🛡️ STATUS HANDLER (Fixed & Automatic)
// ────────────────────────────────────────────────
async function handleStatus(sock, messageUpdate) {
    try {
        if (!sock || !messageUpdate?.messages) return;
        
        // 1. View & Reaction (Hii inaitwa handleAutoStatus)
        // Inachuja namba yako automatic ndani ya autostatus.js
        const statusProcessed = await handleAutoStatus(sock, messageUpdate);
        
        // 2. Forward Logic (Inafanya kazi kama view imefanikiwa)
        if (statusProcessed) {
            await handleStatusForward(sock, statusProcessed);
        }
    } catch (e) {
        // Silent error kuzuia bot ku-crash status zikiwa nyingi
    }
}

module.exports = { handleMessages, handleStatus };
