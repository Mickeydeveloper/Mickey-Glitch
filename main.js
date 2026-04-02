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

// 🧹 OPTIMIZED temp cleanup - Every 30 minutes (reduced I/O stress)
setInterval(() => {
  const foldersToClean = [customTemp, customTmp];

  foldersToClean.forEach(folder => {
    try {
      if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);
        // Only clean if folder has >200 files
        if (files.length > 200) {
          files.forEach(file => {
            try {
              fs.rmSync(path.join(folder, file), { recursive: true, force: true });
            } catch (e) {
              // Silent fail
            }
          });
        }
      }
    } catch (e) {
      // Silent fail
    }
  });

  performanceCache.lastCleanup = Date.now();
}, 30 * 60 * 1000); // 30 minutes (optimized from 5 min)

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
const pingCommand = require('./commands/ping'); // ensure pingCommand is imported
const aliveCommand = require('./commands/alive'); // added missing import
const unbanCommand = require('./commands/unban'); // added missing import
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
// tictactoe command removed
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const { logGhostActivity, ghostCommand } = require('./commands/ghost');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');

// (removed antileft feature) in-memory set no longer used
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
// quote command removed
const { complimentCommand } = require('./commands/compliment');
// insult command removed
const { lyricsCommand } = require('./commands/lyrics');
// truth command removed
const { clearCommand } = require('./commands/clear');
const blurCommand = require('./commands/img-blur');
// Welcome command removed. Previously: ./commands/welcome
// github command removed
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');

// antileft command removed

const takeCommand = require('./commands/take');
// flirt command removed
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
// simp command removed
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
// pies command removed
const stickercropCommand = require('./commands/stickercrop');
// misc and anime commands removed (show "not available" messages)
const updateCommand = require('./commands/update');
const { checkUpdatesCommand, downloadZipCommand } = require('./commands/checkupdates');
const { igsCommand } = require('./commands/igs');
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
// sora command removed

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MICKEY";

const { safeSendMessage } = require('./lib/myfunc');

// Utility functions
// formatTime already defined above

