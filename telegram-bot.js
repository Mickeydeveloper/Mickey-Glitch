/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH
 * ULTIMATE FIX: Full error handling, command validation, and resilience
 * Fixed: Baileys internals, command loading, media sending, and more
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');
const settings = require('./settings');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ============================================================
// 📁 DIRECTORIES & CONFIGURATION
// ============================================================
const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;
const TEMP_DIR = path.join(__dirname, 'tmp');
const COMMANDS_DIR = path.join(__dirname, 'commands');

// Store active pairing sessions and command executions
const activePairingSessions = new Map();
const whatsappCommands = new Map();
const commandExecutionCache = new Map();
const commandErrors = new Map();

// Default axios config with better timeout
const AXIOS_DEFAULTS = {
    timeout: 120000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
    },
    maxRedirects: 5,
    validateStatus: status => status < 400
};

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR, { recursive: true });

// ============================================================
// 🎨 COLORED LOGGING
// ============================================================
const colors = {
    green: (t) => `\x1b[32m${t}\x1b[0m`,
    red: (t) => `\x1b[31m${t}\x1b[0m`,
    yellow: (t) => `\x1b[33m${t}\x1b[0m`,
    blue: (t) => `\x1b[34m${t}\x1b[0m`,
    cyan: (t) => `\x1b[36m${t}\x1b[0m`,
    magenta: (t) => `\x1b[35m${t}\x1b[0m`
};

function logSuccess(text) { console.log(colors.green('✅ ' + text)); }
function logError(text) { console.log(colors.red('❌ ' + text)); }
function logWarning(text) { console.log(colors.yellow('⚠️ ' + text)); }
function logInfo(text) { console.log(colors.blue('ℹ️ ' + text)); }
function logDebug(text) { console.log(colors.cyan('🐛 ' + text)); }

// ============================================================
// 🛠️ ROBUST TELEGRAM SOCK WITH FULL ERROR HANDLING
// ============================================================

function createTelegramSock(chatId, messageId) {
    return {
        sendMessage: async (jid, content, options = {}) => {
            try {
                const id = String(jid);
                
                if (!content || typeof content !== 'object') {
                    throw new Error('Invalid content format');
                }
                
                // Handle different message types with proper error handling
                if (content.text) {
                    return await sendTelegramMessage(id, content.text, {}, messageId);
                } else if (content.image) {
                    const url = content.image.url || content.image;
                    if (!url) throw new Error('Image URL missing');
                    return await sendTelegramPhoto(id, url, content.caption || '', messageId);
                } else if (content.audio) {
                    const url = content.audio.url || content.audio;
                    if (!url) throw new Error('Audio URL missing');
                    return await sendTelegramMedia(id, 'audio', url, content.caption || '', messageId);
                } else if (content.video) {
                    const url = content.video.url || content.video;
                    if (!url) throw new Error('Video URL missing');
                    return await sendTelegramMedia(id, 'video', url, content.caption || '', messageId);
                } else if (content.document) {
                    const url = content.document.url || content.document;
                    if (!url) throw new Error('Document URL missing');
                    return await sendTelegramDocument(id, url, content.caption || '', messageId);
                } else {
                    // Try to send as text
                    const text = typeof content === 'string' ? content : JSON.stringify(content);
                    return await sendTelegramMessage(id, text.substring(0, 4000), {}, messageId);
                }
            } catch (error) {
                logError(`[Sock.sendMessage] Error: ${error.message}`);
                try {
                    await sendTelegramMessage(String(jid), `❌ *Error:* ${error.message.substring(0, 200)}`, {}, messageId);
                } catch (e) {
                    logError(`[Sock.sendMessage] Fallback error: ${e.message}`);
                }
                return false;
            }
        },
        
        sendMessageAck: async () => true,
        
        react: async (jid, { text }) => {
            try {
                return await sendTelegramMessage(String(jid), text, {}, messageId);
            } catch (error) {
                logError(`[Sock.react] Error: ${error.message}`);
                return false;
            }
        },
        
        sendPresenceUpdate: async () => true,
        readMessages: async () => true,
        updateMessage: async () => true,
        
        logger: {
            info: logInfo,
            error: logError,
            warn: logWarning,
            debug: logDebug
        }
    };
}

