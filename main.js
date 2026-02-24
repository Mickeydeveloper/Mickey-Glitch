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
                    fs.unlink(filePath, () => { });
                }
            });
        }
    });
    console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
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
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');

// Command imports
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const { promoteCommand, handlePromotionEvent } = require('./commands/promote');
const { demoteCommand, handleDemotionEvent } = require('./commands/demote');
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
const { handleMentionDetection, mentionToggleCommand, setMentionCommand } = require('./commands/mention');
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const weatherCommand = require('./commands/weather');
const kickCommand = require('./commands/kick');
const { complimentCommand } = require('./commands/compliment');
const { lyricsCommand } = require('./commands/lyrics');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');
const { groupChatbotToggleCommand, handleChatbotMessage } = require('./commands/chatbot');
const takeCommand = require('./commands/take');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
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
const tiktokCommand = require('./commands/tiktok');
const aiCommand = require('./commands/ai');
const urlCommand = require('./commands/url');
const { handleTranslateCommand } = require('./commands/translate');
const { addCommandReaction, handleAreactCommand } = require('./lib/reactions');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const sudoCommand = require('./commands/sudo');
const { miscCommand, handleHeart } = require('./commands/misc');
const { animeCommand } = require('./commands/anime');
const { piesAlias } = require('./commands/pies-alias');
const stickercropCommand = require('./commands/stickercrop');
const updateCommand = require('./commands/update');
const { igsCommand } = require('./commands/igs');
const { anticallCommand } = require('./commands/anticall');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const addCommand = require('./commands/add');
const autobioCommand = require('./commands/autobio');
const chartCommand = require('./commands/chart');
const checkupdatesCommand = require('./commands/checkupdates');
const halotelCommand = require('./commands/halotel');
const mickeyCommand = require('./commands/mickey');
const pairCommand = require('./commands/pair');
const phoneCommand = require('./commands/phone');
const { pinCommand } = require('./commands/pin');
const reportCommand = require('./commands/report');
const statusforwardCommand = require('./commands/statusforward');
const stickerAltCommand = require('./commands/sticker-alt');
const antistatusMentionCommand = require('./commands/antistatusmention');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MickeyMozy";

const channelInfo = {
    contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363398106360290@newsletter',
            newsletterName: '🅼🅸🅲🅺🅴𝚈 🚀',
            serverMessageId: 143
        }
    }
};

// Runtime: attach a lightweight `signature` to every command module for tracking
try {
    const commandsDir = path.join(__dirname, 'commands');
    // Recursively collect .js files
    function walkDir(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(function(file) {
            const fp = path.join(dir, file);
            const stat = fs.statSync(fp);
            if (stat && stat.isDirectory()) results = results.concat(walkDir(fp));
            else if (file.endsWith('.js')) results.push(fp);
        });
        return results;
    }

    const cmdFiles = fs.existsSync(commandsDir) ? walkDir(commandsDir) : [];
    // command registry for dynamic dispatch
    const commandRegistry = {};

    cmdFiles.forEach(absPath => {
        try {
            const rel = './' + path.relative(__dirname, absPath).replace(/\\/g, '/');
            const wasLoaded = Boolean(require.cache[require.resolve(rel)]);
            const mod = require(rel);
            const file = path.basename(absPath);
            const sig = { signed: true, by: 'Mickey-Glitch', file };
            if (typeof mod === 'function') {
                if (!mod.signature) mod.signature = sig;
            } else if (mod && typeof mod === 'object') {
                if (!mod.signature) mod.signature = sig;
            }

            // register by basename (without ext) and by cleaned name
            const base = path.basename(file, '.js');
            const cleaned = base.replace(/[-_]/g, '').toLowerCase();
            commandRegistry[base.toLowerCase()] = mod;
            if (cleaned !== base.toLowerCase()) commandRegistry[cleaned] = mod;

            if (!wasLoaded) {
                console.log(`Registered command (auto): ${base}`);
            }
        } catch (e) {
            console.error('Command load error:', e.message);
        }
    });

    // expose registry for runtime use (used below for fallback dispatch)
    global.__commandRegistry = commandRegistry;
} catch (e) {
    console.error('Failed to sign commands:', e.message);
}

