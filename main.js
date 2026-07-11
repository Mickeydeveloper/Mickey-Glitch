/**
 * 🤖 MICKEY GLITCH - MAIN HANDLER WITH MANUAL IMPORTS ONLY
 * Clean & Optimized Version - No Auto-Loading
 * Fixed: Command double-trigger bug resolved
 */

// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  try {
    return originalLoad.apply(this, arguments);
  } catch (error) {
    const isLocalBotModule = typeof request === 'string' && (
      request.startsWith('./commands/') ||
      request.startsWith('./lib/') ||
      request.startsWith('./commands') ||
      request.startsWith('./lib')
    );

    if (error?.code === 'MODULE_NOT_FOUND' && isLocalBotModule) {
      return function noopModule() {
        return false;
      };
    }

    throw error;
  }
};

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');

// Create folders if they don't exist
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
if (!fs.existsSync(customTmp)) fs.mkdirSync(customTmp, { recursive: true });

process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// 🧹 AGGRESSIVE temp cleanup - Every 2 minutes - DELETE ALL FILES
setInterval(() => {
  const foldersToClean = [customTemp, customTmp];

  foldersToClean.forEach(folder => {
    fs.readdir(folder, (err, files) => {
      if (err) return;

      files.forEach(file => {
        const filePath = path.join(folder, file);
        try {
          fs.rmSync(filePath, { recursive: true, force: true });
        } catch (e) {
          // Silent fail
        }
      });
    });
  });
}, 2 * 60 * 1000); // 2 minutes

const settings = require('./settings');
require('./config.js');

// MANUAL IMPORTS ONLY - No auto-loading
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autorecordingCommand, isAutorecordingEnabled, handleAutorecordingForMessage, handleAutorecordingForCommand, showRecordingAfterCommand } = require('./commands/autorecording');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { autoBioCommand } = require('./commands/autobio');

// Command imports
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/menu');
const getppCommand = require('./commands/getpp-direct'); 
const banCommand = require('./commands/ban');
const addCommand = require('./commands/add');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const gpstatusCommand = require('./commands/gpstatus');
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
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const weatherCommand = require('./commands/weather');
const reportCommand = require('./commands/report');
const { halotelCommand, getPendingRequest } = require('./commands/halotel');
const serverCommand = require('./commands/server');
const { getButtonId, autoDetectButtonCommand } = require('./lib/buttonLoader');
const coins = require('./lib/coins');
const kickCommand = require('./commands/kick');
const { complimentCommand } = require('./commands/compliment');
const { lyricsCommand } = require('./commands/lyrics');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const fromaiCommand = require('./commands/fromai');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
const coinCommand = require('./commands/coin');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');

const takeCommand = require('./commands/take');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { autoStatusCommand, handleStatusUpdate } = require('./commands/autostatus');
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const clearTmpCommand = require('./commands/cleartmp');
const setProfilePicture = require('./commands/setpp');
const { setGroupDescription, setGroupName, setGroupPhoto } = require('./commands/groupmanage');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const playCommand = require('./commands/play');
const telebotCommand = require('./commands/telebot');
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
const mickeyCommand = require('./commands/Mickey');
const updateCommand = require('./commands/update');
const checkUpdatesCommand = require('./commands/checkupdates');
const { igsCommand } = require('./commands/igs');
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const newgroupCommand = require('./commands/newgroup');
const gdriveCommand = require('./commands/gdrive');
const getcodeCommand = require('./commands/getcode');
const getlinkCommand = require('./commands/getlink');
const shazamCommand = require('./commands/shazam');
const repoCommand = require('./commands/repo');
const statsCommand = require('./commands/stats');
const stickerAltCommand = require('./commands/sticker-alt');
const textCommand = require('./commands/text');
const sourceCommand = require('./commands/source');
const profileCardModule = require('./commands/profilecard');
const { cmdaddCommand, runCommand } = require('./commands/addcmd');
const { getCustomCommandHandler, loadCustomCommands, getCustomCommandNames } = require('./lib/customCommands');

function loadAutoRegisteredCommands() {
    const commandMap = new Map();
    const commandsDir = path.join(__dirname, 'commands');

    if (!fs.existsSync(commandsDir)) return commandMap;

    const files = fs.readdirSync(commandsDir)
        .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
        .sort();

    for (const file of files) {
        const fullPath = path.join(commandsDir, file);
        try {
            if (!fs.statSync(fullPath).isFile()) continue;

            const mod = require(fullPath);
            if (!mod) continue;

            const names = [];
            const fallbackName = path.basename(file, '.js').toLowerCase();

            if (typeof mod === 'function') {
                const fnName = (mod.name || '').trim().toLowerCase();
                if (fnName && !['command', 'handler', 'module'].includes(fnName)) {
                    names.push(fnName);
                }
            } else if (mod && typeof mod === 'object') {
                if (typeof mod.name === 'string' && mod.name.trim()) {
                    names.push(mod.name.trim().toLowerCase());
                }
                if (Array.isArray(mod.aliases)) {
                    mod.aliases.filter(Boolean).forEach((alias) => {
                        const normalized = String(alias).trim().toLowerCase();
                        if (normalized) names.push(normalized);
                    });
                }
            }

            if (fallbackName && !names.includes(fallbackName)) {
                names.push(fallbackName);
            }

            if (!names.length) continue;

            const handler = normalizeBotCommand(mod);
            names.filter((name, index) => names.indexOf(name) === index).forEach((name) => {
                if (!commandMap.has(name)) {
                    commandMap.set(name, handler);
                }
            });
        } catch (error) {
            console.error(`Auto-register failed for ${file}:`, error?.message || error);
        }
    }

    return commandMap;
}