// ============================================================
// 📁 ENHANCED COMMAND LOADER WITH FULL VALIDATION
// ============================================================

function loadWhatsappCommands() {
    if (!fs.existsSync(COMMANDS_DIR)) {
        logWarning('Commands folder not found. Creating...');
        fs.mkdirSync(COMMANDS_DIR, { recursive: true });
        return;
    }

    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
    whatsappCommands.clear();
    commandErrors.clear();
    
    if (files.length === 0) {
        logWarning('No command files found in /commands folder');
        return;
    }
    
    for (const file of files) {
        try {
            const baseName = file.replace('.js', '');
            const filePath = path.join(COMMANDS_DIR, file);
            
            // Clear cache for fresh load
            delete require.cache[require.resolve(filePath)];
            const cmdModule = require(filePath);
            
            // Validate and load command
            let commandName = null;
            let commandFunction = null;
            
            if (typeof cmdModule === 'function') {
                commandName = baseName;
                commandFunction = cmdModule;
            } else if (cmdModule && typeof cmdModule === 'object') {
                if (cmdModule.name && typeof cmdModule.execute === 'function') {
                    commandName = cmdModule.name;
                    commandFunction = cmdModule.execute;
                } else if (typeof cmdModule.execute === 'function') {
                    commandName = baseName;
                    commandFunction = cmdModule.execute;
                } else if (cmdModule.default && typeof cmdModule.default === 'function') {
                    commandName = baseName;
                    commandFunction = cmdModule.default;
                } else {
                    commandName = baseName;
                    commandFunction = cmdModule;
                }
            }
            
            // Validate and store command
            if (commandName && typeof commandFunction === 'function') {
                whatsappCommands.set(commandName, commandFunction);
                logDebug(`✅ Loaded command: ${commandName} from ${file}`);
            } else {
                logWarning(`⚠️ Skipping ${file}: Not a valid command function`);
                commandErrors.set(baseName, 'Invalid command format');
            }
        } catch (e) {
            logError(`❌ Failed to load ${file}: ${e.message}`);
            commandErrors.set(file.replace('.js', ''), e.message);
        }
    }
    
    logSuccess(`✅ Loaded ${whatsappCommands.size} commands from /commands folder`);
    if (commandErrors.size > 0) {
        logWarning(`⚠️ ${commandErrors.size} commands failed to load`);
    }
}

// ============================================================
// 📱 ENHANCED TELEGRAM MEDIA FUNCTIONS
// ============================================================

