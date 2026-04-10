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

const settings = require('./settings');
require('./config.js');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const axios = require('axios');
const os = require('os');
const { sendButtons } = require('gifted-btns');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { autotypingCommand, handleAutotypingForMessage } = require('./commands/autotyping');
const { autoreadCommand, handleAutoread } = require('./commands/autoread');
const { autoBioCommand } = require('./commands/autobio');

// --- 📦 COMMAND IMPORTS (ZOTE ZAKO) ---
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
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection } = require('./commands/mention');
const { handleAntiStatusMention } = require('./commands/antistatusmention');
const weatherCommand = require('./commands/weather');
const { lyricsCommand } = require('./commands/lyrics');
const blurCommand = require('./commands/img-blur');
const { handleBadwordDetection } = require('./lib/antibadword');
const takeCommand = require('./commands/take');
const resetlinkCommand = require('./commands/resetlink');
const viewOnceCommand = require('./commands/viewonce');
const { handleStatusUpdate } = require('./commands/autostatus');
const { handleStatusForward } = require('./commands/statusforward');
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

const { safeSendMessage } = require('./lib/myfunc');

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        if (!sock || !sock.user || typeof sock.sendMessage !== 'function') return;

        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // --- 🛠️ REKEBISHO LA HANDLER (BUTTONS & LISTS) ---
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

        // --- 🛠️ DECODE BUTTON TO COMMAND ---
        let decodedCommand = buttonId;
        if (buttonId) {
            // Kama ni play kutoka shazam/yt
            if (buttonId.startsWith('play_')) {
                decodedCommand = `.play ${decodeURIComponent(buttonId.replace('play_video_', '').replace('play_', ''))}`;
            } 
            // Hakikisha ina dot (.)
            if (decodedCommand && !decodedCommand.startsWith('.')) {
                decodedCommand = '.' + decodedCommand;
            }
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        // Logic ya kuset userMessage (Kama ni button, itachukua decodedCommand)
        let userMessage = (
            decodedCommand || 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        ).trim();

        userMessage = userMessage.replace(/^\.\s+/, "."); // Fix ". ping" -> ".ping"
        const lowerUserMessage = userMessage.toLowerCase();
        const args = userMessage.split(' ');
        const command = args[0].toLowerCase();

        // 📝 Log Command
        if (command.startsWith('.')) {
            console.log(chalk.cyan(`📝 Command: ${userMessage}`));
        }

        // --- 🛡️ PRIVACY & ADMIN CHECKS ---
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // (Hapa weka zile background tasks zako)
        handleAutoread(sock, message).catch(() => {});
        if (message.message) storeMessage(sock, message).catch(() => {});
        if (isGroup) {
            await handleBadwordDetection(sock, chatId, message, lowerUserMessage, senderId);
            await Antilink(message, sock);
        }

        // --- 🚀 FULL COMMAND SWITCH (Kila kitu chako kipo hapa) ---
        if (command.startsWith('.')) {
            switch (command) {
                // Info & Utils
                case '.help': case '.menu': await helpCommand(sock, chatId, message, userMessage); break;
                case '.ping': await pingCommand(sock, chatId, message); break;
                case '.alive': await aliveCommand(sock, chatId, message); break;
                case '.owner': await ownerCommand(sock, chatId, message); break;
                case '.runtime': await sock.sendMessage(chatId, { text: `*Runtime:* ${process.uptime().toFixed(2)}s` }); break;
                case '.repo': case '.checkupdates': await repoCommand(sock, chatId, message); break;
                case '.update': await updateCommand(sock, chatId, message); break;

                // Media & Downloaders
                case '.play': await playCommand(sock, chatId, message, userMessage); break;
                case '.video': await videoCommand(sock, chatId, message, userMessage); break;
                case '.sticker': await stickerCommand(sock, chatId, message); break;
                case '.shazam': await shazamCommand(sock, chatId, message); break;
                case '.tiktok': await tiktokCommand(sock, chatId, message, userMessage); break;
                case '.ig': case '.instagram': await instagramCommand(sock, chatId, message, userMessage); break;
                case '.fb': case '.facebook': await facebookCommand(sock, chatId, message, userMessage); break;
                case '.lyrics': await lyricsCommand(sock, chatId, message, userMessage); break;
                case '.tts': await ttsCommand(sock, chatId, message, userMessage); break;

                // AI
                case '.ai': await aiCommand(sock, chatId, message, userMessage); break;
                case '.imagine': await imagineCommand(sock, chatId, message, userMessage); break;

                // Admin & Group (Zinahitaji admin check)
                case '.tagall': await tagAllCommand(sock, chatId, message, userMessage); break;
                case '.hidetag': await tagAllCommand(sock, chatId, message, userMessage); break; // Au hidetagCommand
                case '.kick': await kickCommand(sock, chatId, message, userMessage); break;
                case '.promote': await promoteCommand(sock, chatId, message, userMessage); break;
                case '.demote': await demoteCommand(sock, chatId, message, userMessage); break;
                case '.mute': await muteCommand(sock, chatId, message); break;
                case '.unmute': await unmuteCommand(sock, chatId, message); break;
                case '.ban': await banCommand(sock, chatId, message, userMessage); break;
                case '.unban': await unbanCommand(sock, chatId, message, userMessage); break;

                // Owner/Sudo Only
                case '.sudo': if (isOwnerOrSudoCheck) await sudoCommand(sock, chatId, message, userMessage); break;
                case '.setpp': if (isOwnerOrSudoCheck) await setProfilePicture(sock, chatId, message); break;
                
                default:
                    // Kama unataka bot iseme kitu amri isipopatikana
                    break;
            }
        } else {
            // Hapa ni kwa ajili ya meseji za kawaida zisizo na nukta
            if (typeof handleChatbotMessage === 'function') await handleChatbotMessage(sock, chatId, message, lowerUserMessage);
        }

    } catch (e) {
        console.error('Mickey Bot Error:', e);
    }
}

module.exports = { handleMessages };