async function handleMessages(sock, messageUpdate) {
    let chatId = null;
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        await handleAutoread(sock, message);
        if (message.message) storeMessage(sock, message);

        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // Handle button responses
        if (message.message?.buttonsResponseMessage) {
            const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
            if (buttonId === 'channel') {
                await sock.sendMessage(chatId, { text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610' }, { quoted: message });
                return;
            } else if (buttonId === 'owner') {
                await ownerCommand(sock, chatId);
                return;
            }
        }

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() || ''
        ).toLowerCase();

        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() || '';

        if (userMessage.startsWith('.')) {
            console.log(`📝 Command: ${userMessage}`);
        }

        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (e) { isPublic = true; }

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        if (isBanned(senderId) && !userMessage.startsWith('.unban')) return;

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        if (isGroup) {
            await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await Antilink(message, sock);
        }

        if (!userMessage.startsWith('.')) {
            await handleAutotypingForMessage(sock, chatId, userMessage);
            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
                if (isPublic || isOwnerOrSudoCheck) {
                    await handleChatbotMessage(sock, chatId, message);
                }
            }
            return;
        }

        if (!isPublic && !isOwnerOrSudoCheck) return;

        let commandExecuted = true;
        const args = userMessage.split(' ').slice(1);

        switch (true) {
            case userMessage.startsWith('.kick'): await kickCommand(sock, chatId, senderId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message); break;
            case userMessage.startsWith('.mute'): await muteCommand(sock, chatId, senderId, message, parseInt(userMessage.split(' ')[1]) || undefined); break;
            case userMessage === '.unmute': await unmuteCommand(sock, chatId, senderId); break;
            case userMessage.startsWith('.ban'): await banCommand(sock, chatId, message); break;
            case userMessage.startsWith('.unban'): await unbanCommand(sock, chatId, message); break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.list': await helpCommand(sock, chatId, message, global.channelLink); break;
            case userMessage === '.sticker' || userMessage === '.s': await stickerCommand(sock, chatId, message); break;
            case userMessage.startsWith('.warn'): await warnCommand(sock, chatId, senderId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message); break;
            case userMessage.startsWith('.warnings'): await warningsCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || []); break;
            case userMessage.startsWith('.tts'): await ttsCommand(sock, chatId, userMessage.slice(4).trim(), message); break;
            case userMessage.startsWith('.del'): await deleteCommand(sock, chatId, message, senderId); break;
            case userMessage === '.owner': await ownerCommand(sock, chatId); break;
            case userMessage === '.ping': await pingCommand(sock, chatId, message); break;
            case userMessage === '.alive': await aliveCommand(sock, chatId, message); break;
            case userMessage.startsWith('.autostatus'): await autoStatusCommand(sock, chatId, message, args); break;
            case userMessage.startsWith('.ai') || userMessage.startsWith('.gpt'): await aiCommand(sock, chatId, message); break;
            case userMessage.startsWith('.play'): await playCommand(sock, chatId, message); break;
            case userMessage.startsWith('.video'): await videoCommand(sock, chatId, message); break;
            case userMessage.startsWith('.tiktok'): await tiktokCommand(sock, chatId, message); break;
            case userMessage.startsWith('.insta'): await instagramCommand(sock, chatId, message); break;
            case userMessage.startsWith('.fb'): await facebookCommand(sock, chatId, message); break;
            case userMessage.startsWith('.imagine'): await imagineCommand(sock, chatId, message); break;
            case userMessage.startsWith('.setpp'): await setProfilePicture(sock, chatId, message); break;
            case userMessage.startsWith('.promote'): await promoteCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message); break;
            case userMessage.startsWith('.demote'): await demoteCommand(sock, chatId, message.message.extendedTextMessage?.contextInfo?.mentionedJid || [], message); break;
            case userMessage.startsWith('.tagall'): await tagAllCommand(sock, chatId, senderId, message); break;
            case userMessage.startsWith('.hidetag'): await hideTagCommand(sock, chatId, senderId, rawText.slice(8).trim(), message.message?.extendedTextMessage?.contextInfo?.quotedMessage, message); break;
            case userMessage.startsWith('.weather'): await weatherCommand(sock, chatId, message, userMessage.slice(9).trim()); break;
            case userMessage.startsWith('.lyrics'): await lyricsCommand(sock, chatId, userMessage.split(' ').slice(1).join(' '), message); break;
            case userMessage === '.clear': await clearCommand(sock, chatId); break;
            case userMessage.startsWith('.chatbot'): await groupChatbotToggleCommand(sock, chatId, message, userMessage.slice(8).trim()); break;
            case userMessage.startsWith('.url'): await urlCommand(sock, chatId, message); break;
            case userMessage === '.vv': await viewOnceCommand(sock, chatId, message); break;
            case userMessage === '.clearsession': await clearSessionCommand(sock, chatId, message); break;
            case userMessage.startsWith('.sudo'): await sudoCommand(sock, chatId, message); break;
            case userMessage.startsWith('.update'): await updateCommand(sock, chatId, message, userMessage.split(' ')[1] || ''); break;
            // Add all other cases here matching your original logic...
            default: commandExecuted = false; break;
        }

        if (commandExecuted) {
            await addCommandReaction(sock, message);
            await showTypingAfterCommand(sock, chatId);
        } else {
            // Fallback: try dynamic registry dispatch for commands not in switch-case
            try {
                const registry = global.__commandRegistry || {};
                const cmdToken = userMessage.split(' ')[0].slice(1).toLowerCase();
                const cleaned = cmdToken.replace(/[-_]/g, '');
                let cmdModule = registry[cmdToken] || registry[cleaned];

                if (cmdModule) {
                    // If module exports a function, call it. If it exports an object with a known method, try common keys.
                    if (typeof cmdModule === 'function') {
                        await cmdModule(sock, chatId, message, ...args);
                        commandExecuted = true;
                    } else if (cmdModule && typeof cmdModule === 'object') {
                        const fn = cmdModule.execute || cmdModule.run || cmdModule.default || cmdModule;
                        if (typeof fn === 'function') {
                            await fn(sock, chatId, message, ...args);
                            commandExecuted = true;
                        }
                    }

                    if (commandExecuted) {
                        await addCommandReaction(sock, message);
                        await showTypingAfterCommand(sock, chatId);
                    }
                }
            } catch (e) {
                console.error('Fallback dispatch error:', e.message);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, action, participants, author } = update;
        if (action === 'promote') await handlePromotionEvent(sock, id, participants, author);
        if (action === 'demote') await handleDemotionEvent(sock, id, participants, author);
    } catch (e) { console.error(e); }
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatusUpdate // HII NI MUHIMU KWA INDEX.JS
};