async function sendTelegramMessage(chatId, text, extra = {}, messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) {
        logError('Missing token or chatId');
        return false;
    }
    
    try {
        const safeText = String(text || '').substring(0, 4096);
        if (!safeText) {
            logWarning('Empty message text');
            return false;
        }
        
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
            chat_id: String(chatId),
            text: safeText,
            disable_web_page_preview: true,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId,
            ...extra
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 30000
        });
        
        return response?.data?.ok !== false;
    } catch (error) {
        if (error.response?.status === 403) {
            logError(`Bot blocked by user: ${chatId}`);
        } else if (error.response?.status === 400) {
            logError(`Bad request: ${error.response?.data?.description || error.message}`);
        } else {
            logError(`Send message error: ${error.message}`);
        }
        return false;
    }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !photoUrl) return false;
    
    try {
        const safeCaption = String(caption || '').substring(0, 1024);
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: photoUrl,
            caption: safeCaption,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 60000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send photo error: ${error.message}`);
        // Fallback: send as text
        try {
            await sendTelegramMessage(chatId, `📸 *Photo URL:* ${photoUrl}\n${caption}`, {}, messageId);
        } catch (e) {
            logError(`Photo fallback error: ${e.message}`);
        }
        return false;
    }
}

async function sendTelegramMedia(chatId, type, url, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !url) return false;
    
    const endpoint = type === 'audio' ? 'sendAudio' : 'sendVideo';
    try {
        const safeCaption = String(caption || '').substring(0, 1024);
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/${endpoint}`, {
            chat_id: String(chatId),
            [type]: url,
            caption: safeCaption,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId,
            supports_streaming: true
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 120000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send media error: ${error.message}`);
        try {
            await sendTelegramMessage(chatId, `📎 *Media Link:* ${url}\n${caption}`, {}, messageId);
        } catch (e) {
            logError(`Media fallback error: ${e.message}`);
        }
        return false;
    }
}

async function sendTelegramDocument(chatId, docUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !docUrl) return false;
    
    try {
        const safeCaption = String(caption || '').substring(0, 1024);
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendDocument`, {
            chat_id: String(chatId),
            document: docUrl,
            caption: safeCaption,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 120000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send document error: ${error.message}`);
        return false;
    }
}

// ============================================================
// 🔐 PAIRING FUNCTIONS
// ============================================================

async function generatePairingCode(phoneNumber) {
    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./pairing-${phoneNumber}`);

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Mickey Glitch', 'Chrome', '120.0.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                sock.end(new Error('Timeout'));
                reject(new Error('Pairing timeout after 60 seconds'));
            }, 60000);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, pairingCode } = update;

                if (pairingCode) {
                    clearTimeout(timeout);
                    await delay(1000);
                    await sock.end();
                    resolve({ pairingCode });
                }

                if (connection === 'close') {
                    clearTimeout(timeout);
                    const error = lastDisconnect?.error;
                    reject(new Error(error?.message || 'Connection closed'));
                }
            });

            sock.requestPairingCode(phoneNumber);
        });
    } catch (error) {
        throw new Error(`Pairing failed: ${error.message}`);
    }
}

async function handlePairCommand(chatId, args, sendMessage) {
    const inputNumber = args[0] || '';
    if (!inputNumber) {
        return sendMessage(chatId, '⚠️ *Please enter phone number!*\n\n📌 *Example:* `/pair 255612130873`');
    }

    const cleanNumber = inputNumber.replace(/[^0-9]/g, '');

    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
        return sendMessage(chatId, '❌ *Invalid number!*\n\n✅ Valid: 255XXXXXXXXX');
    }

    if (activePairingSessions.has(chatId)) {
        return sendMessage(chatId, '⏳ *Pairing already in progress!*');
    }

    await sendMessage(chatId, `🔐 *GENERATING PAIRING CODE...*\n\n📱 *Number:* +${cleanNumber}\n⏱️ *Time:* 15-30 seconds`);

    activePairingSessions.set(chatId, true);

    try {
        const result = await generatePairingCode(cleanNumber);

        if (result && result.pairingCode) {
            addAllowedChat(chatId);

            const successMsg = `🔑 *YOUR PAIRING CODE!*\n\n` +
                              `╭━━━━━━━━━━━━━━━━━━━━╮\n` +
                              `┃ 🔐 *CODE:* \`${result.pairingCode}\`\n` +
                              `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                              `📌 *HOW TO USE:*\n` +
                              `1️⃣ Open WhatsApp\n` +
                              `2️⃣ Go *Settings* → *Linked Devices*\n` +
                              `3️⃣ Select *Link with Phone Number*\n` +
                              `4️⃣ Enter this code: \`${result.pairingCode}\`\n\n` +
                              `✅ *Bot will connect automatically!*`;

            await sendMessage(chatId, successMsg);

            const ownerId = String(settings.telegram?.ownerId || '').trim();
            if (ownerId && ownerId !== chatId) {
                await sendMessage(ownerId, `🔔 *New Pairing Request*\n👤 Chat ID: \`${chatId}\`\n📱 Number: +${cleanNumber}\n✅ Status: Success`);
            }
        } else {
            await sendMessage(chatId, '❌ *FAILED TO GET CODE!*');
        }
    } catch (error) {
        logError(`Pairing Error: ${error.message}`);
        await sendMessage(chatId, `❌ *PAIRING FAILED!*\n\n📛 ${error.message}\n\nPlease try again later.`);
    } finally {
        setTimeout(() => {
            activePairingSessions.delete(chatId);
        }, 30000);
    }
}

