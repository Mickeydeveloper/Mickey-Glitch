/**
 * 🤖 MICKEY GLITCH - MAIN HANDLER WITH AUTO-REGISTRATION
 * Dynamically loads all commands from /commands and /lib
 * No manual imports needed - Just drop files and they work!
 */

const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────
// 🧹 FIX: Temp directory setup
// ────────────────────────────────────────────────
const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');

if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
if (!fs.existsSync(customTmp)) fs.mkdirSync(customTmp, { recursive: true });

process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Clean temp files every 5 minutes (only files older than 1 minute)
setInterval(() => {
  const foldersToClean = [customTemp, customTmp];
  foldersToClean.forEach(folder => {
    try {
      if (!fs.existsSync(folder)) return;
      const files = fs.readdirSync(folder);
      const now = Date.now();
      files.forEach(file => {
        const filePath = path.join(folder, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > 60000) {
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
        } catch (e) { /* Silent */ }
      });
    } catch (e) { /* Silent */ }
  });
}, 5 * 60 * 1000);

// ────────────────────────────────────────────────
// 🔥 AUTO-REGISTRATION SYSTEM
// ────────────────────────────────────────────────

const settings = require('./settings');
require('./config.js');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MICKEY";

// ────────────────────────────────────────────────
// 📂 COMMAND REGISTRY - Auto-load all commands
// ────────────────────────────────────────────────

class CommandRegistry {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.categories = new Map();
        this.loadedFiles = [];
        this.loadErrors = [];
    }

    /**
     * Scan and load all command files from directories
     */
    scanDirectories() {
        const directories = [
            path.join(process.cwd(), 'commands'),
            path.join(process.cwd(), 'lib')
        ];

        directories.forEach(dir => {
            if (fs.existsSync(dir)) {
                this.scanDirectory(dir);
            }
        });

        console.log(`✅ Loaded ${this.commands.size} commands from ${this.loadedFiles.length} files`);
        if (this.loadErrors.length > 0) {
            console.log(`⚠️ ${this.loadErrors.length} files failed to load`);
        }
        return this;
    }

    /**
     * Scan a single directory for command files
     */
    scanDirectory(dir) {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Recursively scan subdirectories
                this.scanDirectory(filePath);
                return;
            }

            // Only load .js files (not index.js, not .test.js)
            if (!file.endsWith('.js') || file === 'index.js' || file.includes('.test.')) {
                return;
            }

            try {
                this.loadCommandFile(filePath);
            } catch (error) {
                this.loadErrors.push({
                    file: filePath,
                    error: error.message
                });
            }
        });
    }

    /**
     * Load a single command file
     */
    loadCommandFile(filePath) {
        try {
            // Clear require cache to allow hot reload
            delete require.cache[require.resolve(filePath)];
            
            const module = require(filePath);
            
            // Check if module exports a command function
            if (typeof module === 'function') {
                // Function-style command: exports default function
                this.registerCommand(module, filePath);
            } else if (typeof module === 'object' && module !== null) {
                // Object-style command: exports { command, aliases, category, ... }
                if (module.command || module.default) {
                    const cmd = module.command || module.default;
                    if (typeof cmd === 'function') {
                        this.registerCommand(cmd, filePath, {
                            name: module.name || path.basename(filePath, '.js'),
                            aliases: module.aliases || [],
                            category: module.category || 'Uncategorized',
                            description: module.description || '',
                            usage: module.usage || '',
                            adminOnly: module.adminOnly || false,
                            ownerOnly: module.ownerOnly || false,
                            groupOnly: module.groupOnly || false,
                        });
                    }
                }
                // Also check for named exports
                for (const [key, value] of Object.entries(module)) {
                    if (typeof value === 'function' && 
                        (key.endsWith('Command') || key.endsWith('Handler') || key === 'execute')) {
                        // Check if it's likely a command handler
                        this.registerCommand(value, filePath, {
                            name: key.replace(/Command$|Handler$/, '').toLowerCase(),
                            aliases: [],
                            category: 'Auto-Detected',
                            description: `Auto-loaded: ${key}`,
                        });
                    }
                }
            }
            this.loadedFiles.push(filePath);
        } catch (error) {
            throw new Error(`Failed to load ${filePath}: ${error.message}`);
        }
    }

    /**
     * Register a command in the registry
     */
    registerCommand(fn, filePath, options = {}) {
        const name = options.name || path.basename(filePath, '.js').toLowerCase();
        const category = options.category || 'Uncategorized';
        
        // Store command
        this.commands.set(name, {
            fn: fn,
            filePath: filePath,
            options: options,
            category: category
        });

        // Register aliases
        if (options.aliases && Array.isArray(options.aliases)) {
            options.aliases.forEach(alias => {
                this.aliases.set(alias.toLowerCase(), name);
            });
        }

        // Add to category
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(name);
    }

    /**
     * Get a command by name or alias
     */
    getCommand(name) {
        const cmdName = name.toLowerCase();
        // Check direct match
        if (this.commands.has(cmdName)) {
            return this.commands.get(cmdName);
        }
        // Check alias
        if (this.aliases.has(cmdName)) {
            const realName = this.aliases.get(cmdName);
            return this.commands.get(realName);
        }
        return null;
    }

    /**
     * Check if a command exists
     */
    hasCommand(name) {
        return this.commands.has(name.toLowerCase()) || 
               this.aliases.has(name.toLowerCase());
    }

    /**
     * Get all command names
     */
    getAllCommands() {
        return Array.from(this.commands.keys());
    }

    /**
     * Get commands by category
     */
    getCommandsByCategory(category) {
        return this.categories.get(category) || [];
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Array.from(this.categories.keys());
    }

    /**
     * Auto-detect command from message
     */
    detectCommand(message) {
        // Extract command name from message
        let cmdName = '';
        let args = [];
        
        if (typeof message === 'string') {
            const parts = message.trim().split(/\s+/);
            cmdName = parts[0].replace(/^\./, '').toLowerCase();
            args = parts.slice(1);
        } else if (message && typeof message === 'object') {
            // Handle button/command objects
            cmdName = message.cmd || message.command || message.id || '';
            args = message.args || [];
        }
        
        const cmd = this.getCommand(cmdName);
        return { command: cmd, name: cmdName, args };
    }
}

