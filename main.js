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
const checkUpdatesCommand = require('./commands/checkupdates');
const { igsCommand } = require('./commands/igs');

// --- ANTICALL IMPORT FIX ---
const { anticallCommand, readState: readAnticallState, handleAnticall } = require('./commands/anticall');

const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');

global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MICKEY";

const { safeSendMessage } = require('./lib/myfunc');

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
}

// Handle messages logic
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

        // --- BUTTON DETECTION LOGIC (Ili button zote zikubali ID) ---
        const mType = Object.keys(message.message)[0];
        const buttonId = (mType === 'buttonsResponseMessage') ? message.message.buttonsResponseMessage.selectedButtonId :
                         (mType === 'templateButtonReplyMessage') ? message.message.templateButtonReplyMessage.selectedId :
                         (mType === 'listResponseMessage') ? (message.message.listResponseMessage.singleSelectReply?.selectedRowId || message.message.listResponseMessage.selectedRowId) :
                         (mType === 'interactiveResponseMessage') ? (message.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson ? JSON.parse(message.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : null) : null;

        const chatIdEarly = message.key.remoteJid;
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

        // Map buttonId to userMessage to trigger commands
        var userMessage = (
            buttonId || 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        ).trim().toLowerCase();

        // Auto-fix command prefix for button IDs
        if (buttonId && !userMessage.startsWith('.')) {
            userMessage = '.' + userMessage;
        }

        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        if (userMessage.startsWith('.')) {
            const logColor = isGroup ? chalk.cyan : chalk.magenta;
            console.log(logColor(`📝 Command used: ${userMessage}`));
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
                    await sock.sendMessage(chatId, { text: pmState.message || 'PM is blocked.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) {}
                    return;
                }
            } catch (e) {}
        }

        if (!userMessage.startsWith('.')) {
            const replyQuoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = (replyQuoted?.conversation || replyQuoted?.extendedTextMessage?.text || '').toLowerCase();
            const isMenuReply = quotedText && (quotedText.includes('command categories') || quotedText.includes('reply with number'));

            if (isMenuReply && /^\d+$/.test(userMessage)) {
                await helpCommand(sock, chatId, message, `.help ${userMessage}`);
                return;
            }

            await handleAutotypingForMessage(sock, chatId, userMessage);
            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
                if (typeof handleAntiStatusMention === 'function') await handleAntiStatusMention(sock, chatId, message);
            }
            if (typeof handleChatbotMessage === 'function') await handleChatbotMessage(sock, chatId, message, userMessage);
            return;
        }

        const basicCommands = ['.help', '.ping', '.owner', '.menu', '.alive', '.status', '.connection', '.sendzip'];
        const isBasicCommand = basicCommands.some(cmd => userMessage === cmd || userMessage.startsWith(cmd));

        if (!isPublic && !isOwnerOrSudoCheck && !isBasicCommand) return;

        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        const ownerCommands = ['.mode', '.autostatus', '.statusforward', '.antidelete', '.cleartmp', '.setpp', '.pp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autoread', '.pmblocker'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

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

        let commandExecuted = false;

        const allowWithoutPin = userMessage.startsWith('.pin') || isBasicCommand;
        if (!allowWithoutPin) {
            try {
                const pinVerified = await checkPinVerification(senderId);
                if (!pinVerified) {
                    await sock.sendMessage(chatId, { text: `🔐 *PIN REQUIRED*\n.pin <pincode>` }, { quoted: message });
                    return;
                }
            } catch (e) {}
        }

        switch (true) {
            case userMessage.startsWith('.add'):
                const addArgs = userMessage.trim().split(/\s+/);
                await addCommand(sock, chatId, senderId, addArgs.slice(1).join(' '), message);
                break;
            case userMessage.startsWith('.kick'):
                const mentionedKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedKick, message);
                break;
            case userMessage.startsWith('.mute'):
                const muteTime = parseInt(userMessage.split(' ')[1], 10);
                await muteCommand(sock, chatId, senderId, message, isNaN(muteTime) ? undefined : muteTime);
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
                commandExecuted = true;
                break;
            case userMessage === '.status' || userMessage === '.connection':
                const statusMsg = `╭─❖ 「 *𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐈𝐎𝐍 𝐒𝐓𝐀𝐓𝐔𝐒* 」❖\n│ ⏳ *Uptime:* ${formatTime(process.uptime())}\n│ 🧠 *RAM:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB\n╰─❖ 「 *𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇* 」❖`;
                await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });
                break;
            case userMessage.startsWith('.pin'):
                const pArgs = userMessage.split(' ').slice(1);
                if (pArgs[0] && /^\d+$/.test(pArgs[0])) await verifyPinCommand(sock, chatId, message, pArgs[0]);
                else await pinCommand(sock, chatId, message, pArgs);
                commandExecuted = true;
                break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.list':
                await helpCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.warn'):
                const mWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (userMessage.startsWith('.warnings')) await warningsCommand(sock, chatId, mWarn);
                else await warnCommand(sock, chatId, senderId, mWarn, message);
                break;
            case userMessage.startsWith('.tts'):
                await ttsCommand(sock, chatId, userMessage.slice(4).trim(), message);
                break;
            case userMessage.startsWith('.delete') || userMessage.startsWith('.del'):
                await deleteCommand(sock, chatId, message, senderId);
                break;
            case userMessage === '.settings':
                await settingsCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mode'):
                if (!isOwnerOrSudoCheck) break;
                const mMode = userMessage.split(' ')[1]?.toLowerCase();
                if (mMode === 'public' || mMode === 'private') {
                    const mData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                    mData.isPublic = mMode === 'public';
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(mData, null, 2));
                    await sock.sendMessage(chatId, { text: `Bot is now *${mMode}*` });
                }
                break;
            case userMessage.startsWith('.anticall'):
                const acArgs = userMessage.split(' ').slice(1).join(' ');
                await anticallCommand(sock, chatId, message, acArgs);
                break;
            case userMessage.startsWith('.pmblocker'):
                await pmblockerCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                commandExecuted = true;
                break;
            case userMessage.startsWith('.chatbot'):
                await groupChatbotToggleCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                break;
            case userMessage === '.owner':
                await ownerCommand(sock, chatId);
                commandExecuted = true;
                break;
             case userMessage === '.tagall':
                await tagAllCommand(sock, chatId, senderId, message);
                break;
            case userMessage === '.tagnotadmin':
                await tagNotAdminCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.hidetag'):
                await hideTagCommand(sock, chatId, senderId, rawText.slice(8).trim(), message.message?.extendedTextMessage?.contextInfo?.quotedMessage, message);
                break;
            case userMessage.startsWith('.tag'):
                await tagCommand(sock, chatId, senderId, rawText.slice(4).trim(), message.message?.extendedTextMessage?.contextInfo?.quotedMessage, message);
                break;
            case userMessage.startsWith('.antilink'):
                await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage.startsWith('.antitag'):
                await handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage.startsWith('.weather'):
                await weatherCommand(sock, chatId, message, userMessage.slice(9).trim());
                break;
            case userMessage.startsWith('.report'):
                await reportCommand(sock, chatId, message, userMessage.slice(7).trim());
                break;
            case userMessage.startsWith('.halotel'):
                await halotelCommand(sock, chatId, message, userMessage);
                break;
            case userMessage === '.topmembers':
                topMembers(sock, chatId, isGroup);
                break;
            case userMessage === '.ghost':
                await ghostCommand(sock, chatId, isGroup);
                break;
            case userMessage.startsWith('.lyrics'):
                await lyricsCommand(sock, chatId, userMessage.split(' ').slice(1).join(' '), message);
                break;
            case userMessage === '.clear':
                if (isGroup) await clearCommand(sock, chatId);
                break;
            case userMessage.startsWith('.promote'):
                await promoteCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message);
                break;
            case userMessage.startsWith('.demote'):
                await demoteCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message);
                break;
            case userMessage === '.alive':
                await aliveCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mention'):
                await mentionToggleCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '), isOwnerOrSudoCheck);
                break;
            case userMessage.startsWith('.autobio'):
                await autoBioCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                break;
            case userMessage.startsWith('.antibadword'):
                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
            case userMessage.startsWith('.take') || userMessage.startsWith('.steal'):
                await takeCommand(sock, chatId, message, rawText.slice(userMessage.startsWith('.steal') ? 6 : 5).trim().split(' '));
                break;
            case userMessage === '.resetlink':
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case userMessage === '.staff':
                await staffCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.url'):
                await urlCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.vv'):
                await viewOnceCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.autostatus'):
                await autoStatusCommand(sock, chatId, message, userMessage.split(' ').slice(1));
                break;
            case userMessage.startsWith('.antidelete'):
                await handleAntideleteCommand(sock, chatId, message, userMessage.slice(11).trim());
                break;
            case userMessage === '.cleartmp':
                await clearTmpCommand(sock, chatId, message);
                break;
            case userMessage === '.setpp' || userMessage === '.pp':
                await setProfilePicture(sock, chatId, message);
                break;
            case userMessage.startsWith('.instagram') || userMessage.startsWith('.ig'):
                await instagramCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.fb') || userMessage.startsWith('.facebook'):
                await facebookCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.play') || userMessage.startsWith('.song'):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.video'):
                await videoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tiktok') || userMessage.startsWith('.tt'):
                await tiktokCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.gpt') || userMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.imagine'):
                await imagineCommand(sock, chatId, message);
                break;
            case userMessage === '.jid':
                await groupJidCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.autotyping'):
                await autotypingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autoread'):
                await autoreadCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.update'):
                await updateCommand(sock, chatId, message, rawText.trim().split(/\s+/)[1] || '');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.checkupdates'):
                await checkUpdatesCommand(sock, chatId, message, userMessage.split(' ').slice(1));
                commandExecuted = true;
                break;
            case userMessage === '.sendzip':
                const { downloadZipCommand } = require('./commands/checkupdates');
                await downloadZipCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            default:
                commandExecuted = false;
                break;
        }

        if (commandExecuted) await showTypingAfterCommand(sock, chatId);
        if (userMessage.startsWith('.')) await addCommandReaction(sock, message, commandExecuted !== false);

    } catch (error) {
        if (!/closed|disconnect|timeout/i.test(error.message)) {
            console.error('⚠️ Command error:', error.message);
            const sId = messageUpdate?.messages?.[0]?.key?.remoteJid;
            if (sId) await sock.sendMessage(sId, { text: `⚠️ Command failed, try again.` }).catch(() => {});
        }
    }
}

// Function to handle Group JID
async function groupJidCommand(sock, chatId, message) {
    if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: "❌ Groups only." });
    await sock.sendMessage(chatId, { text: `✅ Group JID: ${chatId}` }, { quoted: message });
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        if (!id.endsWith('@g.us')) return;
        let isPublic = true;
        try {
            const mData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            isPublic = !!mData.isPublic;
        } catch (e) {}

        if (action === 'promote' && isPublic) await handlePromotionEvent(sock, id, participants, author);
        if (action === 'demote' && isPublic) await handleDemotionEvent(sock, id, participants, author);
    } catch (error) { console.error('GroupUpdate error:', error); }
}

// --- HANDLE STATUS & CALLS ---
async function handleStatus(sock, chatUpdate) {
    // 1. Handle status updates (Auto-view n.k)
    await handleStatusUpdate(sock, chatUpdate);

    // 2. Handle Anticall (Incoming calls)
    if (chatUpdate.call || chatUpdate[0]?.tag === 'call') {
        await handleAnticall(sock, chatUpdate);
    }
}

module.exports = {
    handleMessages,
    handleStatus,
    handleGroupParticipantUpdate
};
