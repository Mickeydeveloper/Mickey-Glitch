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
  performanceCache.lastCleanup = Date.now(); // 🛠️ FIXED: Koma imeondolewa hapa
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


// --- ANTICALL IMPORT FIX ---
const { anticallCommand, readState: readAnticallState, handleAnticall } = require('./commands/anticall');

const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const whoisCommand = require('./commands/whois');

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

        // --- DECODE ENCODED BUTTON IDs ---
        let decodedButtonId = buttonId;
        if (buttonId && buttonId.startsWith('play_')) {
            if (buttonId.startsWith('play_video_')) {
                // Decode video play button: play_video_Song -> .play Song
                const title = decodeURIComponent(buttonId.replace('play_video_', ''));
                decodedButtonId = `.play ${title}`;
            } else {
                // Decode shazam play button: play_Artist_Song -> .play Artist Song
                const parts = buttonId.split('_');
                if (parts.length >= 3) {
                    const artist = decodeURIComponent(parts[1]);
                    const title = decodeURIComponent(parts.slice(2).join('_'));
                    decodedButtonId = `.play ${artist} ${title}`;
                }
            }
        } else if (buttonId && buttonId.startsWith('ytvideo_')) {
            // Decode ytvideo button: ytvideo_Title -> .ytvideo Title
            const title = decodeURIComponent(buttonId.replace('ytvideo_', ''));
            decodedButtonId = `.ytvideo ${title}`;
        } else if (buttonId && buttonId.startsWith('run_cmd_')) {
            decodedButtonId = buttonId.replace('run_cmd_', '');
        } else if (buttonId === 'repo_download_zip') {
            // Handle repo download zip button
            const { downloadZipCommand } = require('./commands/checkupdates');
            await downloadZipCommand(sock, chatId, message);
            return;
        } else if (buttonId === 'repo_copy_link') {
            // Handle repo copy link button
            const { copyLinkCommand } = require('./commands/checkupdates');
            await copyLinkCommand(sock, chatId, message);
            return;
        }

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
        let userMessage = (
            decodedButtonId || 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        ).trim(); // Tumeondoa .toLowerCase() hapa ili prefix isivurugike

        // --- FIXED: AUTO-FIX SPACE AFTER DOT (e.g. ". Menu" -> ".Menu") ---
        // Hii itarekebisha ". Menu" iwe ".Menu" ili bot iielewe
        userMessage = userMessage.replace(/^\.\s+/, ".");
        
        // Sasa tunatengeneza version ya herufi ndogo kwa ajili ya check
        const lowerUserMessage = userMessage.toLowerCase();

        // Auto-fix command prefix for button IDs
        if (decodedButtonId && !lowerUserMessage.startsWith('.')) {
            userMessage = '.' + userMessage;
        }

        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        if (lowerUserMessage.startsWith('.')) {
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
        const isBasicCommand = basicCommands.some(cmd => lowerUserMessage === cmd || lowerUserMessage.startsWith(cmd));

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

        let commandExecuted = false;

        // --- HANDLE BUTTON RESPONSES ---
        if (buttonId && buttonId.startsWith('ping_')) {
            if (buttonId === 'ping_refresh') {
                await pingCommand(sock, chatId, message);
                commandExecuted = true;
            } else if (buttonId === 'ping_detailed') {
                const detailedInfo = `
📊 *DETAILED SYSTEM INFO*
━━━━━━━━━━━━━━━━━━━━━━
🖥️ *OS:* ${os.platform()} ${os.release()}
🏗️ *Architecture:* ${os.arch()}
💾 *Total RAM:* ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB
🆓 *Free RAM:* ${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)}GB
💽 *Disk:* ${os.hostname()}
⏰ *Timezone:* ${Intl.DateTimeFormat().resolvedOptions().timeZone}
━━━━━━━━━━━━━━━━━━━━━━`;
                await sock.sendMessage(chatId, { text: detailedInfo }, { quoted: message });
                commandExecuted = true;
            } else if (buttonId === 'ping_help') {
                await sock.sendMessage(chatId, {
                    text: '❓ *PING HELP*\n\n• Speed test shows latency\n• Uptime shows online duration\n• RAM shows memory usage\n• Refresh updates the stats'
                }, { quoted: message });
                commandExecuted = true;
            }
        } else if (buttonId && buttonId.startsWith('owner_')) {
            if (buttonId === 'owner_channel') {
                await sock.sendMessage(chatId, {
                    text: '📺 *JOIN OUR OFFICIAL CHANNEL*\n\nhttps://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610'
                }, { quoted: message });
                commandExecuted = true;
            }
        } else if (buttonId && buttonId.startsWith('settings_')) {
            if (buttonId === 'settings_refresh') {
                await settingsCommand(sock, chatId, message);
                commandExecuted = true;
            } else if (buttonId === 'settings_global') {
                await sock.sendMessage(chatId, {
                    text: '🌐 *GLOBAL SETTINGS*\n\nUse these commands:\n• .mode public/private\n• .autostatus on/off\n• .autoread on/off\n• .autotyping on/off\n• .pmblocker on/off\n• .anticall on/off'
                }, { quoted: message });
                commandExecuted = true;
            } else if (buttonId === 'settings_group') {
                await sock.sendMessage(chatId, {
                    text: '👥 *GROUP SETTINGS*\n\nUse these commands:\n• .antilink on/off\n• .antibadword on/off\n• .welcome on/off\n• .goodbye on/off\n• .chatbot on/off\n• .antitag on/off'
                }, { quoted: message });
                commandExecuted = true;
            } else if (buttonId === 'settings_status') {
                await sock.sendMessage(chatId, {
                    text: '📊 *STATUS SETTINGS*\n\nUse these commands:\n• .autostatus view on/off\n• .autostatus like on/off\n• .statusforward on/off'
                }, { quoted: message });
                commandExecuted = true;
            }
        } else if (buttonId && (buttonId.startsWith('cmd_') || buttonId.startsWith('.'))) {
            // Handle interactive message button responses from help.js
            try {
                await helpCommand.handleButtonResponse(sock, message, buttonId, chatId);
            } catch (e) {
                console.error('Error handling button:', e);
            }
            commandExecuted = true;
        } else if (buttonId && buttonId.startsWith('help_cat_')) {
            // Pass button ID directly without re-encoding
            console.log(`[MAIN] Help category button clicked: ${buttonId}`);
            await helpCommand(sock, chatId, message, buttonId);
            commandExecuted = true;
        } else if (buttonId === '.help') {
            console.log(`[MAIN] Help back button clicked`);
            await helpCommand(sock, chatId, message, '.help');
            commandExecuted = true;
        } else if (buttonId && buttonId.startsWith('help_')) {
            // Other help button types (older format)
            if (buttonId.startsWith('help_category_')) {
                const category = decodeURIComponent(buttonId.replace('help_category_', ''));
                await helpCommand(sock, chatId, message, `.help ${category}`);
                commandExecuted = true;
            } else if (buttonId === 'help_more') {
                await helpCommand(sock, chatId, message, '.help');
                commandExecuted = true;
            }
        } else if (buttonId && buttonId.startsWith('halotel_')) {
            await halotelCommand(sock, chatId, message, buttonId);
            commandExecuted = true;
        } else if (buttonId && buttonId.startsWith('play_')) {
            if (buttonId.startsWith('play_audio_')) {
                const title = decodeURIComponent(buttonId.replace('play_audio_', ''));
                await handlePlayDownload(sock, chatId, message, title, 'audio');
                commandExecuted = true;
            } else if (buttonId.startsWith('play_video_')) {
                const title = decodeURIComponent(buttonId.replace('play_video_', ''));
                await handlePlayDownload(sock, chatId, message, title, 'video');
                commandExecuted = true;
            } else if (buttonId.startsWith('play_search_')) {
                const query = decodeURIComponent(buttonId.replace('play_search_', ''));
                await handlePlaySearch(sock, chatId, message, query);
                commandExecuted = true;
            }
        }

        if (commandExecuted) return;

        const allowWithoutPin = lowerUserMessage.startsWith('.pin') || isBasicCommand;
        if (!allowWithoutPin) {
            try {
                const pinVerified = await checkPinVerification(senderId);
                if (!pinVerified) {
                    await sock.sendMessage(chatId, { text: `🔐 *PIN REQUIRED*\n.pin <pincode>` }, { quoted: message });
                    return;
                }
            } catch (e) {}
        }

        // TAFSRI YA COMMANDS (CASE-INSENSITIVE)
        switch (true) {
            case lowerUserMessage.startsWith('.add'):
                const addArgs = lowerUserMessage.trim().split(/\s+/);
                await addCommand(sock, chatId, senderId, addArgs.slice(1).join(' '), message);
                break;
            case lowerUserMessage.startsWith('.kick'):
                const mentionedKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedKick, message);
                break;
            case lowerUserMessage.startsWith('.mute'):
                const muteTime = parseInt(lowerUserMessage.split(' ')[1], 10);
                await muteCommand(sock, chatId, senderId, message, isNaN(muteTime) ? undefined : muteTime);
                break;
            case lowerUserMessage === '.unmute':
                await unmuteCommand(sock, chatId, senderId);
                break;
            case lowerUserMessage.startsWith('.ban'):
                await banCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.unban'):
                await unbanCommand(sock, chatId, message);
                break;
            case lowerUserMessage === '.ping':
                await pingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case lowerUserMessage === '.status' || lowerUserMessage === '.connection':
                const statusMsg = `╭─❖ 「 *𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐈𝐎𝐍 𝐒𝐓𝐀𝐓𝐔𝐒* 」❖\n│ ⏳ *Uptime:* ${formatTime(process.uptime())}\n│ 🧠 *RAM:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB\n╰─❖ 「 *𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇* 」❖`;
                await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });
                break;
            case lowerUserMessage.startsWith('.pin'):
                const pArgs = lowerUserMessage.split(' ').slice(1);
                if (pArgs[0] && /^\d+$/.test(pArgs[0])) await verifyPinCommand(sock, chatId, message, pArgs[0]);
                else await pinCommand(sock, chatId, message, pArgs);
                commandExecuted = true;
                break;
            case lowerUserMessage === '.downloadmenu':
                await helpCommand(sock, chatId, message, `help_cat_${encodeURIComponent('📥 DOWNLOADS')}`);
                commandExecuted = true;
                break;
            case lowerUserMessage === '.help' || lowerUserMessage === '.menu' || lowerUserMessage === '.list':
                await helpCommand(sock, chatId, message, lowerUserMessage);
                commandExecuted = true;
                break;
            case lowerUserMessage === '.sticker' || lowerUserMessage === '.s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case lowerUserMessage.startsWith('.warn'):
                const mWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (lowerUserMessage.startsWith('.warnings')) await warningsCommand(sock, chatId, mWarn);
                else await warnCommand(sock, chatId, senderId, mWarn, message);
                break;
            case lowerUserMessage.startsWith('.tts'):
                await ttsCommand(sock, chatId, lowerUserMessage.slice(4).trim(), message);
                break;
            case lowerUserMessage.startsWith('.delete') || lowerUserMessage.startsWith('.del'):
                await deleteCommand(sock, chatId, message, senderId);
                break;
            case lowerUserMessage === '.settings':
                await settingsCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.mode'):
                if (!isOwnerOrSudoCheck) break;
                const mMode = lowerUserMessage.split(' ')[1]?.toLowerCase();
                if (mMode === 'public' || mMode === 'private') {
                    const mData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                    mData.isPublic = mMode === 'public';
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(mData, null, 2));
                    await sock.sendMessage(chatId, { text: `Bot is now *${mMode}*` });
                }
                break;
            case lowerUserMessage.startsWith('.anticall'):
                const acArgs = lowerUserMessage.split(' ').slice(1).join(' ');
                await anticallCommand(sock, chatId, message, acArgs);
                break;
            case lowerUserMessage.startsWith('.pmblocker'):
                await pmblockerCommand(sock, chatId, message, lowerUserMessage.split(' ').slice(1).join(' '));
                commandExecuted = true;
                break;
            case lowerUserMessage.startsWith('.chatbot'):
                await groupChatbotToggleCommand(sock, chatId, message, lowerUserMessage.split(' ').slice(1).join(' '));
                break;
            case lowerUserMessage === '.owner':
                await ownerCommand(sock, chatId);
                commandExecuted = true;
                break;
             case lowerUserMessage === '.tagall':
                await tagAllCommand(sock, chatId, senderId, message);
                break;
            case lowerUserMessage === '.tagnotadmin':
                await tagNotAdminCommand(sock, chatId, senderId, message);
                break;
            case lowerUserMessage.startsWith('.hidetag'):
                await hideTagCommand(sock, chatId, senderId, rawText.slice(8).trim(), message.message?.extendedTextMessage?.contextInfo?.quotedMessage, message);
                break;
            case lowerUserMessage.startsWith('.tag'):
                await tagCommand(sock, chatId, senderId, rawText.slice(4).trim(), message.message?.extendedTextMessage?.contextInfo?.quotedMessage, message);
                break;
            case lowerUserMessage.startsWith('.antilink'):
                await handleAntilinkCommand(sock, chatId, lowerUserMessage, senderId, isSenderAdmin, message);
                break;
            case lowerUserMessage.startsWith('.antitag'):
                await handleAntitagCommand(sock, chatId, lowerUserMessage, senderId, isSenderAdmin, message);
                break;
            case lowerUserMessage.startsWith('.weather'):
                await weatherCommand(sock, chatId, message, lowerUserMessage.slice(9).trim());
                break;
            case lowerUserMessage.startsWith('.report'):
                await reportCommand(sock, chatId, message, lowerUserMessage.slice(7).trim());
                break;
            case lowerUserMessage.startsWith('.halotel'):
                await halotelCommand(sock, chatId, message, lowerUserMessage);
                break;
            case lowerUserMessage === '.topmembers':
                topMembers(sock, chatId, isGroup);
                break;
            case lowerUserMessage === '.ghost':
                await ghostCommand(sock, chatId, isGroup);
                break;
            case lowerUserMessage.startsWith('.lyrics'):
                await lyricsCommand(sock, chatId, lowerUserMessage.split(' ').slice(1).join(' '), message);
                break;
            case lowerUserMessage === '.clear':
                if (isGroup) await clearCommand(sock, chatId);
                break;
            case lowerUserMessage.startsWith('.promote'):
                await promoteCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message);
                break;
            case lowerUserMessage.startsWith('.demote'):
                await demoteCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message);
                break;
            case lowerUserMessage === '.alive':
                await aliveCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.mention'):
                await mentionToggleCommand(sock, chatId, message, lowerUserMessage.split(' ').slice(1).join(' '), isOwnerOrSudoCheck);
                break;
            case lowerUserMessage.startsWith('.autobio'):
                await autoBioCommand(sock, chatId, message, lowerUserMessage.split(' ').slice(1).join(' '));
                break;
            case lowerUserMessage.startsWith('.antibadword'):
                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
            case lowerUserMessage.startsWith('.take') || lowerUserMessage.startsWith('.steal'):
                await takeCommand(sock, chatId, message, rawText.slice(lowerUserMessage.startsWith('.steal') ? 6 : 5).trim().split(' '));
                break;
            case lowerUserMessage === '.resetlink':
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case lowerUserMessage === '.staff':
                await staffCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.url'):
                await urlCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.vv'):
                await viewOnceCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.autostatus'):
                await autoStatusCommand(sock, chatId, message, lowerUserMessage.split(' ').slice(1));
                break;
            case lowerUserMessage.startsWith('.antidelete'):
                await handleAntideleteCommand(sock, chatId, message, lowerUserMessage.slice(11).trim());
                break;
            case lowerUserMessage === '.cleartmp':
                await clearTmpCommand(sock, chatId, message);
                break;
            case lowerUserMessage === '.setpp' || lowerUserMessage === '.pp':
                await setProfilePicture(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.instagram') || lowerUserMessage.startsWith('.ig'):
                await instagramCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.fb') || lowerUserMessage.startsWith('.facebook'):
                await facebookCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.play') || lowerUserMessage.startsWith('.song'):
                await playCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.video'):
                const videoArgs = lowerUserMessage.split(' ').slice(1);
                await videoCommand(sock, chatId, message, videoArgs);
                break;
            case lowerUserMessage.startsWith('.shazam'):
                await shazamCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.whois'):
                const whoisArgs = lowerUserMessage.split(' ').slice(1);
                await whoisCommand(sock, chatId, message, whoisArgs);
                break;
            case lowerUserMessage.startsWith('.tiktok') || lowerUserMessage.startsWith('.tt'):
                await tiktokCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.gpt') || lowerUserMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.imagine'):
                await imagineCommand(sock, chatId, message);
                break;
            case lowerUserMessage === '.jid':
                await groupJidCommand(sock, chatId, message);
                break;
            case lowerUserMessage.startsWith('.autotyping'):
                await autotypingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case lowerUserMessage.startsWith('.autoread'):
                await autoreadCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case lowerUserMessage.startsWith('.update'):
                await updateCommand(sock, chatId, message, rawText.trim().split(/\s+/)[1] || '');
                commandExecuted = true;
                break;
            case lowerUserMessage.startsWith('.repo'):
                await repoCommand(sock, chatId, message, lowerUserMessage.split(' ').slice(1));
                commandExecuted = true;
                break;
            case lowerUserMessage === '.sendzip':
                const { downloadZipCommand } = require('./commands/checkupdates');
                await downloadZipCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            // --- LISTENER YA CLONE (Inakubali .clone na .clone ) ---
            case lowerUserMessage.startsWith('.clone'):
                await cloneCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            default:
                commandExecuted = false;
                break;
        }

        if (commandExecuted) await showTypingAfterCommand(sock, chatId);
        if (lowerUserMessage.startsWith('.')) await addCommandReaction(sock, message, commandExecuted !== false);

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