// ────────────────────────────────────────────────
// 🚀 INITIALIZE REGISTRY
// ────────────────────────────────────────────────

const registry = new CommandRegistry();
registry.scanDirectories();

// Expose registry globally
global.commandRegistry = registry;
global.getAllCommands = () => registry.getAllCommands();

// ────────────────────────────────────────────────
// 📦 CORE IMPORTS (Minimal - only what's needed)
// ────────────────────────────────────────────────

const { isBanned } = require('./lib/isBanned');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const isAdmin = require('./lib/isAdmin');
const { getButtonId, autoDetectButtonCommand } = require('./lib/buttonLoader');
const { addCommandReaction } = require('./lib/reactions');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand, groupMentionToggleCommand } = require('./commands/mention');
const { handleChatbotMessage, groupChatbotToggleCommand } = require('./commands/chatbot');
const { autoStatusCommand, handleStatusUpdate } = require('./commands/autostatus');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autorecordingCommand, isAutorecordingEnabled, handleAutorecordingForMessage, handleAutorecordingForCommand, showRecordingAfterCommand } = require('./commands/autorecording');
const { autoBioCommand } = require('./commands/autobio');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { halotelCommand, getPendingRequest } = require('./commands/halotel');
const serverCommand = require('./commands/server');

// ────────────────────────────────────────────────
// 📊 ADMIN CACHE (Performance)
// ────────────────────────────────────────────────

const adminCache = new Map();
const ADMIN_CACHE_TTL = 30000; // 30 seconds

async function getCachedAdminStatus(sock, chatId, senderId) {
    const cacheKey = `${chatId}_${senderId}`;
    const cached = adminCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < ADMIN_CACHE_TTL)) {
        return cached.data;
    }
    const result = await isAdmin(sock, chatId, senderId);
    adminCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
}