const autoRegisteredCommands = loadAutoRegisteredCommands();

function normalizeBotCommand(commandModule) {
    if (typeof commandModule === 'function') {
        return async (sock, chatId, msg, args = [], options = {}) => commandModule(sock, chatId, msg, args, options);
    }

    if (commandModule && typeof commandModule === 'object' && typeof commandModule.code === 'function') {
        return async (sock, chatId, msg, args = [], options = {}) => {
            const resolvedArgs = Array.isArray(args) ? args : String(args || '').split(/\s+/).filter(Boolean);
            const resolvedChatId = chatId || msg?.key?.remoteJid || options.chatId;
            const resolvedSenderId = options.senderId || msg?.key?.participant || msg?.key?.remoteJid;

            const ctx = {
                sock,
                chatId: resolvedChatId,
                senderId: resolvedSenderId,
                msg,
                _msg: msg,
                args: resolvedArgs,
                core: sock,
                config: options.config || settings,
                tools: options.tools || {
                    cmd: {
                        handleError: async (_ctx, error) => {
                            console.error('Command error:', error);
                            await sock?.sendMessage?.(resolvedChatId, { text: `❌ ${error?.message || error}` }, { quoted: msg });
                        },
                    },
                },
                sendMessage: async (targetChatId = resolvedChatId, content, extra = {}) => {
                    try {
                        const resolvedTarget = targetChatId || resolvedChatId;
                        if (typeof content === 'string') {
                            return await sock?.sendMessage?.(resolvedTarget, { text: content }, extra);
                        }
                        return await sock?.sendMessage?.(resolvedTarget, content, extra);
                    } catch (error) {
                        console.error('ctx.sendMessage failed:', error);
                        return null;
                    }
                },
                reply: async (content, extra = {}) => {
                    try {
                        const replyOptions = { quoted: msg, ...(extra || {}) };
                        if (typeof content === 'string') {
                            return await sock?.sendMessage?.(resolvedChatId, { text: content }, replyOptions);
                        }
                        return await sock?.sendMessage?.(resolvedChatId, content, replyOptions);
                    } catch (error) {
                        console.error('ctx.reply failed:', error);
                        return null;
                    }
                },
                send: async (content, extra = {}) => ctx.reply(content, extra),
            };

            return commandModule.code(ctx);
        };
    }

    return async () => false;
}

const profileCardCommand = normalizeBotCommand(profileCardModule);

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MICKEY";