async function handlePlayDownload(sock, chatId, message, title, type) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        const { videos } = await yts(title);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Song not found!*' });

        const vid = videos[0];
        const api = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(vid.url)}`;

        const res = await axios.get(api);
        const dlUrl = res.data?.data?.[type];
        if (!dlUrl) return sock.sendMessage(chatId, { text: '❌ *Download failed!*' });

        const mimeType = type === 'audio' ? 'audio/mp4' : 'video/mp4';
        const fileName = `${vid.title}.${type === 'audio' ? 'mp3' : 'mp4'}`;

        await sock.sendMessage(chatId, {
            [type]: { url: dlUrl },
            mimetype: mimeType,
            fileName: fileName,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: vid.title,
                    body: `Mickey Glitch Tech | ${vid.timestamp}`,
                    thumbnailUrl: vid.thumbnail,
                    sourceUrl: vid.url,
                    mediaType: type === 'audio' ? 1 : 2,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

    } catch (err) {
        console.error("PLAY DOWNLOAD ERROR:", err);
        await sock.sendMessage(chatId, { text: '❌ *Download failed!*' }, { quoted: message });
    }
}

async function handlePlaySearch(sock, chatId, message, query) {
    try {
        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *No results found!*' });

        let searchText = `🔍 *SEARCH RESULTS FOR: ${query}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        const buttons = [];

        videos.slice(0, 5).forEach((vid, index) => {
            searchText += `${index + 1}. *${vid.title}*\n👤 ${vid.author.name} • ${vid.timestamp} • ${vid.views} views\n\n`;
            buttons.push(
                { id: `play_audio_${encodeURIComponent(vid.title)}`, text: `🎵 ${index + 1}. AUDIO` },
                { id: `play_video_${encodeURIComponent(vid.title)}`, text: `🎥 ${index + 1}. VIDEO` }
            );
        });

        searchText += '━━━━━━━━━━━━━━━━━━━━━━\n*Choose a song to download:*';

        await sendButtons(sock, chatId, {
            title: '🎧 MUSIC SEARCH',
            text: searchText,
            footer: 'Mickey Glitch Tech',
            buttons: buttons
        }, { quoted: message });

    } catch (err) {
        console.error("PLAY SEARCH ERROR:", err);
        await sock.sendMessage(chatId, { text: '❌ *Search failed!*' }, { quoted: message });
    }
}

module.exports = {
    handleMessages,
    handleStatus,
    handleGroupParticipantUpdate
};