// Clear admin cache every 5 minutes
setInterval(() => adminCache.clear(), 5 * 60 * 1000);

// ────────────────────────────────────────────────
// 🔥 MAIN HANDLER
// ────────────────────────────────────────────────

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Handle autoread
        await handleAutoread(sock, message);

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // Store message for antidelete
        if (message.message) {
            storeMessage(sock, message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        // ────────────────────────────────────────────────
        // 📝 EXTRACT MESSAGE TEXT
        // ────────────────────────────────────────────────

        let userMessage = '';
        let rawText = '';

        // Check for button/interactive responses
        const detectedId = getButtonId(message);
        if (detectedId || message.message?.buttonsResponseMessage || message.message?.listResponseMessage || message.message?.singleSelectReply) {
            const selectedId = message.message?.buttonsResponseMessage?.selectedButtonId || detectedId || 
                              message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                              message.message?.singleSelectReply?.selectedRowId || null;

            if (selectedId) {
                // Handle static button handlers
                const staticHandlers = {
                    'channel': async () => {
                        await sock.sendMessage(chatId, { text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A' }, { quoted: message });
                    },
                    'owner': async () => {
                        const ownerCmd = registry.getCommand('owner');
                        if (ownerCmd) await ownerCmd.fn(sock, chatId, message);
                    },
                    'support': async () => {
                        await sock.sendMessage(chatId, { text: '🔗 *Support Group*\n\nJoin our support community:\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7?mode=wwt' }, { quoted: message });
                    }
                };

                if (staticHandlers[selectedId]) {
                    try { await staticHandlers[selectedId](); } catch (e) {}
                    return;
                }

                // Handle .msgowner
                if (selectedId === '.msgowner' || selectedId === 'msgowner') {
                    const ownerNumber = settings.ownerNumber || '';
                    await sock.sendMessage(chatId, { text: `💬 Message owner: https://wa.me/${ownerNumber}` }, { quoted: message });
                    return;
                }

                // Handle panel selections
                if (selectedId && selectedId.toString().startsWith('h_panel_')) {
                    try { await serverCommand(sock, chatId, message, selectedId); } catch (e) {}
                    return;
                }

                // Handle halotel
                if (selectedId === 'show_data_menu' || selectedId.toString().startsWith('server_') || selectedId.toString().startsWith('data_')) {
                    await halotelCommand(sock, chatId, message, selectedId.toString().toLowerCase());
                    return;
                }

                if (selectedId && selectedId.toString().startsWith('txtstyle_')) {
                    const textCmd = registry.getCommand('text');
                    if (textCmd) await textCmd.fn(sock, chatId, message, selectedId.toString());
                    return;
                }

                if (selectedId && selectedId.startsWith('.')) {
                    userMessage = selectedId.toLowerCase();
                } else {
                    const autoCmd = autoDetectButtonCommand(message);
                    if (autoCmd) userMessage = autoCmd;
                    else return;
                }
            }
        }

        // Extract from regular message
        if (!userMessage) {
            userMessage = (
                message.message?.conversation?.trim() ||
                message.message?.extendedTextMessage?.text?.trim() ||
                message.message?.imageMessage?.caption?.trim() ||
                message.message?.videoMessage?.caption?.trim() ||
                ''
            ).toLowerCase().replace(/\.\s+/g, '.').trim();
        }

        rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            message.message?.contextInfo?.quotedMessage || null;
        const quotedText = (
            quotedMessage?.conversation?.trim() ||
            quotedMessage?.extendedTextMessage?.text?.trim() ||
            quotedMessage?.imageMessage?.caption?.trim() ||
            quotedMessage?.videoMessage?.caption?.trim() ||
            ''
        ).toString();

        // ────────────────────────────────────────────────
        // 🚫 BAN CHECK
        // ────────────────────────────────────────────────

        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, { text: '❌ You are banned.' });
            }
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // ────────────────────────────────────────────────
        // 🛡️ GROUP MODERATION
        // ────────────────────────────────────────────────

        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (e) {}

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }

            // Handle menu replies
            const isMenuReply = quotedText && (
                quotedText.includes('command categories') ||
                quotedText.includes('reply with number') ||
                quotedText.includes('available commands')
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

                if (/^\d+$/.test(reply)) {
                    const n = parseInt(reply, 10);
                    const helpCmd = registry.getCommand('help');
                    if (helpCmd) {
                        await helpCmd.fn(sock, chatId, message, `.help ${n}`);
                    }
                    return;
                }

                if (/^(next|more|prev|back|previous)$/i.test(reply)) {
                    const helpCmd = registry.getCommand('help');
                    if (helpCmd) {
                        await helpCmd.fn(sock, chatId, message, `.help`);
                    }
                    return;
                }
            }

            // Auto-detect commands without dot
            try {
                const firstToken = (userMessage.split(' ')[0] || '').replace(/[^a-z0-9\-_]/gi, '').toLowerCase();
                if (firstToken && registry.hasCommand(firstToken)) {
                    userMessage = '.' + userMessage;
                }
            } catch (e) {}

            // Check pending halotel state
            if (!userMessage.startsWith('.')) {
                try {
                    if (getPendingRequest && typeof getPendingRequest === 'function') {
                        const pendingReq = getPendingRequest(chatId);
                        if (pendingReq) {
                            await halotelCommand(sock, chatId, message, userMessage);
                            return;
                        }
                    }
                } catch (e) {}

                if (isGroup) {
                    await handleAutotypingForMessage(sock, chatId, userMessage);
                    await handleAutorecordingForMessage(sock, chatId, userMessage);

                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                }

                try {
                    if (typeof handleChatbotMessage === 'function') {
                        await handleChatbotMessage(sock, chatId, message, userMessage);
                    }
                } catch (e) {}
                return;
            }
        }

        // Private mode check
        if (!isPublic && !isOwnerOrSudoCheck) {
            return;
        }

        // ────────────────────────────────────────────────
        // 🔐 ADMIN & OWNER CHECKS
        // ────────────────────────────────────────────────

        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp', '.pp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autorecording', '.autoread', '.pmblocker'];

        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (isGroup && isAdminCommand) {
            const adminStatus = await getCachedAdminStatus(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Bot must be admin to use this command.' }, { quoted: message });
                return;
            }

            if (userMessage.startsWith('.mute') || userMessage === '.unmute' ||
                userMessage.startsWith('.ban') || userMessage.startsWith('.unban') ||
                userMessage.startsWith('.promote') || userMessage.startsWith('.demote')) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, { text: 'Only group admins can use this command.' }, { quoted: message });
                    return;
                }
            }
        }

        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId, { text: '❌ Owner only command!' }, { quoted: message });
                return;
            }
        }

        // ────────────────────────────────────────────────
        // 🔑 PIN CHECK
        // ────────────────────────────────────────────────

        if (!userMessage.startsWith('.pin')) {
            try {
                const pinVerified = await checkPinVerification(senderId);
                if (!pinVerified) {
                    await sock.sendMessage(chatId, {
                        text: `🔐 *PIN REQUIRED*\n\nCommand: .pin <pincode>`
                    }, { quoted: message });
                    return;
                }
            } catch (e) {}
        }

        // ────────────────────────────────────────────────
        // 🎯 EXECUTE COMMAND FROM REGISTRY
        // ────────────────────────────────────────────────

        let commandExecuted = false;

        // Extract command name and args
        const parts = userMessage.trim().split(/\s+/);
        const cmdName = parts[0].replace(/^\./, '').toLowerCase();
        const args = parts.slice(1);

        // Try to find command in registry
        const cmd = registry.getCommand(cmdName);

        if (cmd) {
            try {
                // Execute the command
                await cmd.fn(sock, chatId, message, args, userMessage, rawText);
                commandExecuted = true;
            } catch (error) {
                console.error(`Error executing command ${cmdName}:`, error.message);
                await sock.sendMessage(chatId, {
                    text: `❌ Error executing command: ${error.message}`
                }, { quoted: message });
            }
        } else {
            // Check if it's a direct command function that wasn't registered
            // Try to find in known commands
            function safeRequire(modulePath) {
                try {
                    return require(modulePath);
                } catch (error) {
                    return null;
                }
            }

            function getFallbackHandler(modulePath) {
                const moduleExport = safeRequire(modulePath);
                if (typeof moduleExport === 'function') return moduleExport;
                if (moduleExport && typeof moduleExport === 'object') {
                    if (typeof moduleExport.default === 'function') return moduleExport.default;
                    if (typeof moduleExport.command === 'function') return moduleExport.command;
                    if (typeof moduleExport.execute === 'function') return moduleExport.execute;
                }
                return null;
            }

            const knownCommands = {
                'add': './commands/add',
                'kick': './commands/kick',
                'mute': './commands/mute',
                'unmute': './commands/unmute',
                'ban': './commands/ban',
                'unban': './commands/unban',
                'ping': './commands/ping',
                'owner': './commands/owner',
                'tagall': './commands/tagall',
                'tagnotadmin': './commands/tagnotadmin',
                'hidetag': './commands/hidetag',
                'tag': './commands/tag',
                'antibadword': './commands/antibadword',
                'take': './commands/take',
                'steal': './commands/take',
                'character': './commands/character',
                'waste': './commands/wasted',
                'resetlink': './commands/resetlink',
                'staff': './commands/staff',
                'url': './commands/url',
                'emojimix': './commands/emojimix',
                'telegram': './commands/stickertelegram',
                'tg': './commands/stickertelegram',
                'vv': './commands/viewonce',
                'clearsession': './commands/clearsession',
                'clearsesi': './commands/clearsession',
                'cleartmp': './commands/cleartmp',
                'setpp': './commands/setpp',
                'pp': './commands/setpp',
                'setgdesc': './commands/groupmanage',
                'setgname': './commands/groupmanage',
                'setgpp': './commands/groupmanage',
                'instagram': './commands/instagram',
                'insta': './commands/instagram',
                'ig': './commands/instagram',
                'igsc': './commands/igs',
                'igs': './commands/igs',
                'fb': './commands/facebook',
                'facebook': './commands/facebook',
                'play': './commands/play',
                'music': './commands/play',
                'mp3': './commands/play',
                'song': './commands/play',
                'video': './commands/video',
                'ytmp4': './commands/video',
                'tiktok': './commands/tiktok',
                'tt': './commands/tiktok',
                'gpt': './commands/ai',
                'gemini': './commands/ai',
                'aivoice': './commands/ai',
                'mickey': './commands/Mickey',
                'translate': './commands/translate',
                'trt': './commands/translate',
                'areact': './lib/reactions',
                'autoreact': './lib/reactions',
                'sudo': './commands/sudo',
                'imagine': './commands/imagine',
                'flux': './commands/imagine',
                'dalle': './commands/imagine',
                'jid': './commands/jid',
                'crop': './commands/stickercrop',
                'update': './commands/update',
                'checkupdates': './commands/checkupdates',
                'newgroup': './commands/newgroup',
                'gdrive': './commands/gdrive',
                'getcode': './commands/getcode',
                'getlink': './commands/getlink',
                'shazam': './commands/shazam',
                'repo': './commands/repo',
                'stats': './commands/stats',
                'telebot': './commands/telebot',
                'stickeralt': './commands/sticker-alt',
                'sticker': './commands/sticker',
                's': './commands/sticker',
                'gpstatus': './commands/gpstatus',
                'warnings': './commands/warnings',
                'warn': './commands/warn',
                'tts': './commands/tts',
                'delete': './commands/delete',
                'del': './commands/delete',
                'settings': './commands/settings',
                'mode': './commands/mode',
                'anticall': './commands/anticall',
                'pmblocker': './commands/pmblocker',
                'chatbot': './commands/chatbot',
                'antilink': './commands/antilink',
                'antitag': './commands/antitag',
                'mention': './commands/mention',
                'autobio': './commands/autobio',
                'gmention': './commands/mention',
                'setmention': './commands/mention',
                'blur': './commands/img-blur',
                'metallic': './commands/textmaker',
                'ice': './commands/textmaker',
                'snow': './commands/textmaker',
                'impressive': './commands/textmaker',
                'matrix': './commands/textmaker',
                'light': './commands/textmaker',
                'neon': './commands/textmaker',
                'devil': './commands/textmaker',
                'purple': './commands/textmaker',
                'thunder': './commands/textmaker',
                'leaves': './commands/textmaker',
                '1917': './commands/textmaker',
                'arena': './commands/textmaker',
                'hacker': './commands/textmaker',
                'sand': './commands/textmaker',
                'blackpink': './commands/textmaker',
                'glitch': './commands/textmaker',
                'fire': './commands/textmaker',
                'text': './commands/text',
                'antidelete': './commands/antidelete',
                'promote': './commands/promote',
                'demote': './commands/demote',
                'pin': './commands/pin',
                'compliment': './commands/compliment',
                'lyrics': './commands/lyrics',
                'clear': './commands/clear',
                'alive': './commands/alive',
                'weather': './commands/weather',
                'report': './commands/report',
                'halotel': './commands/halotel',
                'server': './commands/server',
            };

            const fallbackHandler = knownCommands[cmdName] ? getFallbackHandler(knownCommands[cmdName]) : null;

            if (fallbackHandler) {
                try {
                    await fallbackHandler(sock, chatId, message, args, userMessage, rawText);
                    commandExecuted = true;
                } catch (error) {
                    console.error(`Error executing ${cmdName}:`, error.message);
                    await sock.sendMessage(chatId, {
                        text: `❌ Error: ${error.message}`
                    }, { quoted: message });
                }
            } else if (isGroup) {
                // Group moderation
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            }
        }

        // ────────────────────────────────────────────────
        // 🔄 POST-COMMAND ACTIONS
        // ────────────────────────────────────────────────

        if (commandExecuted) {
            await showTypingAfterCommand(sock, chatId);
            try { await showRecordingAfterCommand(sock, chatId); } catch (e) {}
        }

        if (userMessage.startsWith('.')) {
            await addCommandReaction(sock, message, commandExecuted);
        }

    } catch (error) {
        // Silent error handling
        if (!error.message?.includes('decrypt') && !error.message?.includes('session')) {
            console.error('❌ Handler error:', error.message);
        }
        try {
            const chatId = messageUpdate?.messages?.[0]?.key?.remoteJid;
            if (chatId) {
                await sock.sendMessage(chatId, {
                    text: `❌ Error: ${String(error.message).slice(0, 200)}`
                }).catch(() => {});
            }
        } catch (e) {}
    }
}

