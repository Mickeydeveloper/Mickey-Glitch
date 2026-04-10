// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');

// Create folders if they don't exist
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

// 🧹 OPTIMIZED temp cleanup - Every 30 minutes
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
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');
const { sendButtons } = require('gifted-btns');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { autoBioCommand } = require('./commands/autobio');

// Command imports
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
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const { logGhostActivity, ghostCommand } = require('./commands/ghost');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand, groupMentionToggleCommand } = require('./commands/mention');
const { handleAntiStatusMention, groupAntiStatusToggleCommand } = require('./commands/antistatusmention');
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const weatherCommand = require('./commands/weather');
const reportCommand = require('./commands/report'); 
const { halotelCommand } = require('./commands/halotel');
const kickCommand = require('./commands/kick');
const { complimentCommand } = require('./commands/compliment');
const { lyricsCommand } = require('./commands/lyrics');
const { clearCommand } = require('./commands/clear');
const blurCommand = require('./commands/img-blur');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');
const takeCommand = require('./commands/take');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { autoStatusCommand, handleStatusUpdate } = require('./commands/autostatus');
const { statusForwardCommand, handleStatusForward } = require('./commands/statusforward');
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const clearTmpCommand = require('./commands/cleartmp');
const setProfilePicture = require('./commands/setpp');
const getProfilePicture = require('./commands/getpp');
const { setGroupDescription, setGroupName, setGroupPhoto } = require('./commands/groupmanage');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const playCommand = require('./commands/play');
const shazamCommand = require('./commands/shazam');
const tiktokCommand = require('./commands/tiktok');
const { aiCommand } = require('./commands/ai');
const { handleChatbotMessage, groupChatbotToggleCommand } = require('./commands/chatbot');
const urlCommand = require('./commands/url');
const { handleTranslateCommand } = require('./commands/translate');
const { addCommandReaction, handleAreactCommand } = require('./lib/reactions');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const sudoCommand = require('./commands/sudo');
const stickercropCommand = require('./commands/stickercrop');
const updateCommand = require('./commands/update');
const repoCommand = require('./commands/checkupdates');
const { igsCommand } = require('./commands/igs');
const cloneCommand = require('./commands/clone');
const { anticallCommand, readState: readAnticallState, handleAnticall } = require('./commands/anticall');
const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const whoisCommand = require('./commands/whois');

global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26";
global.ytch = "MICKEY";

