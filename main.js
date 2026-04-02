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

const { setPendingHalotelOrder, getPendingHalotelOrder, clearPendingHalotelOrder } = require('./lib/halotelSession');

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
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { autoBioCommand } = require('./commands/autobio');

// Utility function to format uptime
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
}

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
const halotelCommand = require('./commands/halotel');
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
const emojimixCommand = require('./commands/emojimix');
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
const { checkUpdatesCommand, downloadZipCommand } = require('./commands/checkupdates');
const { igsCommand } = require('./commands/igs');
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MICKEY";

const { safeSendMessage } = require('./lib/myfunc');

async function handleStatus(sock, chatUpdate) {
    await handleStatusUpdate(sock, chatUpdate);
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

        const chatIdEarly = message.key.remoteJid;
        const isGroupEarly = chatIdEarly && chatIdEarly.toString().endsWith('@g.us');

        handleAutoread(sock, message).catch(() => {});
        if (message.message) storeMessage(sock, message).catch(() => {});

        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        let userMessage = '';

        const extractOrderRefFromQuoted = (msg) => {
            const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quoteText = (quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || quoted?.videoMessage?.caption || '').toString();
            const orderMatch = quoteText.match(/#([A-Z0-9\-]+)/i) || quoteText.match(/ref[:=]?\s*#?([A-Z0-9\-]+)/i);
            return orderMatch ? orderMatch[1] : null;
        };

        const mapPaymentFromTitle = (title, msg) => {
            if (!title) return null;
            const directId = msg.message?.interactiveMessage?.listReply?.id || msg.message?.interactive?.listReply?.id || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || msg.message?.interactiveMessage?.buttonReply?.id || msg.message?.interactive?.buttonReply?.id;
            if (directId && /^pay_(halo|voda|tigo)_.+$/i.test(directId)) return directId.toString().trim().toLowerCase();
            const normalizedTitle = title.toString().trim().toLowerCase();
            const paymentNetwork = normalizedTitle.includes('halo') ? 'halo' : normalizedTitle.includes('m-pesa') || normalizedTitle.includes('mpesa') || normalizedTitle.includes('vodacom') ? 'voda' : normalizedTitle.includes('tigo') ? 'tigo' : null;
            if (!paymentNetwork) return null;
            const orderRef = extractOrderRefFromQuoted(msg) || getPendingHalotelOrder(chatId) || 'UNKNOWN';
            return `pay_${paymentNetwork}_${orderRef}`;
        };

        // --- BUTTON FIX START ---
        const getButtonPayload = (msg) => {
            const m = msg?.message || {};
            const candidates = [
                m.buttonsResponseMessage?.selectedButtonId,
                m.listResponseMessage?.singleSelectReply?.selectedRowId,
                m.templateButtonReplyMessage?.selectedId,
                m.interactiveMessage?.buttonReply?.id,
                m.interactiveMessage?.listReply?.id,
                m.interactive?.buttonReply?.id,
                m.interactive?.listReply?.id,
                m.native_flow_response?.body
            ];

            for (const c of candidates) {
                if (c && typeof c === 'string' && c.trim()) return c.trim();
            }

            if (m.interactiveMessage?.nativeFlowMessage || m.interactive?.nativeFlowMessage) {
                try {
                    const params = JSON.parse(m.native_flow_response?.paramsJson || '{}');
                    if (params.id) return params.id.toString();
                } catch (e) {}
            }
            return null;
        };

        const clickedPayload = getButtonPayload(message);
        if (clickedPayload) {
            let normalizedId = clickedPayload.toString().trim();
            let resolvedPaymentId = mapPaymentFromTitle(normalizedId, message);
            if (resolvedPaymentId) normalizedId = resolvedPaymentId;

            const lowered = normalizedId.toLowerCase();

            // Handle Predefined Buttons
            const buttonHandlers = {
                'channel': async () => await sock.sendMessage(chatId, { text: '📢 *Join Channel:* https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A' }, { quoted: message }),
                'owner': async () => await ownerCommand(sock, chatId, message),
                'support': async () => await sock.sendMessage(chatId, { text: '🔗 *Support:* https://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7' }, { quoted: message })
            };

            if (buttonHandlers[lowered]) {
                await buttonHandlers[lowered]();
                return;
            }

            if (/^pay_(halo|voda|tigo)_.+$/i.test(lowered)) {
                await halotelCommand(sock, chatId, message, lowered);
                return;
            }

            // Auto-resolve any other button as a command
            userMessage = normalizedId.startsWith('.') ? lowered : '.' + lowered;
            console.log(chalk.green(`🔄 Button used: ${userMessage}`));
        }
        // --- BUTTON FIX END ---

        if (!userMessage) {
            userMessage = (
                message.message?.conversation?.trim() ||
                message.message?.extendedTextMessage?.text?.trim() ||
                message.message?.imageMessage?.caption?.trim() ||
                message.message?.videoMessage?.caption?.trim() ||
                ''
            ).toLowerCase().replace(/\.\s+/g, '.').trim();
        }

        const rawText = message.message?.conversation?.trim() || message.message?.extendedTextMessage?.text?.trim() || message.message?.imageMessage?.caption?.trim() || message.message?.videoMessage?.caption?.trim() || '';

        if (userMessage.startsWith('.')) {
            const logColor = isGroup ? chalk.cyan : chalk.magenta;
            console.log(logColor(`📝 Command: ${userMessage}`));
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
            if (userMessage) await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await Antilink(message, sock);
        }

        if (!isGroup && !message.key.fromMe && !senderIsOwnerOrSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'PM Blocked.' });
                    await new Promise(r => setTimeout(r, 1500));
                    await sock.updateBlockStatus(chatId, 'block').catch(() => {});
                    return;
                }
            } catch (e) {}
        }

        if (!userMessage.startsWith('.')) {
            const replyQuoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = (replyQuoted?.conversation || replyQuoted?.extendedTextMessage?.text || '').toString().toLowerCase();
            const isMenuReply = quotedText && (quotedText.includes('command categories') || quotedText.includes('reply with number'));

            if (isMenuReply) {
                const reply = userMessage.trim();
                if (/^\d+$/.test(reply)) {
                    await helpCommand(sock, chatId, message, `.help ${reply}`);
                    return;
                }
            }

            try {
                const firstToken = (userMessage.split(' ')[0] || '').replace(/[^a-z0-9\-_]/gi, '').toLowerCase();
                const knownCommands = helpCommand.getAllCommands ? helpCommand.getAllCommands() : [];
                if (firstToken && knownCommands.includes(firstToken)) userMessage = '.' + userMessage;
            } catch (e) {}

            if (!userMessage.startsWith('.')) {
                await handleAutotypingForMessage(sock, chatId, userMessage);
                if (isGroup) {
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                    if (typeof handleAntiStatusMention === 'function') await handleAntiStatusMention(sock, chatId, message);
                }
                try { if (typeof handleChatbotMessage === 'function') await handleChatbotMessage(sock, chatId, message, userMessage); } catch (e) {}
                return;
            }
        }

        if (!isPublic && !isOwnerOrSudoCheck) return;

        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const ownerCommands = ['.mode', '.autostatus', '.statusforward', '.antidelete', '.cleartmp', '.setpp', '.pp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autoread', '.pmblocker'];
        
        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (isGroup && adminCommands.some(cmd => userMessage.startsWith(cmd))) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;
            if (!isBotAdmin) return await sock.sendMessage(chatId, { text: 'Bot must be admin!' });
            if (!isSenderAdmin && !message.key.fromMe) return await sock.sendMessage(chatId, { text: 'Admin only command.' });
        }

        if (ownerCommands.some(cmd => userMessage.startsWith(cmd)) && !isOwnerOrSudoCheck) {
            return await sock.sendMessage(chatId, { text: 'Owner only command!' });
        }

        let commandExecuted = false;
        if (!userMessage.startsWith('.pin')) {
            try {
                const pinVerified = await checkPinVerification(senderId);
                if (!pinVerified) return await sock.sendMessage(chatId, { text: '🔐 *PIN REQUIRED* (.pin <pincode>)' });
            } catch (e) {}
        }

        // --- SWITCH CASE COMMANDS ---
        switch (true) {
            case userMessage.startsWith('.add'):
                await addCommand(sock, chatId, senderId, userMessage.split(' ').slice(1).join(' '), message);
                break;
            case userMessage.startsWith('.kick'):
                await kickCommand(sock, chatId, senderId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message);
                break;
            case userMessage.startsWith('.mute'):
                const muteDur = parseInt(userMessage.split(' ')[1], 10);
                await muteCommand(sock, chatId, senderId, message, isNaN(muteDur) ? undefined : muteDur);
                break;
            case userMessage === '.unmute':
                await unmuteCommand(sock, chatId, senderId);
                break;
            case userMessage.startsWith('.ban'):
                await banCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.unban'):
                await unbanCommand(sock, chatId, message);
                break;
            case userMessage === '.ping':
                await pingCommand(sock, chatId, message);
                break;
            case userMessage === '.status':
                const statusMsg = `Uptime: ${formatTime(process.uptime())}\nRAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB`;
                await sock.sendMessage(chatId, { text: statusMsg });
                break;
            case userMessage === '.help' || userMessage === '.menu':
                await helpCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.pin'):
                const pinArgs = userMessage.split(' ').slice(1);
                if (pinArgs[0] && /^\d+$/.test(pinArgs[0])) await verifyPinCommand(sock, chatId, message, pinArgs[0]);
                else await pinCommand(sock, chatId, message, pinArgs);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.tagall'):
                await tagAllCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.alive'):
                await aliveCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.gpt') || userMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.play'):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.video'):
                await videoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mode'):
                if (!isOwnerOrSudoCheck) break;
                const modeAct = userMessage.split(' ')[1];
                if (modeAct === 'public' || modeAct === 'private') {
                    const mData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                    mData.isPublic = modeAct === 'public';
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(mData, null, 2));
                    await sock.sendMessage(chatId, { text: `Bot mode: ${modeAct}` });
                }
                break;
            case userMessage.startsWith('.autotyping'):
                await autotypingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autoread'):
                await autoreadCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.owner'):
                await ownerCommand(sock, chatId);
                break;
            case userMessage.startsWith('.tiktok'):
                await tiktokCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.insta'):
                await instagramCommand(sock, chatId, message);
                break;
            default:
                commandExecuted = false;
                break;
        }

        if (commandExecuted) await showTypingAfterCommand(sock, chatId);
        if (userMessage.startsWith('.')) await addCommandReaction(sock, message, commandExecuted !== false);

    } catch (error) {
        console.error('⚠️ Global Error:', error.message);
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, action, participants, author } = update;
        if (!id.endsWith('@g.us')) return;
        let isPublic = true;
        try { const m = JSON.parse(fs.readFileSync('./data/messageCount.json')); isPublic = m.isPublic; } catch (e) {}
        if (!isPublic) return;

        if (action === 'promote') await handlePromotionEvent(sock, id, participants, author);
        if (action === 'demote') await handleDemotionEvent(sock, id, participants, author);
    } catch (e) { console.error(e); }
}

module.exports = { handleMessages, handleStatus, handleGroupParticipantUpdate };