// ============================================================
// 📊 TELEGRAM DATA MANAGEMENT
// ============================================================

function ensureTelegramDataFile() {
    if (!fs.existsSync(TELEGRAM_DATA_DIR)) fs.mkdirSync(TELEGRAM_DATA_DIR, { recursive: true });
    if (!fs.existsSync(TELEGRAM_DATA_FILE)) fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify([]), 'utf8');
}

function loadAllowedChats() {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
    } catch (error) { 
        logError(`Load allowed chats error: ${error.message}`);
        return []; 
    }
}

function saveAllowedChats(chats) {
    try {
        const unique = Array.from(new Set(chats.map(id => String(id))));
        fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
    } catch (error) {
        logError(`Save allowed chats error: ${error.message}`);
    }
}

function isChatAllowed(chatId) { 
    return loadAllowedChats().includes(String(chatId)); 
}

function addAllowedChat(chatId) {
    const allowed = loadAllowedChats();
    if (!allowed.includes(String(chatId))) { 
        allowed.push(String(chatId)); 
        saveAllowedChats(allowed); 
        logSuccess(`Chat paired: ${chatId}`);
    }
}

function removeAllowedChat(chatId) {
    const allowed = loadAllowedChats().filter(id => id !== String(chatId)); 
    saveAllowedChats(allowed);
    logInfo(`Chat unpaired: ${chatId}`);
}

function isOwnerChat(chatId) {
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    return ownerId && String(chatId) === ownerId;
}

function isTelegramAuthorized(chatId) {
    if (isChatAllowed(chatId)) return true;
    if (isOwnerChat(chatId)) return true;
    if (String(settings.commandMode || '').toLowerCase() === 'public') return true;
    return false;
}

async function removeWebhookIfSet(token) {
    try { 
        const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`, {}, AXIOS_DEFAULTS); 
        return resp?.data?.ok || false; 
    } catch (err) { 
        return false; 
    }
}

// ============================================================
// 🛡️ SAFE COMMAND EXECUTION WITH FULL ERROR HANDLING
// ============================================================

async function safeExecuteCommand(commandName, commandFn, sock, chatId, message, text) {
    const startTime = Date.now();
    const timeoutMs = 90000; // 90 seconds timeout
    
    return new Promise(async (resolve) => {
        const timeoutId = setTimeout(() => {
            logError(`⏰ Command ${commandName} timed out after ${timeoutMs}ms`);
            try {
                sendTelegramMessage(chatId, `⏰ *Command timeout!*\n\nCommand "${commandName}" took too long. Try again later.`, {}, message.id);
            } catch (e) {}
            resolve(false);
        }, timeoutMs);
        
        try {
            // Execute command with try-catch wrapper
            const result = await commandFn(sock, chatId, message, text);
            
            clearTimeout(timeoutId);
            const execTime = Date.now() - startTime;
            logDebug(`⚡ ${commandName} executed in ${execTime}ms`);
            resolve(result !== false);
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Log detailed error
            logError(`💥 Command ${commandName} error: ${error.message}`);
            
            // Check for specific errors
            let userMsg = `❌ *Command Error!*\n\n📛 *Command:* ${commandName}\n`;
            
            if (error.message.includes('baileys') || error.message.includes('interactive')) {
                userMsg += `⚠️ *Issue:* Baileys dependency error\n`;
                userMsg += `💡 *Fix:* Reinstall Baileys: \`npm install @whiskeysockets/baileys@latest\`\n`;
            } else if (error.message.includes('timeout')) {
                userMsg += `⏰ *Issue:* Command timed out\n`;
                userMsg += `💡 *Tip:* Try again later\n`;
            } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
                userMsg += `🌐 *Issue:* Network error\n`;
                userMsg += `💡 *Tip:* Check your connection\n`;
            } else {
                userMsg += `⚠️ *Error:* ${error.message.substring(0, 300)}\n`;
            }
            
            try {
                await sendTelegramMessage(chatId, userMsg, {}, message.id);
            } catch (e) {
                logError(`Error notification failed: ${e.message}`);
            }
            resolve(false);
        }
    });
}

