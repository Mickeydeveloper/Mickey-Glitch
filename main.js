const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Load configurations & helpers
const settings = require('./settings');
require('./config.js');
const isOwnerOrSudo = require('./lib/isOwner');
const { handleChatbotMessage } = require('./commands/chatbot');
const { handleStatusUpdate } = require('./commands/autostatus');

// Command loader (Inasoma /commands pekee)
const { autoLoadCommands, getCommand } = require('./lib/autoCommandLoader');
let allCommands = autoLoadCommands(path.join(process.cwd(), 'commands'));

async function handleMessages(sock, messageUpdate) {
    try {
        if (!sock || !sock.user || messageUpdate.type !== 'notify') return;

        const m = messageUpdate.messages[0];
        if (!m?.message || m.key.remoteJid === 'status@broadcast') return;

        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderId = m.key.participant || m.key.remoteJid;

        // --- 🤖 1. CHATBOT (Async - Hai-block command zingine) ---
        handleChatbotMessage(sock, chatId, m).catch(() => {});

        // --- 📝 2. PARSE TEXT ---
        const mType = Object.keys(m.message)[0];
        let body = (mType === 'conversation') ? m.message.conversation :
                   (mType === 'extendedTextMessage') ? m.message.extendedTextMessage.text :
                   (mType === 'imageMessage' || mType === 'videoMessage') ? m.message.caption : 
                   (mType === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId :
                   (mType === 'interactiveResponseMessage') ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '';

        if (!body || !body.startsWith('.')) return;

        // Safisha amri (e.g. ".add 255..." -> cmd: "add", text: "255...")
        const prefix = '.';
        const args = body.trim().split(/ +/).slice(1);
        const commandName = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();
        const textFromMessage = body.slice(prefix.length + commandName.length).trim();

        // --- 🛡️ 3. RECOGNITION (isAdmin/isOwner) ---
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId) || m.key.fromMe;
        
        // Hapa tunatafuta admin status haraka
        let isAdmin = false;
        if (isGroup) {
            const groupMetadata = await sock.groupMetadata(chatId).catch(() => ({}));
            const participants = groupMetadata.participants || [];
            const user = participants.find(p => p.id === senderId);
            isAdmin = user?.admin === 'admin' || user?.admin === 'superadmin' || isOwner;
        }

        // --- 🚀 4. EXECUTION ENGINE ---
        // Tunachukua command kutoka kwenye cache
        const cmdFile = allCommands[commandName] || Object.values(allCommands).find(c => c.aliases && c.aliases.includes(commandName));

        if (cmdFile) {
            // MUHIMU: Kwa kuwa ume-export function moja kwa moja (module.exports = addCommand)
            // Tunai-call kama function: cmdFile(sock, chatId, m, text)
            
            setImmediate(async () => {
                try {
                    // Tuma data zote muhimu kwenye command
                    await cmdFile(sock, chatId, m, textFromMessage, { 
                        args, 
                        isAdmin, 
                        isOwner, 
                        commandName 
                    });
                } catch (err) {
                    console.error(chalk.red(`❌ Error kwenye command [${commandName}]:`), err.message);
                }
            });
        }

    } catch (e) {
        console.error(chalk.red('❌ CRITICAL ERROR:'), e.message);
    }
}

/**
 * Handle status (Autostatus)
 */
async function handleStatus(sock, messageUpdate) {
    try {
        if (messageUpdate.key?.remoteJid === 'status@broadcast') {
            await handleStatusUpdate(sock, messageUpdate);
        }
    } catch (e) {}
}

module.exports = { handleMessages, handleStatus };
