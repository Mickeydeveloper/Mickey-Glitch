// 🧹 Fix for ENOSPC / temp overflow in hosted panels
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

const performanceCache = {
    lastCleanup: Date.now(),
    messageCount: 0
};

setInterval(() => {
  const foldersToClean = [customTemp, customTmp];
  foldersToClean.forEach(folder => {
    try {
      if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);
        if (files.length > 200) {
          files.forEach(file => {
            try {
              fs.rmSync(path.join(folder, file), { recursive: true, force: true });
            } catch (e) {}
          });
        }
      }
    } catch (e) {}
  });
  performanceCache.lastCleanup = Date.now();
}, 30 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
const yts = require('yt-search');
const { fetchBuffer, safeSendMessage } = require('./lib/myfunc');
const fetch = require('node-fetch');
const axios = require('axios');
const os = require('os');
const { sendButtons } = require('gifted-btns');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
// --- AUTOMATIC COMMAND LOADER ---
const { autoLoadCommands, getCommand, getCommandExports } = require('./lib/autoCommandLoader');
let allCommands = {}; // Will be populated at startup
const { autotypingCommand, handleAutotypingForMessage } = require('./commands/autotyping');
const { autoreadCommand, handleAutoread } = require('./commands/autoread');
const { autoBioCommand } = require('./commands/autobio');