// ============================================================
// 🚀 MAIN UPDATE HANDLER WITH ULTIMATE ERROR HANDLING
// ============================================================

async function handleUpdate(update) {
    try {
        // Handle callback queries
        if (update.callback_query) {
            const callback = update.callback_query;
            const chatId = callback.message?.chat?.id;
            if (!chatId) return;
            
            try {
                const token = settings.telegram?.botToken?.trim();
                if (token) {
                    await axios.post(`${TELEGRAM_BASE_URL(token)}/answerCallbackQuery`, {
                        callback_query_id: callback.id
                    }, AXIOS_DEFAULTS);
                }
            } catch (e) {
                logError(`Callback error: ${e.message}`);
            }
            return;
        }

        const message = update.message || update.edited_message;
        if (!message) return;

        const chatId = message.chat?.id;
        const messageId = message.message_id;
        const sender = message.from;
        const rawText = String(message.text || '').trim();

        if (!chatId || !sender) {
            logWarning('Invalid message: missing chatId or sender');
            return;
        }

        const sendMsg = async (id, txt, extra = {}, msgId = messageId) => {
            try {
                return await sendTelegramMessage(id, txt, extra, msgId);
            } catch (error) {
                logError(`sendMsg error: ${error.message}`);
                return false;
            }
        };

        // Only process commands
        if (!rawText.startsWith('/') && !rawText.startsWith('.')) return;

        const cleanText = rawText.substring(1);
        const parts = cleanText.split(/\s+/);
        const commandText = parts[0].toLowerCase();
        const args = parts.slice(1);

        const allowed = isTelegramAuthorized(chatId);

        // ============================================================
        // 📝 INTERNAL COMMANDS
        // ============================================================
        
        if (commandText === 'pair') {
            await handlePairCommand(chatId, args, sendMsg);
            return;
        }

        // ============================================================
        // 🔍 HELP & INFO COMMANDS (Built-in fallbacks)
        // ============================================================
        
        if (commandText === 'start' || commandText === 'menu' || commandText === 'help') {
            const helpText = `🤖 *MICKEY GLITCH BOT*\n\n` +
                            `📌 *Available Commands:*\n` +
                            `┣ /pair <number> - Pair WhatsApp\n` +
                            `┣ /help - Show this menu\n` +
                            `┣ /ping - Check bot status\n` +
                            `┣ /alive - System health\n` +
                            `┗ /owner - Developer info\n\n` +
                            `📂 *More commands:* ${whatsappCommands.size} loaded\n` +
                            `💡 Type any command from the /commands folder`;
            await sendMsg(chatId, helpText);
            return;
        }

        if (commandText === 'ping') {
            const startTime = Date.now();
            await sendMsg(chatId, '🏓 *Pong!*');
            const latency = Date.now() - startTime;
            await sendMsg(chatId, `⏱️ *Latency:* ${latency}ms\n✅ *Status:* Online`);
            return;
        }

        if (commandText === 'alive') {
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const uptime = Math.floor(process.uptime());
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            const pairedChats = loadAllowedChats().length;
            
            const aliveMsg = `✅ *MICKEY GLITCH BOT - ONLINE!*\n\n` +
                            `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
                            `💾 *RAM:* ${ramUsage} MB\n` +
                            `👥 *Paired Chats:* ${pairedChats}\n` +
                            `📂 *Commands:* ${whatsappCommands.size}\n` +
                            `⚡ *Status:* All systems operational\n\n` +
                            `📅 ${new Date().toLocaleString()}`;
            await sendMsg(chatId, aliveMsg);
            return;
        }

        if (commandText === 'owner') {
            const ownerMsg = `👑 *OWNER INFO*\n\n` +
                            `📛 *Name:* ${settings.botOwner || 'Mickey Developer'}\n` +
                            `📱 *WhatsApp:* wa.me/${settings.ownerNumber || '255612130873'}\n` +
                            `📢 *Channel:* t.me/mickeyglitch\n` +
                            `💻 *GitHub:* github.com/Mickeydeveloper\n\n` +
                            `⚡ *Mickey Glitch Bot*`;
            await sendMsg(chatId, ownerMsg);
            return;
        }

        // ============================================================
        // 🔐 AUTHORIZATION CHECK
        // ============================================================
        
        if (!allowed) {
            return sendMsg(chatId, '⚠️ *Chat not paired!*\n\nPlease use `/pair <number>` to connect your WhatsApp.');
        }

        // ============================================================
        // 🎯 LOAD AND EXECUTE COMMANDS
        // ============================================================
        
        if (whatsappCommands.has(commandText)) {
            try {
                const commandFn = whatsappCommands.get(commandText);
                
                if (typeof commandFn !== 'function') {
                    throw new Error(`Command ${commandText} is not a valid function`);
                }
                
                const tgSock = createTelegramSock(chatId, messageId);
                
                // Enhanced mock message for better compatibility
                const mockMsg = {
                    key: { 
                        remoteJid: chatId, 
                        fromMe: false, 
                        id: messageId,
                        participant: sender.id || sender.username,
                        mentionedJid: []
                    },
                    pushName: sender.first_name || sender.username || 'Telegram User',
                    message: { conversation: rawText },
                    quoted: message.reply_to_message ? {
                        key: { remoteJid: chatId, fromMe: false, id: message.reply_to_message.message_id },
                        pushName: message.reply_to_message.from?.first_name || 'Unknown',
                        message: { conversation: message.reply_to_message.text || '' }
                    } : null,
                    id: messageId,
                    sender: sender,
                    chat: message.chat,
                    from: chatId,
                    body: rawText,
                    fromMe: false,
                    isGroup: message.chat?.type === 'group' || message.chat?.type === 'supergroup',
                    participant: sender.id || sender.username,
                    // Additional properties for compatibility
                    message_id: messageId,
                    timestamp: Math.floor(Date.now() / 1000),
                    isBot: false
                };

                logDebug(`▶️ Executing command: ${commandText} from chat: ${chatId}`);
                
                // Execute command with safety
                await safeExecuteCommand(commandText, commandFn, tgSock, chatId, mockMsg, rawText);
                return;
            } catch (err) {
                logError(`💥 Bridge Error (${commandText}): ${err.message}`);
                await sendMsg(chatId, `❌ *Command execution failed*\n\n📛 ${err.message.substring(0, 200)}`);
                return;
            }
        }

        // ============================================================
        // ❌ COMMAND NOT FOUND
        // ============================================================
        
        // Suggest similar commands
        const suggestions = [];
        for (const [cmdName] of whatsappCommands) {
            if (cmdName.startsWith(commandText.substring(0, 2)) || 
                commandText.startsWith(cmdName.substring(0, 2))) {
                suggestions.push(cmdName);
            }
        }
        
        let errorMsg = `❌ *Command '${commandText}' not found*\n\n`;
        if (suggestions.length > 0) {
            errorMsg += `💡 *Did you mean:* ${suggestions.slice(0, 5).map(s => `\`${s}\``).join(', ')}\n\n`;
        }
        
        // Show available commands
        const cmdList = Array.from(whatsappCommands.keys());
        if (cmdList.length > 0) {
            errorMsg += `📂 *Available commands (${cmdList.length}):*\n`;
            const displayCmds = cmdList.slice(0, 10);
            errorMsg += displayCmds.map(c => `┣ \`${c}\``).join('\n');
            if (cmdList.length > 10) {
                errorMsg += `\n┗ ... and ${cmdList.length - 10} more`;
            }
        } else {
            errorMsg += `📂 *No commands loaded.* Please check the /commands folder.`;
        }
        
        await sendMsg(chatId, errorMsg);
        
    } catch (error) {
        logError(`💥 Update handling error: ${error.message}`);
        logError(error.stack);
        try {
            const chatId = update.message?.chat?.id;
            if (chatId) {
                await sendTelegramMessage(chatId, '❌ *System Error!*\n\nAn unexpected error occurred. Please try again later.');
            }
        } catch (e) {
            logError(`Final error handler failed: ${e.message}`);
        }
    }
}