// Load special handlers for background processing
global.autostatusHandler = require(path.join(process.cwd(), 'commands', 'autostatus.js'));

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Handle autoread functionality
        await handleAutoread(sock, message);

        // Determine chat context early
        const chatIdEarly = message.key.remoteJid;
        const isGroupEarly = chatIdEarly && chatIdEarly.toString().endsWith('@g.us');

        // Store message for antidelete feature
        if (message.message) {
            storeMessage(sock, message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // Handle interactive responses (buttons, lists, native flows)
        let userMessage = '';
        const detectedId = getButtonId(message);
        if (detectedId || message.message?.buttonsResponseMessage || message.message?.listResponseMessage || message.message?.singleSelectReply) {
            const selectedId = message.message?.buttonsResponseMessage?.selectedButtonId || detectedId || 
                              message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                              message.message?.singleSelectReply?.selectedRowId || null;

            if (selectedId) {
                console.log(`🔘 Interactive pressed: ${selectedId}`);

                // Predefined static handlers
                const staticHandlers = {
                    'channel': async () => {
                        await sock.sendMessage(chatId, { text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A' }, { quoted: message });
                    },
                    'owner': async () => {
                        const ownerCommand = require('./commands/owner');
                        await ownerCommand(sock, chatId, message);
                    },
                    'support': async () => {
                        await sock.sendMessage(chatId, { text: '🔗 *Support Group*\n\nJoin our support community:\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7?mode=wwt' }, { quoted: message });
                    }
                };

                if (staticHandlers[selectedId]) {
                    try {
                        await staticHandlers[selectedId]();
                        return;
                    } catch (e) {
                        console.error(`Error handling static ${selectedId}:`, e);
                    }
                }

                // Handle .msgowner special case
                if (selectedId === '.msgowner' || selectedId === 'msgowner') {
                    const settings = require('./settings');
                    const ownerNumber = settings.ownerNumber || '';
                    if (ownerNumber) {
                        await sock.sendMessage(chatId, { text: `💬 You can message the owner here:\nhttps://wa.me/${ownerNumber}` }, { quoted: message });
                    } else {
                        await sock.sendMessage(chatId, { text: '💬 Owner number is not configured.' }, { quoted: message });
                    }
                    return;
                }

                // Handle panel selections (h_panel_*)
                if (selectedId && selectedId.toString().startsWith('h_panel_')) {
                    try {
                        await serverCommand(sock, chatId, message, selectedId);
                    } catch (e) {
                        console.error(`Error handling panel selection ${selectedId}:`, e);
                    }
                    return;
                }

                // Handle halotel interactive IDs that are not raw command strings
                if (selectedId === 'show_data_menu' || selectedId.toString().startsWith('server_') || selectedId.toString().startsWith('data_')) {
                    console.log(`🔄 Routed interactive ID directly to halotel: ${selectedId}`);
                    await halotelCommand(sock, chatId, message, selectedId.toString().toLowerCase());
                    return;
                } else if (selectedId && selectedId.toString().startsWith('txtstyle_')) {
                    console.log(`🔄 Routed interactive ID to text styler: ${selectedId}`);
                    await textCommand(sock, chatId, message, selectedId.toString());
                    return;
                } else if (selectedId && selectedId.startsWith('.')) {
                    console.log(`🔄 Button command intercepted: ${selectedId}`);
                    userMessage = selectedId;
                } else {
                    // Try auto-detection of command IDs from other formats
                    const autoCmd = autoDetectButtonCommand(message);
                    if (autoCmd) {
                        console.log(`🔍 Auto-detected command from interactive payload: ${autoCmd}`);
                        userMessage = autoCmd;
                    } else {
                        console.log(`⚠️ Unhandled interactive ID: ${selectedId}`);
                        return;
                    }
                }
            }
        }

        // If userMessage is empty, extract from regular message
        if (!userMessage) {
            userMessage = (
                message.message?.conversation?.trim() ||
                message.message?.extendedTextMessage?.text?.trim() ||
                message.message?.imageMessage?.caption?.trim() ||
                message.message?.videoMessage?.caption?.trim() ||
                ''
            ).toLowerCase().replace(/\.\s+/g, '.').trim();
        }

        // Preserve raw message for commands like .tag that need original casing
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // Safely extract quoted/replied-to message text (avoid undefined errors)
        const replyQuoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            message.message?.contextInfo?.quotedMessage || null;
        const quotedText = (
            replyQuoted?.conversation?.trim() ||
            replyQuoted?.extendedTextMessage?.text?.trim() ||
            replyQuoted?.imageMessage?.caption?.trim() ||
            replyQuoted?.videoMessage?.caption?.trim() ||
            ''
        ).toString();

        // Only log command usage
        if (userMessage.startsWith('.')) {
            console.log(`📝 Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
        }

        // Read bot mode once; don't early-return so moderation can still run in private mode
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Error checking access mode:', error);
        }

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // Check if user is banned
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, { text: '❌ You are banned from using the bot. Contact an admin to get unbanned.' });
            }
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Check for bad words and antilink FIRST, before ANY other processing
        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }

            // More relaxed detection: check if it looks like the menu
            const isMenuReply = quotedText && (
                quotedText.includes('command categories') ||
                quotedText.includes('reply with number') ||
                quotedText.includes('available commands') ||
                quotedText.includes('command') ||
                /\d+.*command|category/.test(quotedText)
            );

            if (isMenuReply) {
                const reply = userMessage.trim().toLowerCase();
                const metaMatch = (quotedText.match(/\[help_meta:([^\]]+)\]/) || [])[1];
                const meta = {};
                if (metaMatch) {
                    metaMatch.split(';').forEach(kv => {
                        const [k, v] = kv.split('= ');
                        if (k && v) meta[k.trim()] = v.trim();
                    });
                }

                // Numeric reply
                if (/^\d+$/.test(reply)) {
                    const n = parseInt(reply, 10);
                    if (meta.type === 'cat') {
                        try {
                            const categories = helpCommand.getCategories ? helpCommand.getCategories() : [];
                            const catIndex = parseInt(meta.cat || '0', 10) - 1;
                            const per = parseInt(meta.per || String(8), 10);
                            const page = parseInt(meta.page || '1', 10);
                            if (catIndex >= 0 && catIndex < categories.length) {
                                const commands = categories[catIndex].commands;
                                const globalIndex = (page - 1) * per + (n - 1);
                                if (globalIndex >= 0 && globalIndex < commands.length) {
                                    const cmdName = commands[globalIndex];
                                    await helpCommand(sock, chatId, message, `.help ${cmdName}`);
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error('Error resolving category command reply:', e);
                        }
                    }

                    const per = parseInt(meta.per || String(6), 10);
                    const page = parseInt(meta.page || '1', 10);
                    const absIndex = (page - 1) * per + n; 
                    await helpCommand(sock, chatId, message, `.help ${absIndex}`);
                    return;
                }

                // Navigation replies
                if (/^(next|more|prev|back|previous)$/i.test(reply)) {
                    const cmd = reply;
                    const type = meta.type || 'index';
                    const page = parseInt(meta.page || '1', 10);
                    const pages = parseInt(meta.pages || '1', 10);
                    if (cmd === 'back') {
                        await helpCommand(sock, chatId, message, `.help`);
                        return;
                    }
                    if (cmd === 'next' || cmd === 'more') {
                        const newPage = Math.min(page + 1, pages);
                        if (type === 'index') await helpCommand(sock, chatId, message, `.help ${newPage}`);
                        else await helpCommand(sock, chatId, message, `.help ${meta.cat} ${newPage}`);
                        return;
                    }
                    if (cmd === 'prev' || cmd === 'previous') {
                        const newPage = Math.max(page - 1, 1);
                        if (type === 'index') await helpCommand(sock, chatId, message, `.help ${newPage}`);
                        else await helpCommand(sock, chatId, message, `.help ${meta.cat} ${newPage}`);
                        return;
                    }
                }
            }

            try {
                const firstToken = (userMessage.split(' ')[0] || '').replace(/[^a-z0-9\-_]/gi, '').toLowerCase();
                const knownCommands = helpCommand.getAllCommands ? helpCommand.getAllCommands() : [];
                if (firstToken && knownCommands.includes(firstToken)) {
                    userMessage = '.' + userMessage; 
                }
            } catch (e) {
                // ignore
            }
        }

        // If userMessage is still not a command, check for active halotel pending state first
        if (!userMessage.startsWith('.')) {
            try {
                if (getPendingRequest && typeof getPendingRequest === 'function') {
                    const pendingReq = getPendingRequest(chatId);
                    if (pendingReq) {
                        await halotelCommand(sock, chatId, message, userMessage);
                        return;
                    }
                }
            } catch (e) {
                console.error('Error checking pending request:', e.message);
            }

            // Show typing/recording indicators if enabled
            await handleAutotypingForMessage(sock, chatId, userMessage);
            await handleAutorecordingForMessage(sock, chatId, userMessage);

            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            }

            try {
                if (typeof handleChatbotMessage === 'function') {
                    await handleChatbotMessage(sock, chatId, message);
                }
            } catch (e) {
                console.error('handleChatbotMessage error:', e?.message || e);
            }
            return;
        }

        // In private mode, only owner/sudo can run commands
        if (!isPublic && !isOwnerOrSudoCheck) {
            return;
        }

        // List of admin commands
        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // List of owner commands
        const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp', '.pp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autorecording', '.autoread', '.pmblocker'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        // Check admin status only for admin commands in groups
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.' }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith('.mute') ||
                userMessage === '.unmute' ||
                userMessage.startsWith('.ban') ||
                userMessage.startsWith('.unban') ||
                userMessage.startsWith('.promote') ||
                userMessage.startsWith('.demote')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: 'Sorry, only group admins can use this command.'
                    }, { quoted: message });
                    return;
                }
            }
        }

        // Check owner status for owner commands
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
                return;
            }
        }

        // Global Command Execution Tracker (FIXED PLACE)
        let commandExecuted = false;

        const customCommandHandler = getCustomCommandHandler(userMessage);
        // --- Coin consumption: charge 10 coins per command for non-owner users ---
        try {
            const exemptCommands = ['.pin', '.balance', '.coin', '.setcoin', '.menu', '.help'];
            const isExempt = exemptCommands.some(cmd => userMessage.startsWith(cmd));
            if (coins.isEnabled() && userMessage.startsWith('.') && !isExempt && !message.key.fromMe && !senderIsOwnerOrSudo) {
                const ok = coins.consumeForCommand(chatId, senderId, 10);
                if (!ok) {
                    try {
                        const { ButtonV2 } = require('./lib/messageBuilder');
                        const bal = coins.getCoins(chatId, senderId) || 0;
                        const btn = new ButtonV2(sock)
                            .text(`⚠️ Hauna coins za kutosha. Kila command inachukua 10 coins.\nSaldo yako: ${bal}`)
                            .button('📩 Contact Owner', '.msgowner')
                            .button('💰 Check Balance', '.balance')
                            .setFooter('Owner anaweza kukupa coins kwa kutumia .setcoin');
                        await btn.send(chatId, { quoted: message, fallbackText: `Hauna coins. Saldo: ${bal}` });
                    } catch (e) {
                        await sock.sendMessage(chatId, { text: '⚠️ Hauna coins za kutosha. Omba owner akupe coins.' }, { quoted: message });
                    }
                    return;
                }
            }
        } catch (coinErr) {
            console.error('Coin check error:', coinErr?.message || coinErr);
        }
        if (customCommandHandler && typeof customCommandHandler === 'function') {
            try {
                const settings = require('./settings');
                const { Button } = require('./lib/messageBuilder');
                const customConfig = {
                    ...settings,
                    bot: {
                        name: settings.botName || settings.botname || settings.botOwner || 'MICKEY BOT',
                    },
                };

                const ctx = {
                    sock,
                    chatId,
                    senderId,
                    msg: message,
                    _msg: message,
                    args: userMessage.split(/\s+/).slice(1),
                    core: sock,
                    config: customConfig,
                    Button,
                    tools: {
                        cmd: {
                            handleError: async (_ctx, error) => {
                                console.error('Custom command error:', error);
                                await sock.sendMessage(chatId, { text: `❌ Custom command error: ${error?.message || error}` }, { quoted: message });
                            },
                        },
                    },
                    sendMessage: async (targetChatId = chatId, content, extra = {}) => {
                        try {
                            const resolvedTarget = targetChatId || chatId;
                            if (typeof content === 'string') {
                                return await sock.sendMessage(resolvedTarget, { text: content }, extra);
                            }
                            return await sock.sendMessage(resolvedTarget, content, extra);
                        } catch (error) {
                            console.error('ctx.sendMessage failed:', error);
                            return null;
                        }
                    },
                    reply: async (content, extra = {}) => {
                        try {
                            const options = { quoted: message, ...(extra || {}) };
                            if (typeof content === 'string') {
                                return await sock.sendMessage(chatId, { text: content }, options);
                            }
                            return await sock.sendMessage(chatId, content, options);
                        } catch (error) {
                            console.error('ctx.reply failed:', error);
                            return null;
                        }
                    },
                    send: async (content, extra = {}) => {
                        return ctx.reply(content, extra);
                    },
                };

                await customCommandHandler(ctx);
                commandExecuted = true;
                return;
            } catch (error) {
                console.error('Custom command execution failed:', error);
                await sock.sendMessage(chatId, { text: `❌ Custom command failed: ${error?.message || error}` }, { quoted: message });
                return;
            }
        }

        // PIN Security Check
        const allowWithoutPin = userMessage.startsWith('.pin');
        if (!allowWithoutPin) {
            try {
                const pinVerified = await checkPinVerification(senderId);
                if (!pinVerified) {
                    await sock.sendMessage(chatId, {
                        text: `🔐 *PIN REQUIRED*\n\nThis bot requires PIN authorization.\n\n📌 Command: .pin <pincode>`
                    }, { quoted: message });
                    return;
                }
            } catch (pinError) {
                console.error('PIN verification error:', pinError);
            }
        }

        switch (true) {
            case userMessage.startsWith('.add'):
                const addArgs = userMessage.trim().split(/\s+/);
                const phoneNumber = addArgs.slice(1).join(' ').trim();
                await addCommand(sock, chatId, senderId, phoneNumber, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.kick'):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedJidListKick, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.mute'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const muteArg = parts[1];
                    const muteDuration = muteArg !== undefined ? parseInt(muteArg, 10) : undefined;
                    if (muteArg !== undefined && (isNaN(muteDuration) || muteDuration <= 0)) {
                        await sock.sendMessage(chatId, { text: 'Please provide a valid number of minutes or use .mute with no number to mute immediately.' }, { quoted: message });
                    } else {
                        await muteCommand(sock, chatId, senderId, message, muteDuration);
                    }
                }
                commandExecuted = true;
                break;
            case userMessage === '.unmute':
                await unmuteCommand(sock, chatId, senderId);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.ban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .ban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await banCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.move') || userMessage.startsWith('.movegroup') || userMessage.startsWith('.inviteall'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: '⚠️ This command can only be used in a group.' }, { quoted: message });
                    break;
                }

                const adminStatusForMove = await isAdmin(sock, chatId, senderId);
                const canUseMove = message.key.fromMe || senderIsOwnerOrSudo || adminStatusForMove.isSenderAdmin;
                if (!canUseMove) {
                    await sock.sendMessage(chatId, { text: '❌ Only admins can use this!' }, { quoted: message });
                    break;
                }

                const moveInput = userMessage.replace(/^\.(move|movegroup|inviteall)\s*/i, '').trim();
                if (!moveInput) {
                    await sock.sendMessage(chatId, {
                        text: '❌ Usage:\n.move <group_link_or_id> [message]\n\nExample:\n.move https://chat.whatsapp.com/xxxxx Welcome to our new group!'
                    }, { quoted: message });
                    break;
                }

                try {
                    const moveArgs = moveInput.split(/\s+/);
                    let targetGroup = moveArgs[0];
                    const moveMessage = moveArgs.slice(1).join(' ') || '📢 Welcome to our new group!';

                    if (targetGroup.includes('chat.whatsapp.com')) {
                        const inviteCode = targetGroup.split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '');
                        targetGroup = inviteCode;
                    }

                    const currentGroupMetadata = await sock.groupMetadata(chatId);
                    const currentMembers = (currentGroupMetadata?.participants || []).map(p => p.id).filter(Boolean);
                    const botJid = sock.user?.id || '';
                    const membersToMove = currentMembers.filter(jid => jid && jid !== botJid);

                    if (!membersToMove.length) {
                        await sock.sendMessage(chatId, { text: '❌ No members to move!' }, { quoted: message });
                        break;
                    }

                    await sock.sendMessage(chatId, {
                        text: `🔄 Moving ${membersToMove.length} members to target group...\n\n⏳ Please wait...`
                    }, { quoted: message });

                    let success = 0;
                    let failed = 0;
                    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

                    let targetGroupJid = targetGroup;
                    if (/^[a-zA-Z0-9_-]+$/i.test(targetGroup) && targetGroup.length > 10 && !targetGroup.includes('@')) {
                        try {
                            targetGroupJid = await sock.groupAcceptInvite(targetGroup);
                        } catch (e) {
                            targetGroupJid = targetGroup;
                        }
                    }

                    if (targetGroupJid) {
                        await sock.sendMessage(targetGroupJid, {
                            text: `${moveMessage}\n\n👥 *Members joining from ${currentGroupMetadata?.subject || 'this group'}*\n\n${membersToMove.map(j => `@${j.split('@')[0]}`).join(' ')}\n\n_Powered by Mickey Glitch_`,
                            mentions: membersToMove,
                        });
                    }

                    for (const member of membersToMove) {
                        try {
                            await sock.groupParticipantsUpdate(targetGroupJid, [member], 'add');
                            success++;
                            await delay(1500);
                        } catch (e) {
                            failed++;
                            console.log(`❌ Failed to add ${member}: ${e?.message || e}`);
                        }
                    }

                    await sock.sendMessage(chatId, {
                        text: `✅ *Move Complete!*\n\n👥 Added: ${success} members\n❌ Failed: ${failed} members\n\n📌 Check target group for new members!`
                    }, { quoted: message });
                } catch (e) {
                    console.error('Move error:', e);
                    await sock.sendMessage(chatId, {
                        text: `❌ Error: ${e?.message || e}\n\nMake sure the bot is admin in both groups!`
                    }, { quoted: message });
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.unban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .unban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await unbanCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.ping':
                await pingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.balance' || userMessage.startsWith('.coin') || userMessage.startsWith('.setcoin') || userMessage.startsWith('.addcoin') || userMessage.startsWith('.removecoin'):
                await coinCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.profilecard' || userMessage === '.profile':
                await profileCardCommand(sock, chatId, message, userMessage.split(' ').slice(1), { senderId, config: settings });
                commandExecuted = true;
                break;
            case userMessage === '.fromai':
                {
                    const settings = require('./settings');
                    const { Button, AIRich } = require('./lib/messageBuilder');
                    const customConfig = {
                        ...settings,
                        bot: {
                            name: settings.botName || settings.botname || settings.botOwner || 'MICKEY BOT',
                        },
                    };

                    const ctx = {
                        sock,
                        chatId,
                        senderId,
                        msg: message,
                        _msg: message,
                        args: userMessage.split(/\s+/).slice(1),
                        core: sock,
                        config: customConfig,
                        Button,
                        AIRich,
                        tools: {
                            cmd: {
                                handleError: async (_ctx, error) => {
                                    console.error('fromai error:', error);
                                    await sock.sendMessage(chatId, { text: `❌ Command error: ${error?.message || error}` }, { quoted: message });
                                },
                            },
                        },
                        reply: async (content, extra = {}) => {
                            try {
                                const options = { quoted: message, ...(extra || {}) };
                                if (typeof content === 'string') {
                                    return await sock.sendMessage(chatId, { text: content }, options);
                                }
                                return await sock.sendMessage(chatId, content, options);
                            } catch (error) {
                                console.error('ctx.reply failed:', error);
                                return null;
                            }
                        },
                    };

                    await fromaiCommand(ctx);
                    commandExecuted = true;
                }
                break;
            case userMessage.startsWith('.pin'):
                {
                    const pinArgs = userMessage.split(' ').slice(1);
                    if (pinArgs[0] && /^\d+$/.test(pinArgs[0])) {
                        await verifyPinCommand(sock, chatId, message, pinArgs[0]);
                    } else {
                        await pinCommand(sock, chatId, message, pinArgs);
                    }
                }
                commandExecuted = true;
                break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list' || userMessage === '.cmd' || userMessage === '.commands':
                await helpCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.gpstatus':
                await gpstatusCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.warnings'):
                const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warningsCommand(sock, chatId, mentionedJidListWarnings);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.warn'):
                const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warnCommand(sock, chatId, senderId, mentionedJidListWarn, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.tts'):
                const text = userMessage.slice(4).trim();
                await ttsCommand(sock, chatId, text, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.delete') || userMessage.startsWith('.del'):
                await deleteCommand(sock, chatId, message, senderId);
                commandExecuted = true;
                break;
            case userMessage === '.settings':
                await settingsCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.mode'):
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: 'Only bot owner can use this command!' }, { quoted: message });
                    return;
                }
                let data;
                try {
                    data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) {
                    console.error('Error reading access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to read bot mode status' });
                    return;
                }

                const action = userMessage.split(' ')[1]?.toLowerCase();
                if (!action) {
                    const currentMode = data.isPublic ? 'public' : 'private';
                    await sock.sendMessage(chatId, {
                        text: `Current bot mode: *${currentMode}*\n\nUsage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only`
                    }, { quoted: message });
                    return;
                }

                if (action !== 'public' && action !== 'private') {
                    await sock.sendMessage(chatId, {
                        text: 'Usage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only'
                    }, { quoted: message });
                    return;
                }

                try {
                    data.isPublic = action === 'public';
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));
                    await sock.sendMessage(chatId, { text: `Bot is now in *${action}* mode` });
                } catch (error) {
                    console.error('Error updating access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to update bot access mode' });
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.anticall'):
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: 'Only owner/sudo can use anticall.' }, { quoted: message });
                    break;
                }
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await anticallCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.pmblocker'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await pmblockerCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.chatbot'):
                {
                    await groupChatbotToggleCommand(sock, chatId, message, userMessage);
                }
                commandExecuted = true;
                break;
            case userMessage === '.owner':
                await ownerCommand(sock, chatId);
                commandExecuted = true;
                break;
             case userMessage === '.tagall':
                await tagAllCommand(sock, chatId, senderId, message);
                try {
                    if (message?.key?.remoteJid && message?.key?.id) {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: message.key.id,
                                participant: senderId
                            }
                        });
                    }
                } catch (err) {}
                commandExecuted = true;
                break;
            case userMessage === '.tagnotadmin':
                await tagNotAdminCommand(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.hidetag'):
                {
                    const messageText = rawText.slice(8).trim();
                    const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                    await hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.tag'):
                {
                    const messageText = rawText.slice(4).trim();  
                    const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                    await tagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.antilink'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
                    return;
                }
                await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.antitag'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
                    return;
                }
                await handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.weather'):
                {
                    const city = userMessage.slice(9).trim();
                    if (city) {
                        await weatherCommand(sock, chatId, message, city);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Please specify a city, e.g., .weather London' }, { quoted: message });
                    }
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.report'):
                {
                    const reportArgs = userMessage.slice(7).trim();
                    await reportCommand(sock, chatId, message, reportArgs);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.halotel'):
                await halotelCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.server'):
                await serverCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage === '.booking_confirmation':
                await sock.sendMessage(chatId, {
                    text: `✅ *Booking Confirmed!*

Your booking has been received and confirmed.

We will process it and send you an update shortly.`
                }, { quoted: message });
                commandExecuted = true;
                break;
            case userMessage === '.topmembers':
                topMembers(sock, chatId, isGroup);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.compliment'):
                await complimentCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.lyrics'):
                {
                    const songTitle = userMessage.split(' ').slice(1).join(' ');
                    await lyricsCommand(sock, chatId, songTitle, message);
                }
                commandExecuted = true;
                break;
            case userMessage === '.clear':
                if (isGroup) await clearCommand(sock, chatId);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.promote'):
                const mentionedJidListPromote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await promoteCommand(sock, chatId, mentionedJidListPromote, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.demote'):
                const mentionedJidListDemote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await demoteCommand(sock, chatId, mentionedJidListDemote, message);
                commandExecuted = true;
                break;
            case userMessage === '.alive':
                await aliveCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.mention '):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    const isOwner = message.key.fromMe || senderIsSudo;
                    await mentionToggleCommand(sock, chatId, message, args, isOwner);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autobio'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await autoBioCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.gmention '):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await groupMentionToggleCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage === '.setmention':
                {
                    const isOwner = message.key.fromMe || senderIsSudo;
                    await setMentionCommand(sock, chatId, message, isOwner);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.blur'):
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                await blurCommand(sock, chatId, message, quotedMessage);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.welcome'):
                if (isGroup) {
                    if (!isSenderAdmin) {
                        const adminStatus = await isAdmin(sock, chatId, senderId);
                        isSenderAdmin = adminStatus.isSenderAdmin;
                    }
                    if (isSenderAdmin || message.key.fromMe) {
                        await sock.sendMessage(chatId, { text: '⚠️ The welcome command is currently disabled.' }, { quoted: message });
                    } else {
                        await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.' }, { quoted: message });
                    }
                } else {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.antibadword'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                    return;
                }
                {
                    const adminStatus = await isAdmin(sock, chatId, senderId);
                    isSenderAdmin = adminStatus.isSenderAdmin;
                    isBotAdmin = adminStatus.isBotAdmin;

                    if (!isBotAdmin) {
                        await sock.sendMessage(chatId, { text: '*Bot must be admin to use this feature*' }, { quoted: message });
                        return;
                    }
                    await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.take') || userMessage.startsWith('.steal'):
                {
                    const isSteal = userMessage.startsWith('.steal');
                    const sliceLen = isSteal ? 6 : 5; 
                    const takeArgs = rawText.slice(sliceLen).trim().split(' ');
                    await takeCommand(sock, chatId, message, takeArgs);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.character'):
                await characterCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.waste'):
                await wastedCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.resetlink' || userMessage === '.revoke' || userMessage === '.anularlink':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!' }, { quoted: message });
                    return;
                }
                await resetlinkCommand(sock, chatId, senderId);
                commandExecuted = true;
                break;
            case userMessage === '.staff' || userMessage === '.admins' || userMessage === '.listadmin':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!' }, { quoted: message });
                    return;
                }
                await staffCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.booking':
                await serverCommand(sock, chatId, message, '.server booking');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.tourl') || userMessage.startsWith('.url'):
                await urlCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.emojimix') || userMessage.startsWith('.emix'):
                await emojimixCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.tg') || userMessage.startsWith('.stickertelegram') || userMessage.startsWith('.tgsticker') || userMessage.startsWith('.telesticker'):
                await stickerTelegramCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.vv':
                await viewOnceCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.clearsession' || userMessage === '.clearsesi':
                await clearSessionCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autostatus'):
                const autoStatusArgs = userMessage.split(' ').slice(1);
                await autoStatusCommand(sock, chatId, message, autoStatusArgs);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.metallic'):
                await textmakerCommand(sock, chatId, message, userMessage, 'metallic');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.ice'):
                await textmakerCommand(sock, chatId, message, userMessage, 'ice');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.snow'):
                await textmakerCommand(sock, chatId, message, userMessage, 'snow');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.impressive'):
                await textmakerCommand(sock, chatId, message, userMessage, 'impressive');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.matrix'):
                await textmakerCommand(sock, chatId, message, userMessage, 'matrix');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.light'):
                await textmakerCommand(sock, chatId, message, userMessage, 'light');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.neon'):
                await textmakerCommand(sock, chatId, message, userMessage, 'neon');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.devil'):
                await textmakerCommand(sock, chatId, message, userMessage, 'devil');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.purple'):
                await textmakerCommand(sock, chatId, message, userMessage, 'purple');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.thunder'):
                await textmakerCommand(sock, chatId, message, userMessage, 'thunder');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.leaves'):
                await textmakerCommand(sock, chatId, message, userMessage, 'leaves');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.1917'):
                await textmakerCommand(sock, chatId, message, userMessage, '1917');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.arena'):
                await textmakerCommand(sock, chatId, message, userMessage, 'arena');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.hacker'):
                await textmakerCommand(sock, chatId, message, userMessage, 'hacker');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.sand'):
                await textmakerCommand(sock, chatId, message, userMessage, 'sand');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.blackpink'):
                await textmakerCommand(sock, chatId, message, userMessage, 'blackpink');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.glitch'):
                await textmakerCommand(sock, chatId, message, userMessage, 'glitch');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.fire'):
                await textmakerCommand(sock, chatId, message, userMessage, 'fire');
                commandExecuted = true;
                break;
            case userMessage.startsWith('.text'):
                await textCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.source'):
                await sourceCommand(sock, chatId, message, userMessage.replace(/^\.source\s*/i, '').split(/\s+/));
                commandExecuted = true;
                break;
            case userMessage.startsWith('.cmdadd'):
                await cmdaddCommand(sock, chatId, senderId, userMessage, message, rawText);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.run'):
                await runCommand(sock, chatId, senderId, userMessage, message, rawText);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.antidelete'):
                const antideleteMatch = userMessage.slice(11).trim();
                await handleAntideleteCommand(sock, chatId, message, antideleteMatch);
                commandExecuted = true;
                break;
            case userMessage === '.cleartmp':
                await clearTmpCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.getpp':
            case userMessage === '.ppic':
            case userMessage === '.profile':
                await getppCommand(sock, chatId, senderId, message, userMessage.split(' ').slice(1));
                commandExecuted = true;
                break;
            case userMessage === '.setpp':
            case userMessage === '.pp':
                await setProfilePicture(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.setgdesc'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupDescription(sock, chatId, senderId, text, message);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.setgname'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupName(sock, chatId, senderId, text, message);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.setgpp'):
                await setGroupPhoto(sock, chatId, senderId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.instagram') || userMessage.startsWith('.insta') || (userMessage === '.ig' || userMessage.startsWith('.ig ')):
                await instagramCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.igsc'):
                await igsCommand(sock, chatId, message, true);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.igs'):
                await igsCommand(sock, chatId, message, false);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.fb') || userMessage.startsWith('.facebook'):
                await facebookCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.music'):
            case userMessage.startsWith('.play') || userMessage.startsWith('.mp3') || userMessage.startsWith('.ytmp3') || userMessage.startsWith('.song'):
                await playCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.video') || userMessage.startsWith('.ytmp4'):
                await videoCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.tiktok_audio'):
                {
                    const rawArg = userMessage.replace(/\.tiktok_audio\s*/i, '').trim();
                    const decoded = decodeURIComponent(rawArg || '');
                    await tiktokCommand.audio(sock, chatId, message, decoded);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.tiktok') || userMessage.startsWith('.tt'):
                await tiktokCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.gpt') || userMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.aivoice') || userMessage.startsWith('.vai') || userMessage.startsWith('.voicex') || userMessage.startsWith('.voiceai'):
                {
                    const voiceText = userMessage.replace(/^\.(aivoice|vai|voicex|voiceai)\s*/i, '');
                    await aiVoiceCommand(sock, chatId, senderId, voiceText, message);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.mickey'):
                await mickeyCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.translate') || userMessage.startsWith('.trt'):
                {
                    const commandLength = userMessage.startsWith('.translate') ? 10 : 4;
                    await handleTranslateCommand(sock, chatId, message, userMessage.slice(commandLength));
                }
                commandExecuted = true;
                return;
            case userMessage.startsWith('.areact') || userMessage.startsWith('.autoreact') || userMessage.startsWith('.autoreaction'):
                await handleAreactCommand(sock, chatId, message, isOwnerOrSudoCheck);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.sudo'):
                await sudoCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.imagine') || userMessage.startsWith('.flux') || userMessage.startsWith('.dalle'): 
                await imagineCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.jid': 
                await groupJidCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autotyping'):
                await autotypingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autorecording'):
                await autorecordingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autoread'):
                await autoreadCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.crop':
                await stickercropCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.update'):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const zipArg = parts[1] && parts[1].startsWith('http') ? parts[1] : '';
                    await updateCommand(sock, chatId, message, zipArg);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.checkupdates'):
                {
                    const checkUpdatesArgs = userMessage.split(' ').slice(1);
                    await checkUpdatesCommand(sock, chatId, message, checkUpdatesArgs);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.newgroup'):
                await newgroupCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.gdrive'):
                await gdriveCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.getcode'):
                {
                    const args = userMessage.split(' ').slice(1);
                    await getcodeCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.getlink'):
                await getlinkCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.shazam'):
                await shazamCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.repo'):
                await repoCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.stats'):
                await statsCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.telebot'):
                await telebotCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.stickeralt'):
                await stickerAltCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            default:
                if (isGroup) {
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                }
                commandExecuted = false;
                break;
        }

        // AUTO REGISTERED FALLBACK EXECUTION (SAFE FROM DOUBLE TRIGGER)
        if (!commandExecuted) {
            const autoCommandName = userMessage.startsWith('.') ? userMessage.split(/\s+/)[0].slice(1).toLowerCase() : '';
            const autoHandler = autoCommandName ? autoRegisteredCommands.get(autoCommandName) : null;

            if (autoHandler) {
                try {
                    await autoHandler(sock, chatId, message, userMessage.split(/\s+/).slice(1), {
                        senderId,
                        config: settings,
                        tools: {
                            cmd: {
                                handleError: async (_ctx, error) => {
                                    console.error('Auto command error:', error);
                                    await sock.sendMessage(chatId, { text: `❌ ${error?.message || error}` }, { quoted: message });
                                },
                            },
                        },
                    });
                    commandExecuted = true;
                } catch (error) {
                    console.error('Auto command execution failed:', error);
                    await sock.sendMessage(chatId, { text: `❌ ${error?.message || error}` }, { quoted: message });
                }
            }
        }

        // Post-execution processing
        if (commandExecuted) {
            await showTypingAfterCommand(sock, chatId);
            try {
                await showRecordingAfterCommand(sock, chatId);
            } catch (e) {}
        }

        // Function to handle .groupjid command
        async function groupJidCommand(sock, chatId, message) {
            const groupJid = message.key.remoteJid;
            if (!groupJid.endsWith('@g.us')) {
                return await sock.sendMessage(chatId, { text: "❌ This command can only be used in a group." });
            }
            await sock.sendMessage(chatId, { text: `✅ Group JID: ${groupJid}` }, { quoted: message });
        }

        if (userMessage.startsWith('.')) {
            await addCommandReaction(sock, message, commandExecuted);
        }
    } catch (error) {
        console.error('❌ Error in message handler:', error.message);
        let safeChatId = null;
        try { safeChatId = messageUpdate?.messages?.[0]?.key?.remoteJid || null; } catch (e) { safeChatId = null; }
        if (safeChatId) {
            await sock.sendMessage(safeChatId, {
                text: `❌ Failed to process command: ${String(error.message).slice(0, 300)}`
            }).catch(console.error);
        }
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        if (!id.endsWith('@g.us')) return;

        let isPublic = true;
        try {
            const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof modeData.isPublic === 'boolean') isPublic = modeData.isPublic;
        } catch (e) {}

        if (action === 'promote') {
            if (!isPublic) return;
            await handlePromotionEvent(sock, id, participants, author);
            return;
        }

        if (action === 'demote') {
            if (!isPublic) return;
            await handleDemotionEvent(sock, id, participants, author);
            return;
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:', error);
    }
}

async function handleStatus(sock, messageUpdate) {
    try {
        if (!sock || !messageUpdate?.messages) return;
        for (const m of messageUpdate.messages || []) {
            if (m.key?.remoteJid !== 'status@broadcast') continue;
            if (global.autostatusHandler?.handleAutoStatus) {
                await global.autostatusHandler.handleAutoStatus(sock, { messages: [m] });
            }
        }
    } catch (e) {}
}

module.exports = {
    handleMessages,
    handleStatusUpdate,
    handleGroupParticipantUpdate,
    handleStatus
};
