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
    console.log(chalk.green(`✅ Loaded ${Object.keys(allCommands).length} commands`));
} catch (e) {
    console.error(chalk.red('Failed to load commands:'), e.message);
}

// Chatbot
const { handleChatbotMessage } = require('./commands/chatbot');

// ================= MAIN MESSAGE HANDLER =================
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

        // ================= CHATBOT =================
        try {
            await handleChatbotMessage(sock, chatId, m);
        } catch {}

        // ================= BUTTON HANDLING =================
        let buttonId = null;

        try {
            if (mType === 'buttonsResponseMessage') {
                buttonId = m.message.buttonsResponseMessage.selectedButtonId;
            }

            if (mType === 'templateButtonReplyMessage') {
                buttonId = m.message.templateButtonReplyMessage.selectedId;
            }

            if (mType === 'interactiveResponseMessage') {
                const data = m.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
                if (data) {
                    const parsed = JSON.parse(data);
                    buttonId = parsed.id || parsed.selectedRowId;
                }
            }

            if (buttonId) buttonId = String(buttonId).trim();

        } catch (e) {
            console.log(chalk.red('Button parse error:', e.message));
        }

        // ================= MESSAGE TEXT =================
        let rawBody = '';

        if (buttonId) {
            rawBody = buttonId.startsWith('.') ? buttonId : '.' + buttonId;
        } else {
            const msg = m.message;

            rawBody =
                msg.conversation ||
                msg.extendedTextMessage?.text ||
                msg.imageMessage?.caption ||
                msg.videoMessage?.caption ||
                msg.documentMessage?.caption ||
                '';
        }

        rawBody = rawBody.trim();

        if (!rawBody.startsWith('.')) return;

        const cleanBody = rawBody.startsWith('. ')
            ? '.' + rawBody.slice(1).trim()
            : rawBody;

        const [cmd, ...args] = cleanBody.trim().split(/\s+/);
        const cmdName = cmd.slice(1).toLowerCase();

        if (!cmdName) return;

        // ================= OWNER CHECK =================
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerCheck = m.key.fromMe || senderIsOwnerOrSudo;

        // ================= GROUP ADMIN CHECK =================
        let isAdmin = false;
        let isBotAdmin = false;

        if (chatId.endsWith('@g.us')) {
            try {
                const metadata = await sock.groupMetadata(chatId);

                const sender = metadata.participants.find(p => p.id === senderId);
                const bot = metadata.participants.find(p => p.id === sock.user.id);

                isAdmin = sender?.admin ? true : false;
                isBotAdmin = bot?.admin ? true : false;

            } catch (e) {
                console.log(chalk.red('Admin check error:', e.message));
            }
        }

        // ================= COMMAND LOADER =================
        const selectedCommand = getCommand(allCommands, cmdName);

        if (!selectedCommand) {
            console.log(chalk.yellow(`Command not found: ${cmdName}`));
            return;
        }

        // ================= CONTEXT OBJECT =================
        const context = {
            sock,
            m,
            chatId,
            senderId,
            body: cleanBody,
            args,
            command: cmdName,
            isOwner: isOwnerCheck,
            isAdmin,
            isBotAdmin
        };

        // ================= OWNER ONLY COMMANDS =================
        const sudoOnly = ['setpp', 'update', 'broadcast', 'cleartmp'];

        if (sudoOnly.includes(cmdName) && !isOwnerCheck) {
            return sock.sendMessage(chatId, {
                text: "❌ Owner only command!"
            }, { quoted: m });
        }

        // ================= EXECUTION =================
        try {
            if (typeof selectedCommand === 'function') {
                await selectedCommand(context);
            } else if (selectedCommand.execute) {
                await selectedCommand.execute(context);
            } else {
                await sock.sendMessage(chatId, {
                    text: "❌ Command format error"
                }, { quoted: m });
            }

        } catch (err) {
            console.log(chalk.red('Command error:', err.message));

            await sock.sendMessage(chatId, {
                text: `❌ Error: ${err.message}`
            }, { quoted: m });
        }

    } catch (e) {
        console.log(chalk.red('MAIN ERROR:', e.message));
    }
}

// ================= STATUS HANDLER =================
async function handleStatus(sock, messageUpdate) {
    try {
        await Promise.allSettled([
            handleStatusUpdate(sock, messageUpdate),
            handleStatusForward(sock, messageUpdate)
        ]);
    } catch {}
}

module.exports = { handleMessages, handleStatus };