// ────────────────────────────────────────────────
// 👥 GROUP PARTICIPANT HANDLER
// ────────────────────────────────────────────────

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
        } else if (action === 'demote') {
            if (!isPublic) return;
            await handleDemotionEvent(sock, id, participants, author);
        }
    } catch (error) {
        // Silent
    }
}

// ────────────────────────────────────────────────
// 📡 STATUS HANDLER
// ────────────────────────────────────────────────

async function handleStatus(sock, messageUpdate) {
    try {
        if (!sock || !messageUpdate?.messages) return;
        global.autostatusHandler = require(path.join(process.cwd(), 'commands', 'autostatus.js'));
        for (const m of messageUpdate.messages || []) {
            if (m.key?.remoteJid !== 'status@broadcast') continue;
            if (global.autostatusHandler?.handleAutoStatus) {
                await global.autostatusHandler.handleAutoStatus(sock, { messages: [m] });
            }
        }
    } catch (e) {
        // Silent
    }
}

// ────────────────────────────────────────────────
// 📤 EXPORTS
// ────────────────────────────────────────────────

module.exports = {
    handleMessages,
    handleStatusUpdate,
    handleGroupParticipantUpdate,
    handleStatus,
    registry, // Export registry for external use
    getCommand: (name) => registry.getCommand(name),
    getAllCommands: () => registry.getAllCommands(),
};