// Handle status updates
async function handleStatus(sock, chatUpdate) {
    await handleStatusUpdate(sock, chatUpdate);
}

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        // Guard: Check if socket is connected before processing
        if (!sock || !sock.user || typeof sock.sendMessage !== 'function') {
            return;
        }

        // Only wrap sendMessage once per socket instance.
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

        // Fast path: Determine chat context early
        const chatIdEarly = message.key.remoteJid;
        const isGroupEarly = chatIdEarly && chatIdEarly.toString().endsWith('@g.us');

        // Handle autoread functionality (non-blocking)
        handleAutoread(sock, message).catch(() => {});

        // Store message for antidelete feature (non-blocking)
        if (message.message) {
            storeMessage(sock, message).catch(() => {});
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

        let userMessage = '';

        const extractOrderRefFromQuoted = (msg) => {
            const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quoteText = (
                quoted?.conversation ||
                quoted?.extendedTextMessage?.text ||
                quoted?.imageMessage?.caption ||
                quoted?.videoMessage?.caption ||
                ''
            ).toString();

            const orderMatch = quoteText.match(/#([A-Z0-9\-]+)/i) || quoteText.match(/ref[:=]?\s*#?([A-Z0-9\-]+)/i);
            return orderMatch ? orderMatch[1] : null;
        };

        const mapPaymentFromTitle = (title, msg) => {
            if (!title) return null;

            // Prioritize a possible rowId payload if present
            const directId =
                msg.message?.interactiveMessage?.listReply?.id ||
                msg.message?.interactive?.listReply?.id ||
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.interactiveMessage?.buttonReply?.id ||
                msg.message?.interactive?.buttonReply?.id;

            if (directId && /^pay_(halo|voda|tigo)_.+$/i.test(directId)) {
                return directId.toString().trim().toLowerCase();
            }

            const normalizedTitle = title.toString().trim().toLowerCase();
            const paymentNetwork = normalizedTitle.includes('halo') ? 'halo' :
                normalizedTitle.includes('m-pesa') || normalizedTitle.includes('mpesa') || normalizedTitle.includes('vodacom') ? 'voda' :
                normalizedTitle.includes('tigo') ? 'tigo' : null;

            if (!paymentNetwork) return null;

            const orderRef = extractOrderRefFromQuoted(msg) || getPendingHalotelOrder(chatId) || 'UNKNOWN';
            return `pay_${paymentNetwork}_${orderRef}`;
        };

        // 🔘 FIX: RE-ENGINEERED BUTTON HANDLER
        const getButtonPayload = (msg) => {
            const m = msg?.message || {};
            const candidates = [
                m.buttonsResponseMessage?.selectedButtonId,
                m.listResponseMessage?.singleSelectReply?.selectedRowId,
                m.singleSelectReply?.selectedRowId,
                m.templateButtonReplyMessage?.selectedId,
                m.interactiveMessage?.buttonReply?.id,
                m.interactiveMessage?.listReply?.id,
                m.interactiveMessage?.listReply?.title,
                m.interactive?.buttonReply?.id,
                m.interactive?.listReply?.id,
                m.interactive?.listReply?.title,
                m.native_flow_response?.body // Native flow integration
            ];

            for (const c of candidates) {
                if (c && typeof c === 'string' && c.trim()) {
                    return c.trim();
                }
            }

            // Fallback for native_flow event
            if (m.native_flow_response?.paramsJson) {
                try {
                    const params = JSON.parse(m.native_flow_response.paramsJson);
                    if (params.id) return params.id.toString();
                } catch (e) {}
            }

            return null;
        };

        // Handle all button/list responses
        const clickedPayload = getButtonPayload(message);
        if (clickedPayload) {
            let normalizedId = clickedPayload.toString().trim();
            let resolvedPaymentId = null;

            if (!/^pay_(halo|voda|tigo)_.+$/i.test(normalizedId)) {
                resolvedPaymentId = mapPaymentFromTitle(normalizedId, message);
            }

            if (resolvedPaymentId) {
                normalizedId = resolvedPaymentId;
            }

            const lowered = normalizedId.toLowerCase();

            // Handle payments
            if (/^pay_(halo|voda|tigo)_.+$/i.test(lowered)) {
                const parts = lowered.split('_');
                const network = parts[1] || 'halo';
                let orderRef = parts.slice(2).join('_') || '';
                if (!orderRef || orderRef.toLowerCase() === 'unknown') {
                    orderRef = getPendingHalotelOrder(chatId) || 'UNKNOWN';
                }
                const normalizedPay = `pay_${network}_${orderRef}`.toLowerCase();
                await halotelCommand(sock, chatId, message, normalizedPay);
                return;
            }

            // Predefined button handlers
            const buttonHandlers = {
                'channel': async () => {
                    await sock.sendMessage(chatId, {
                        text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A'
                    }, { quoted: message });
                },
                'owner': async () => {
                    const ownerCommand = require('./commands/owner');
                    await ownerCommand(sock, chatId, message);
                },
                'support': async () => {
                    await sock.sendMessage(chatId, {
                        text: '🔗 *Support Group*\n\nJoin our support community:\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7?mode=wwt'
                    }, { quoted: message });
                }
            };

            if (buttonHandlers[lowered] || buttonHandlers[normalizedId]) {
                try {
                    await (buttonHandlers[lowered] || buttonHandlers[normalizedId])();
                    return;
                } catch (e) {
                    console.error(`Error handling button/list ${clickedPayload}:`, e);
                }
            }

            // Universal Auto-Command Resolver: Treat any button ID as a command
            userMessage = normalizedId.startsWith('.') ? lowered : '.' + lowered;
            console.log(chalk.green(`🔄 Button auto-resolved as: ${userMessage}`));
        }

        // Normal text message fallback if button/list not already set
        if (!userMessage) {
            userMessage = (
                message.message?.conversation?.trim() ||
                message.message?.extendedTextMessage?.text?.trim() ||
                message.message?.imageMessage?.caption?.trim() ||
                message.message?.videoMessage?.caption?.trim() ||
                message.message?.buttonsResponseMessage?.selectedButtonId?.trim() ||
                message.message?.listResponseMessage?.singleSelectReply?.selectedRowId?.trim() ||
                message.message?.singleSelectReply?.selectedRowId?.trim() ||
                ''
            ).toLowerCase().replace(/\.\s+/g, '.').trim();
        }

        // Preserve raw message for commands like .tag that need original casing
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // Only log command usage
        if (userMessage.startsWith('.')) {
            const logColor = isGroup ? chalk.cyan : chalk.magenta;
            console.log(logColor(`📝 Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`));
        }
        
        // Read bot mode
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Error checking access mode:', error);
        }
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        if (!message.key.fromMe) {
            incrementMessageCount(chatId, senderId);
            logGhostActivity(chatId, message);
        }

        // Moderation
        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }
            await Antilink(message, sock);
        }

        // PM blocker
        if (!isGroup && !message.key.fromMe && !senderIsOwnerOrSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }

        // Command Prefix Check
        if (!userMessage.startsWith('.')) {
            const replyQuoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = (
                replyQuoted?.conversation ||
                replyQuoted?.extendedTextMessage?.text ||
                replyQuoted?.imageMessage?.caption ||
                replyQuoted?.videoMessage?.caption ||
                ''
            ).toString().toLowerCase();

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
                        const [k, v] = kv.split('=');
                        if (k && v) meta[k.trim()] = v.trim();
                    });
                }

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
                        } catch (e) {}
                    }
                    const per = parseInt(meta.per || String(6), 10);
                    const page = parseInt(meta.page || '1', 10);
                    const absIndex = (page - 1) * per + n;
                    await helpCommand(sock, chatId, message, `.help ${absIndex}`);
                    return;
                }

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
            } catch (e) {}

            if (!userMessage.startsWith('.')) {
                await handleAutotypingForMessage(sock, chatId, userMessage);
                if (isGroup) {
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                    if (typeof handleAntiStatusMention === 'function') await handleAntiStatusMention(sock, chatId, message);
                }
                try {
                    if (typeof handleChatbotMessage === 'function') {
                        await handleChatbotMessage(sock, chatId, message, userMessage);
                    }
                } catch (e) {}
                return;
            }
        }

        if (!isPublic && !isOwnerOrSudoCheck) {
            return;
        }

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

        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
                return;
            }
        }

        let commandExecuted = false;

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
            } catch (pinError) {}
        }

        switch (true) {
            case userMessage.startsWith('.add'):
                const addArgs = userMessage.trim().split(/\s+/);
                const phoneNumber = addArgs.slice(1).join(' ').trim();
                await addCommand(sock, chatId, senderId, phoneNumber, message);
                break;
            case userMessage.startsWith('.kick'):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedJidListKick, message);
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
            case userMessage === '.status' || userMessage === '.connection':
                {
                    const uptime = formatTime(process.uptime());
                    const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
                    const statusMsg = `╭─❖ 「 *𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐈𝐎𝐍 𝐒𝐓𝐀𝐓𝐔𝐒* 」❖\n│ ◇ ⏳ *Uptime:* \`${uptime}\`\n│ ◇ 🧠 *RAM:* \`${ram}MB\`\n╰─❖ 「 *𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇* 」❖`;
                    await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });
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
            case userMessage.startsWith('.warnings'):
                await warningsCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || []);
                break;
            case userMessage.startsWith('.warn'):
                await warnCommand(sock, chatId, senderId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message);
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
                if (!isOwnerOrSudoCheck) return;
                let data;
                try {
                    data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) { break; }
                const action = userMessage.split(' ')[1]?.toLowerCase();
                if (!action) {
                    await sock.sendMessage(chatId, { text: `Mode: *${data.isPublic ? 'public' : 'private'}*` }, { quoted: message });
                } else if (action === 'public' || action === 'private') {
                    data.isPublic = action === 'public';
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));
                    await sock.sendMessage(chatId, { text: `Bot is now *${action}*` });
                }
                break;
            case userMessage.startsWith('.anticall'):
                await anticallCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                break;
            case userMessage.startsWith('.pmblocker'):
                await pmblockerCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                commandExecuted = true;
                break;
            case userMessage === '.owner':
                await ownerCommand(sock, chatId);
                break;
             case userMessage === '.tagall':
                await tagAllCommand(sock, chatId, senderId, message);
                break;
            case userMessage === '.tagnotadmin':
                await tagNotAdminCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.hidetag'):
                await hideTagCommand(sock, chatId, senderId, rawText.slice(8).trim(), message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null, message);
                break;
            case userMessage.startsWith('.tag'):
                await tagCommand(sock, chatId, senderId, rawText.slice(4).trim(), message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null, message);
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
            case userMessage.startsWith('pay_'):
                await halotelCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
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
            case userMessage.startsWith('.compliment'):
                await complimentCommand(sock, chatId, message);
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
            case userMessage.startsWith('.mention '):
                await mentionToggleCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '), isOwnerOrSudoCheck);
                break;
            case userMessage.startsWith('.autobio'):
                await autoBioCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                break;
            case userMessage.startsWith('.gmention '):
                await groupMentionToggleCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                break;
            case userMessage.startsWith('.antistatusmention ') || userMessage.startsWith('.astatus '):
                await groupAntiStatusToggleCommand(sock, chatId, message, userMessage.split(' ').slice(1).join(' '));
                break;
            case userMessage === '.setmention':
                await setMentionCommand(sock, chatId, message, isOwnerOrSudoCheck);
                break;
            case userMessage.startsWith('.blur'):
                await blurCommand(sock, chatId, message, message.message?.extendedTextMessage?.contextInfo?.quotedMessage);
                break;
            case userMessage.startsWith('.antibadword'):
                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
            case userMessage.startsWith('.take') || userMessage.startsWith('.steal'):
                await takeCommand(sock, chatId, message, rawText.slice(userMessage.startsWith('.steal') ? 6 : 5).trim().split(' '));
                break;
            case userMessage.startsWith('.character'):
                await characterCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.waste'):
                await wastedCommand(sock, chatId, message);
                break;
            case userMessage === '.resetlink' || userMessage === '.revoke':
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case userMessage === '.staff' || userMessage === '.admins':
                await staffCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tourl') || userMessage.startsWith('.url'):
                await urlCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.emojimix'):
                await emojimixCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tg') || userMessage.startsWith('.stickertelegram'):
                await stickerTelegramCommand(sock, chatId, message);
                break;
            case userMessage === '.vv':
                await viewOnceCommand(sock, chatId, message);
                break;
            case userMessage === '.clearsession':
                await clearSessionCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.autostatus'):
                await autoStatusCommand(sock, chatId, message, userMessage.split(' ').slice(1));
                break;
            case userMessage.startsWith('.statusforward'):
                await statusForwardCommand(sock, chatId, message, userMessage.split(' ').slice(1));
                break;
            case userMessage.startsWith('.metallic') || userMessage.startsWith('.ice') || userMessage.startsWith('.snow') || userMessage.startsWith('.neon') || userMessage.startsWith('.devil') || userMessage.startsWith('.hacker'):
                await textmakerCommand(sock, chatId, message, userMessage, userMessage.slice(1).split(' ')[0]);
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
            case userMessage === '.getpp':
                await getProfilePicture(sock, chatId, message);
                break;
            case userMessage.startsWith('.setgdesc'):
                await setGroupDescription(sock, chatId, senderId, rawText.slice(9).trim(), message);
                break;
            case userMessage.startsWith('.setgname'):
                await setGroupName(sock, chatId, senderId, rawText.slice(9).trim(), message);
                break;
            case userMessage.startsWith('.setgpp'):
                await setGroupPhoto(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.instagram') || userMessage.startsWith('.ig'):
                await instagramCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.fb') || userMessage.startsWith('.facebook'):
                await facebookCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.play') || userMessage.startsWith('.music') || userMessage.startsWith('.song'):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.shazam'):
                await shazamCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.video') || userMessage.startsWith('.ytmp4'):
                await videoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tiktok') || userMessage.startsWith('.tt'):
                await tiktokCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.gpt') || userMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.translate') || userMessage.startsWith('.trt'):
                await handleTranslateCommand(sock, chatId, message, userMessage.slice(userMessage.startsWith('.translate') ? 10 : 4));
                break;
            case userMessage.startsWith('.areact') || userMessage.startsWith('.autoreact'):
                await handleAreactCommand(sock, chatId, message, isOwnerOrSudoCheck);
                break;
            case userMessage.startsWith('.sudo'):
                await sudoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.imagine') || userMessage.startsWith('.flux'):
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
            case userMessage === '.crop':
                await stickercropCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.update'):
                await updateCommand(sock, chatId, message, rawText.trim().split(/\s+/)[1] || '');
                commandExecuted = true;
                break;
            default:
                commandExecuted = false;
                break;
        }

        if (commandExecuted !== false) {
            await showTypingAfterCommand(sock, chatId);
        }

        async function groupJidCommand(sock, chatId, message) {
            if (!chatId.endsWith('@g.us')) return await sock.sendMessage(chatId, { text: "❌ Group only." });
            await sock.sendMessage(chatId, { text: `✅ JID: ${chatId}` }, { quoted: message });
        }

        if (userMessage.startsWith('.')) {
            await addCommandReaction(sock, message, commandExecuted !== false);
        }
    } catch (error) {
        console.error('⚠️ Command error:', error.message);
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        if (!id.endsWith('@g.us')) return;
        let isPublic = true;
        try {
            const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            isPublic = modeData.isPublic;
        } catch (e) {}
        if (action === 'promote' && isPublic) await handlePromotionEvent(sock, id, participants, author);
        if (action === 'demote' && isPublic) await handleDemotionEvent(sock, id, participants, author);
    } catch (error) {
        console.error('Error in participant update:', error);
    }
}

async function handleStatus(sock, chatUpdate) {
    await Promise.allSettled([
        handleStatusUpdate(sock, chatUpdate),
        handleStatusForward(sock, chatUpdate)
    ]);
}

module.exports = {
    handleMessages,
    handleStatus,
    handleGroupParticipantUpdate
};