// --- 📦 COMMAND IMPORTS ---
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const addCommand = require('./commands/add');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const unbanCommand = require('./commands/unban');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const { incrementMessageCount } = require('./commands/topmembers');
const { logGhostActivity } = require('./commands/ghost');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand } = require('./commands/antilink');
const { handleTagDetection } = require('./commands/antitag');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection } = require('./commands/mention');
const { handleAntiStatusMention } = require('./commands/antistatusmention');
const weatherCommand = require('./commands/weather');
const { lyricsCommand } = require('./commands/lyrics');
const blurCommand = require('./commands/img-blur');
const { handleBadwordDetection } = require('./lib/antibadword');
const resetlinkCommand = require('./commands/resetlink');
const { handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const setProfilePicture = require('./commands/setpp');
const playCommand = require('./commands/play');
const shazamCommand = require('./commands/shazam');
const tiktokCommand = require('./commands/tiktok');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const { aiCommand } = require('./commands/ai');
const { handleChatbotMessage } = require('./commands/chatbot');
const urlCommand = require('./commands/url');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const sudoCommand = require('./commands/sudo');
const updateCommand = require('./commands/update');
const repoCommand = require('./commands/checkupdates');

global.packname = settings.packname;
global.author = settings.author;

// 🚀 AUTO-LOAD ALL COMMANDS AT STARTUP
allCommands = autoLoadCommands();
console.log(`✅ Auto-loaded ${Object.keys(allCommands).length} commands from commands folder`);

// --- 🛠️ FIXED HANDLER ---
async function handleMessages(sock, messageUpdate, printLog) {
    try {
        if (!sock || !sock.user) return;

        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Button/List Detection
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

        let decodedCommand = buttonId;
        if (buttonId) {
            if (buttonId.startsWith('play_')) {
                decodedCommand = `.play ${decodeURIComponent(buttonId.replace('play_video_', '').replace('play_', ''))}`;
            } 
            if (decodedCommand && !decodedCommand.startsWith('.')) {
                decodedCommand = '.' + decodedCommand;
            }
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        let userMessage = (
            decodedCommand || 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            ''
        ).trim();

        userMessage = userMessage.replace(/^\.\s+/, "."); 
        const lowerUserMessage = userMessage.toLowerCase();
        const args = userMessage.split(' ');
        const command = args[0].toLowerCase();

        // 📝 Background Tasks (Zile zako zote)
        handleAutoread(sock, message).catch(() => {});
        if (message.message) storeMessage(sock, message).catch(() => {});
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        if (command.startsWith('.')) {
            console.log(chalk.cyan(`📝 Command: ${userMessage}`));
            const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
            const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

            // --- FULL COMMAND SWITCH (Hakuna kilichopungua) ---
            switch (command) {
                case '.help': case '.menu': await helpCommand(sock, chatId, message, userMessage); break;
                case '.ping': await pingCommand(sock, chatId, message); break;
                case '.alive': await aliveCommand(sock, chatId, message); break;
                case '.owner': await ownerCommand(sock, chatId, message); break;
                case '.repo': case '.checkupdates': await repoCommand(sock, chatId, message); break;
                case '.update': await updateCommand(sock, chatId, message); break;
                case '.play': await playCommand(sock, chatId, message, userMessage); break;
                case '.video': await videoCommand(sock, chatId, message, userMessage); break;
                case '.shazam': await shazamCommand(sock, chatId, message); break;
                case '.sticker': await stickerCommand(sock, chatId, message); break;
                case '.ai': await aiCommand(sock, chatId, message, userMessage); break;
                case '.imagine': await imagineCommand(sock, chatId, message, userMessage); break;
                case '.tiktok': await tiktokCommand(sock, chatId, message, userMessage); break;
                case '.ig': case '.instagram': await instagramCommand(sock, chatId, message, userMessage); break;
                case '.fb': case '.facebook': await facebookCommand(sock, chatId, message, userMessage); break;
                case '.lyrics': await lyricsCommand(sock, chatId, message, userMessage); break;
                case '.tts': await ttsCommand(sock, chatId, message, userMessage); break;
                case '.weather': await weatherCommand(sock, chatId, message, userMessage); break;
                case '.tagall': if (isGroup) await tagAllCommand(sock, chatId, message, userMessage); break;
                case '.mute': if (isGroup) await muteCommand(sock, chatId, message); break;
                case '.unmute': if (isGroup) await unmuteCommand(sock, chatId, message); break;
                case '.kick': if (isGroup) {
                    const kickCmd = getCommand(allCommands, 'kick', 'kickCommand') || getCommand(allCommands, 'kick');
                    if (kickCmd) await kickCmd(sock, chatId, message, userMessage);
                    else console.warn('❌ kick command not found');
                } break;
                case '.promote': if (isGroup) await promoteCommand(sock, chatId, message, userMessage); break;
                case '.demote': if (isGroup) await demoteCommand(sock, chatId, message, userMessage); break;
                case '.ban': if (isGroup) await banCommand(sock, chatId, message, userMessage); break;
                case '.unban': if (isGroup) await unbanCommand(sock, chatId, message, userMessage); break;
                case '.sudo': if (isOwnerOrSudoCheck) await sudoCommand(sock, chatId, message, userMessage); break;
                case '.setpp': if (isOwnerOrSudoCheck) await setProfilePicture(sock, chatId, message); break;
                case '.autotype': await autotypingCommand(sock, chatId, message, userMessage); break;
                case '.autoread': await autoreadCommand(sock, chatId, message, userMessage); break;
            }
            // FALLBACK: Try to auto-execute any unhandled commands
            if (!handledBySwitch) {
                const cmdName = command.slice(1).toLowerCase(); // Remove the dot
                const autoCmd = getCommand(allCommands, cmdName);
                if (autoCmd && typeof autoCmd === 'function') {
                    try {
                        await autoCmd(sock, chatId, message, userMessage);
                    } catch (err) {
                        console.error(`Error executing auto-loaded command ${cmdName}:`, err);
                    }
                }
            }
        } else {
            // Non-command logic
            if (isGroup) {
                await handleBadwordDetection(sock, chatId, message, lowerUserMessage, senderId);
                await Antilink(message, sock);
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            }
            if (typeof handleChatbotMessage === 'function') await handleChatbotMessage(sock, chatId, message, lowerUserMessage);
        }

    } catch (e) {
        console.error('Mickey Bot Error:', e.message);
    }
}

module.exports = { handleMessages };