// ============================================================
// 🚀 START TELEGRAM BOT
// ============================================================

async function startTelegramBot() {
    if (isTelegramBotRunning) {
        logInfo('Telegram bot is already running.');
        return { sendMessage: sendTelegramMessage };
    }

    const token = settings.telegram?.botToken?.trim();
    if (!token) { 
        logError('❌ Telegram botToken not found in settings.js'); 
        return null; 
    }

    ensureTelegramDataFile();
    loadWhatsappCommands();
    await removeWebhookIfSet(token);
    
    logSuccess('🚀 Telegram bot starting...');
    logInfo(`📂 Loaded ${whatsappCommands.size} commands from /commands folder`);
    logInfo('🔐 Only /pair command is handled internally');
    logInfo('📱 All other commands are loaded from /commands folder');
    
    let offset = 0;
    let pollingErrors = 0;
    const maxPollingErrors = 10;
    
    const pollUpdates = async () => {
        try {
            const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
                params: { 
                    timeout: 30, 
                    offset: offset + 1,
                    allowed_updates: ['message', 'edited_message', 'callback_query']
                },
                ...AXIOS_DEFAULTS
            });
            
            pollingErrors = 0;
            
            const updates = response.data.result;
            if (updates && updates.length > 0) {
                logDebug(`📨 Processing ${updates.length} updates`);
                for (const update of updates) {
                    try {
                        await handleUpdate(update);
                        offset = update.update_id;
                    } catch (err) {
                        logError(`Update processing error: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            pollingErrors++;
            logError(`Polling error (${pollingErrors}/${maxPollingErrors}): ${err.message}`);
            
            if (pollingErrors >= maxPollingErrors) {
                logError('⚠️ Too many polling errors. Bot might be offline.');
            }
        }
        
        const interval = pollingErrors > 5 ? 5000 : 1000;
        setTimeout(pollUpdates, interval);
    };
    
    pollUpdates();
    
    // Send startup notification
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    if (ownerId) {
        try {
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const startMsg = "✅ *MICKEY GLITCH BOT STARTED!*\n\n" +
                            "🟢 *Status:* Online\n" +
                            `💾 *RAM:* ${ramUsage} MB\n` +
                            `📂 *Commands:* ${whatsappCommands.size} loaded\n` +
                            `👥 *Paired Chats:* ${loadAllowedChats().length}\n` +
                            `📅 *Time:* ${new Date().toLocaleString()}\n\n` +
                            "⚡ *Ready to serve!*";
            await sendTelegramMessage(ownerId, startMsg);
        } catch (e) {
            logError(`Startup notification failed: ${e.message}`);
        }
    }
    
    isTelegramBotRunning = true;
    logSuccess('✅ Telegram bot is running!');
    return { sendMessage: sendTelegramMessage };
}

module.exports = { startTelegramBot, isTelegramBotRunning };