const { safeSendMessage } = require('./lib/myfunc');

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
}

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        if (!sock || !sock.user || typeof sock.sendMessage !== 'function') return;

        if (!sock._timeoutWrapped) {
            sock._timeoutWrapped = true;
            if (typeof sock.sendMessage === 'function') {
                sock._timeoutBase = sock.sendMessage.bind(sock);
            }
            sock.sendMessage = async (chatId, message, options = {}) => {
                try {
                    return await safeSendMessage(sock, chatId, message, options, 30000);
                } catch (error) {
                    console.error('SendMessage failed:', error.message);
                    throw error;
                }
            };
        }

        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // --- 🛠️ IMPROVED BUTTON DETECTION ---
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
                try {
                    buttonId = JSON.parse(paramsJson).id;
                } catch (e) { buttonId = null; }
            }
        }

        // --- 🛠️ DECODE ENCODED IDs ---
        let decodedButtonId = buttonId;
        if (buttonId) {
            if (buttonId.startsWith('play_')) {
                if (buttonId.startsWith('play_video_')) {
                    decodedButtonId = `.play ${decodeURIComponent(buttonId.replace('play_video_', ''))}`;
                } else {
                    const parts = buttonId.split('_');
                    decodedButtonId = `.play ${decodeURIComponent(parts.slice(1).join(' '))}`;
                }
            } else if (buttonId.startsWith('run_cmd_')) {
                decodedButtonId = buttonId.replace('run_cmd_', '');
            } else if (buttonId === 'repo_download_zip') {
                const { downloadZipCommand } = require('./commands/checkupdates');
                return await downloadZipCommand(sock, message.key.remoteJid, message);
            }
            
            // Hakikisha ID ya button inakuwa na prefix ya Dot
            if (decodedButtonId && !decodedButtonId.startsWith('.')) {
                decodedButtonId = '.' + decodedButtonId;
            }
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        handleAutoread(sock, message).catch(() => {});
        if (message.message) storeMessage(sock, message).catch(() => {});

        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // --- 🛠️ FIX: PREVENT WRONG COMMAND DETECTION ---
        let userMessage = (
            decodedButtonId || 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        ).trim();

        // Rekebisha nafasi mfano ". ping" iwe ".ping"
        userMessage = userMessage.replace(/^\.\s+/, ".");
        const lowerUserMessage = userMessage.toLowerCase();

        if (lowerUserMessage.startsWith('.')) {
            console.log(isGroup ? chalk.cyan(`📝 Command used: ${userMessage}`) : chalk.magenta(`📝 Command used: ${userMessage}`));
        }

        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {}

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        if (!message.key.fromMe) {
            incrementMessageCount(chatId, senderId);
            logGhostActivity(chatId, message);
        }

        if (isGroup) {
            if (lowerUserMessage) await handleBadwordDetection(sock, chatId, message, lowerUserMessage, senderId);
            await Antilink(message, sock);
        }

        if (!isGroup && !message.key.fromMe && !senderIsOwnerOrSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'PM is blocked.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) {}
                    return;
                }
            } catch (e) {}
        }

        // Logic ya kawaida ya text isiyo na prefix
        if (!lowerUserMessage.startsWith('.')) {
            const replyQuoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = (replyQuoted?.conversation || replyQuoted?.extendedTextMessage?.text || '').toLowerCase();
            const isMenuReply = quotedText && (quotedText.includes('command categories') || quotedText.includes('reply with number'));

            if (isMenuReply && /^\d+$/.test(lowerUserMessage)) {
                await helpCommand(sock, chatId, message, `.help ${lowerUserMessage}`);
                return;
            }

            await handleAutotypingForMessage(sock, chatId, lowerUserMessage);
            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
                if (typeof handleAntiStatusMention === 'function') await handleAntiStatusMention(sock, chatId, message);
            }
            if (typeof handleChatbotMessage === 'function') await handleChatbotMessage(sock, chatId, message, lowerUserMessage);
            return;
        }

        const basicCommands = ['.help', '.ping', '.owner', '.menu', '.alive', '.status', '.connection', '.sendzip'];
        const isBasicCommand = basicCommands.some(cmd => lowerUserMessage === cmd || lowerUserMessage.startsWith(cmd + ' '));

        if (!isPublic && !isOwnerOrSudoCheck && !isBasicCommand) return;

        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const isAdminCommand = adminCommands.some(cmd => lowerUserMessage.startsWith(cmd));

        const ownerCommands = ['.mode', '.autostatus', '.statusforward', '.antidelete', '.cleartmp', '.setpp', '.pp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autoread', '.pmblocker'];
        const isOwnerCommand = ownerCommands.some(cmd => lowerUserMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Bot must be admin.' }, { quoted: message });
                return;
            }
            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { text: 'Admins only.' }, { quoted: message });
                return;
            }
        }

        if (isOwnerCommand && !message.key.fromMe && !senderIsOwnerOrSudo) {
            await sock.sendMessage(chatId, { text: 'Owner only.' }, { quoted: message });
            return;
        }

        // --- COMMAND EXECUTION AREA ---
        if (lowerUserMessage.startsWith('.help') || lowerUserMessage.startsWith('.menu')) {
            await helpCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.ping')) {
            await pingCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.alive')) {
            await aliveCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.owner')) {
            await ownerCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.sticker')) {
            await stickerCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.play')) {
            await playCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.video')) {
            await videoCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.ai')) {
            await aiCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.tiktok')) {
            await tiktokCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.instagram') || lowerUserMessage.startsWith('.ig')) {
            await instagramCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.facebook') || lowerUserMessage.startsWith('.fb')) {
            await facebookCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.lyrics')) {
            await lyricsCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.weather')) {
            await weatherCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.tts')) {
            await ttsCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.shazam')) {
            await shazamCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.whois')) {
            await whoisCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.settings')) {
            await settingsCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.tagall')) {
            await tagAllCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.mute')) {
            await muteCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.unmute')) {
            await unmuteCommand(sock, chatId, message);
        } else if (lowerUserMessage.startsWith('.kick')) {
            await kickCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.promote')) {
            await promoteCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.demote')) {
            await demoteCommand(sock, chatId, message, userMessage);
        } else if (lowerUserMessage.startsWith('.mode')) {
            const mode = userMessage.split(' ')[1]?.toLowerCase();
            if (mode === 'public' || mode === 'private') {
                const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                data.isPublic = (mode === 'public');
                fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));
                await sock.sendMessage(chatId, { text: `Mode set to: *${mode}*` });
            } else {
                await sock.sendMessage(chatId, { text: 'Use: .mode public OR .mode private' });
            }
        }
        // ... (Unaweza kuendelea kuongeza commands nyingine hapa)

    } catch (e) {
        console.error('HandleMessages Error:', e);
    }
}

module.exports = { handleMessages };
