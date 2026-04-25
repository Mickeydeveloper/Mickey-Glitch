// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Auto-cleaner every 3 hours
setInterval(() => {
  fs.readdir(customTemp, (err, files) => {
    if (err) return;
    for (const file of files) {
      const filePath = path.join(customTemp, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
          fs.unlink(filePath, () => {});
        }
      });
    }
  });
  console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
const isBanned = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { loadButtonHandlers, executeButtonHandler } = require('./lib/buttonLoader');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { autoBioCommand } = require('./commands/autobio');

// Command imports
const tagAllCommand = require('./commands/tagall');
const banCommand = require('./commands/ban');
const addCommand = require('./commands/add');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
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
const halotelCommand = require('./commands/halotel');
const kickCommand = require('./commands/kick');
const { complimentCommand } = require('./commands/compliment');
const { lyricsCommand } = require('./commands/lyrics');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');
const takeCommand = require('./commands/take');
const characterCommand = require('./commands/character');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
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
const { setGroupDescription, setGroupName, setGroupPhoto } = require('./commands/groupmanage');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const playCommand = require('./commands/play');
const tiktokCommand = require('./commands/tiktok');
const aiCommand = require('./commands/ai');
const aiVoiceCommand = require('./commands/ai');
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
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const getLinkCommand = require('./commands/getlink');
const getPpCommand = require('./commands/getpp');
const { logGhostActivity, ghostCommand } = require('./commands/ghost');
const menuCommand = require('./commands/menu');
const repoCommand = require('./commands/repo');
const reportCommand = require('./commands/report');
const shazamCommand = require('./commands/shazam');
const stickerAltCommand = require('./commands/sticker-alt');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MICKEY";

// ────────────────────────────────────────────────
// Initialize Button Handlers
let buttonHandlersMap = {};
async function initializeButtonHandlers() {
    buttonHandlersMap = await loadButtonHandlers();
    console.log(`\n✅ Button handlers initialized successfully\n`);
}
initializeButtonHandlers().catch(err => console.error('Error initializing button handlers:', err));

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        // ✅ FIX: AUTO STATUS HANDLER (Views and Likes Statuses)
        if (chatId === 'status@broadcast') {
            await handleStatusUpdate(sock, message);
            // Pia endesha Status Forward kama imewashwa
            await handleStatusForward(sock, message);
            return; 
        }

        // Handle autoread functionality
        await handleAutoread(sock, message);

        // Store message for antidelete feature
        if (message.message) {
            storeMessage(sock, message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // ────────────────────────────────────────────────
        // ✅ IMPROVED UNIVERSAL BUTTON & LIST HANDLER
        // ────────────────────────────────────────────────
        const buttonId = message.message?.buttonsResponseMessage?.selectedButtonId || 
                         message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                         message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson && 
                         JSON.parse(message.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id;

        if (buttonId) {
            console.log(`🔘 Button/List pressed: ${buttonId}`);

            // 1. Static handlers
            const staticHandlers = {
                'channel': async () => {
                    await sock.sendMessage(chatId, { text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A' }, { quoted: message });
                },
                'owner': async () => { await ownerCommand(sock, chatId, message); },
                'support': async () => {
                    await sock.sendMessage(chatId, { text: `🔗 *Support Group*\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7` }, { quoted: message });
                }
            };

            if (staticHandlers[buttonId]) {
                await staticHandlers[buttonId]();
                return;
            }

            // 2. Dynamic handlers from commands folder
            const handled = await executeButtonHandler(buttonId, sock, chatId, message, buttonHandlersMap);
            if (handled) return;

            // 3. Command Redirect (If ID starts with . or is special)
            if (buttonId.startsWith('.') || buttonId === 'msgowner') {
                if (buttonId === 'msgowner' || buttonId === '.msgowner') {
                    const ownerNumber = settings.ownerNumber || '';
                    await sock.sendMessage(chatId, { text: `💬 Contact: https://wa.me/${ownerNumber}` }, { quoted: message });
                    return;
                }
                // Hii itaruhusu button iji-inject kwenye userMessage hapo chini
                var forcedCommand = buttonId.toLowerCase();
            }
        }

        // Extracting text from any message type
        let userMessage = forcedCommand || (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        if (userMessage.startsWith('.')) {
            console.log(`📝 Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
        }

        // Banned check
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Group moderation
        if (isGroup) {
            if (userMessage) await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await Antilink(message, sock);
        }

        // PM Blocker logic
        if (!isGroup && !message.key.fromMe && !senderIsOwnerOrSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked.' });
                    await new Promise(r => setTimeout(r, 1000));
                    await sock.updateBlockStatus(chatId, 'block');
                    return;
                }
            } catch (e) {}
        }

        // Logic ya commands inaendelea hapa chini...
        // [NIMEBAKIZA SEHEMU HII KWA AJILI YAKO KUENDELEA NA LOGIC YA COMMANDS]

    } catch (e) {
        console.error("Critical Error in Main Handler:", e);
    }
}

module.exports = { handleMessages };
