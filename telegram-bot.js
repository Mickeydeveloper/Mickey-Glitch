/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH
 * Enhanced: Better error handling for WhatsApp commands in Telegram
 * Fixed: Command execution safety, timeout handling, and fallback mechanisms
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

// Store active pairing sessions
const activePairingSessions = new Map();
const whatsappCommands = new Map();
const commandExecutionTimeouts = new Map();

// Default axios config
const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

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
// 🛠️ ENHANCED TELEGRAM SOCK WITH ERROR HANDLING
// ============================================================

/**
 * Inatengeneza "Fake Sock" ili amri za WhatsApp zifanye kazi Telegram
 * Imeongezwa error handling na validation
 */
function createTelegramSock(chatId, messageId) {
    return {
        sendMessage: async (jid, content, options = {}) => {
            try {
                const id = String(jid);
                
                // Validate content
                if (!content || typeof content !== 'object') {
                    throw new Error('Invalid content format');
                }
                
                // Handle different message types
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
                } else {
                    // Fallback: try to send as text
                    const text = typeof content === 'string' ? content : JSON.stringify(content);
                    return await sendTelegramMessage(id, text, {}, messageId);
                }
            } catch (error) {
                logError(`[Sock.sendMessage] Error: ${error.message}`);
                // Try to send error message to user
                try {
                    await sendTelegramMessage(String(jid), `❌ *Error sending message:* ${error.message}`, {}, messageId);
                } catch (e) {
                    logError(`[Sock.sendMessage] Fallback error: ${e.message}`);
                }
                return false;
            }
        },
        
        sendMessageAck: async () => {
            // Simulate acknowledgment
            return true;
        },
        
        react: async (jid, { text }) => {
            try {
                // Send emoji reaction as text message
                return await sendTelegramMessage(String(jid), text, {}, messageId);
            } catch (error) {
                logError(`[Sock.react] Error: ${error.message}`);
                return false;
            }
        },
        
        // Additional WhatsApp methods that might be called
        sendPresenceUpdate: async () => true,
        readMessages: async () => true,
        updateMessage: async () => true,
        
        // Logger for commands
        logger: {
            info: logInfo,
            error: logError,
            warn: logWarning,
            debug: logDebug
        }
    };
}

// ============================================================
// 📁 ENHANCED COMMAND LOADER WITH VALIDATION
// ============================================================

/**
 * Inapakia na kuthibitisha amri zote kutoka kwenye folder la commands
 * Imeongezwa validation na error handling
 */
function loadWhatsappCommands() {
    const commandsDir = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsDir)) {
        logWarning('Commands folder not found. Creating empty commands directory...');
        try {
            fs.mkdirSync(commandsDir, { recursive: true });
        } catch (e) {
            logError(`Failed to create commands directory: ${e.message}`);
        }
        return;
    }

    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    whatsappCommands.clear();
    
    if (files.length === 0) {
        logWarning('No command files found in /commands folder');
        return;
    }
    
    for (const file of files) {
        try {
            const baseName = file.replace('.js', '');
            const filePath = path.join(commandsDir, file);
            
            // Clear cache to reload if file changed
            delete require.cache[require.resolve(filePath)];
            const cmdModule = require(filePath);
            
            // Validate and load command
            let commandName = null;
            let commandFunction = null;
            
            // Check if it's a function
            if (typeof cmdModule === 'function') {
                commandName = baseName;
                commandFunction = cmdModule;
            } 
            // Check if it has a name property and execute function
            else if (cmdModule && typeof cmdModule === 'object') {
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
                    // Try to use the object itself as a function
                    commandName = baseName;
                    commandFunction = cmdModule;
                }
            }
            
            // Validate command
            if (commandName && typeof commandFunction === 'function') {
                whatsappCommands.set(commandName, commandFunction);
                logDebug(`Loaded command: ${commandName} from ${file}`);
            } else {
                logWarning(`Skipping ${file}: No valid command function found`);
            }
        } catch (e) {
            logError(`Failed to load command ${file}: ${e.message}`);
        }
    }
    logSuccess(`Loaded ${whatsappCommands.size} WhatsApp commands from /commands folder`);
}

// ============================================================
// 📱 TELEGRAM MEDIA FUNCTIONS WITH ERROR HANDLING
// ============================================================

async function sendTelegramMessage(chatId, text, extra = {}, messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) {
        logError('Missing token or chatId for sendTelegramMessage');
        return false;
    }
    
    try {
        // Ensure text is string and not too long
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
        // Handle specific error cases
        if (error.response?.statusCode === 403) {
            logError(`Bot blocked by user: ${chatId}`);
        } else if (error.response?.statusCode === 400) {
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
        // Fallback: try to send as text with URL
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
            reply_to_message_id: messageId
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 120000 // 2 minutes for media
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send media error: ${error.message}`);
        // Fallback: send link
        try {
            await sendTelegramMessage(chatId, `🎵 *Media Link:* ${url}\n${caption}`, {}, messageId);
        } catch (e) {
            logError(`Media fallback error: ${e.message}`);
        }
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
        return sendMessage(chatId, '⏳ *Pairing already in progress!*\n\nPlease wait for the current pairing to complete.');
    }

    await sendMessage(chatId, `🔐 *GENERATING PAIRING CODE...*\n\n📱 *Number:* +${cleanNumber}\n⏱️ *Time:* 15-30 seconds\n\n⏳ Please wait...`);

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
                              `✅ *Bot will connect automatically!*\n` +
                              `⏳ Connection may take 10-30 seconds.`;

            await sendMessage(chatId, successMsg);

            const ownerId = String(settings.telegram?.ownerId || '').trim();
            if (ownerId && ownerId !== chatId) {
                await sendMessage(ownerId, `🔔 *New Pairing Request*\n👤 Chat ID: \`${chatId}\`\n📱 Number: +${cleanNumber}\n✅ Status: Success\n🔑 Code: \`${result.pairingCode}\``);
            }
        } else {
            await sendMessage(chatId, '❌ *FAILED TO GET CODE!*\n\nPlease try again later.');
        }
    } catch (error) {
        logError(`Pairing Error: ${error.message}`);
        await sendMessage(chatId, `❌ *PAIRING FAILED!*\n\n📛 Error: ${error.message}\n\nPlease try again later.`);
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
// 🛡️ COMMAND EXECUTION WITH SAFETY FEATURES
// ============================================================

/**
 * Execute WhatsApp command with timeout and error handling
 */
async function executeWhatsAppCommand(commandName, commandFn, sock, chatId, message, text) {
    const startTime = Date.now();
    const timeoutMs = 60000; // 60 seconds timeout
    
    return new Promise(async (resolve) => {
        // Set timeout for command execution
        const timeoutId = setTimeout(() => {
            logError(`Command ${commandName} timed out after ${timeoutMs}ms`);
            try {
                sendTelegramMessage(chatId, `⏰ *Command timeout!*\n\nCommand "${commandName}" took too long to execute.`, {}, message.id);
            } catch (e) {
                logError(`Timeout notification failed: ${e.message}`);
            }
            resolve(false);
        }, timeoutMs);
        
        try {
            // Execute the command
            const result = await commandFn(sock, chatId, message, text);
            
            clearTimeout(timeoutId);
            const executionTime = Date.now() - startTime;
            logDebug(`Command ${commandName} executed in ${executionTime}ms`);
            resolve(result !== false);
        } catch (error) {
            clearTimeout(timeoutId);
            logError(`Command ${commandName} execution error: ${error.message}`);
            
            // Send error to user
            try {
                const errorMsg = `❌ *Command Error!*\n\n` +
                                `📛 *Command:* ${commandName}\n` +
                                `⚠️ *Error:* ${error.message.substring(0, 300)}`;
                await sendTelegramMessage(chatId, errorMsg, {}, message.id);
            } catch (e) {
                logError(`Error notification failed: ${e.message}`);
            }
            resolve(false);
        }
    });
}

// ============================================================
// 🚀 MAIN UPDATE HANDLER WITH ENHANCED ERROR HANDLING
// ============================================================

async function handleUpdate(update) {
    try {
        // Handle callback queries
        if (update.callback_query) {
            const callback = update.callback_query;
            const chatId = callback.message?.chat?.id;
            const messageId = callback.message?.message_id;
            const data = callback.data;
            
            if (!chatId) return;
            
            // Handle callback data
            try {
                const token = settings.telegram?.botToken?.trim();
                if (token) {
                    await axios.post(`${TELEGRAM_BASE_URL(token)}/answerCallbackQuery`, {
                        callback_query_id: callback.id
                    }, AXIOS_DEFAULTS);
                }
                
                // Process callback if needed
                // You can add callback handlers here
            } catch (e) {
                logError(`Callback handling error: ${e.message}`);
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

        // Only process commands starting with / or .
        if (!rawText.startsWith('/') && !rawText.startsWith('.')) return;

        const cleanText = rawText.substring(1);
        const parts = cleanText.split(/\s+/);
        const commandText = parts[0].toLowerCase();
        const args = parts.slice(1);

        const allowed = isTelegramAuthorized(chatId);
        const isActiveOwner = isOwnerChat(chatId);

        // ============================================================
        // 📝 INTERNAL COMMANDS (Only /pair is handled internally)
        // ============================================================
        
        if (commandText === 'pair') {
            await handlePairCommand(chatId, args, sendMsg);
            return;
        }

        // For all other commands, check if chat is authorized
        if (!allowed) {
            return sendMsg(chatId, '⚠️ *Chat not paired!*\n\nPlease use `/pair <number>` to connect your WhatsApp.');
        }

        // ============================================================
        // 🎯 LOAD AND EXECUTE COMMANDS FROM /commands FOLDER
        // ============================================================
        
        // Check if command exists in the commands folder
        if (whatsappCommands.has(commandText)) {
            try {
                const commandFn = whatsappCommands.get(commandText);
                
                // Validate command function
                if (typeof commandFn !== 'function') {
                    throw new Error(`Command ${commandText} is not a valid function`);
                }
                
                // Create Telegram sock
                const tgSock = createTelegramSock(chatId, messageId);
                
                // Create mock WhatsApp message object
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
                    // Extra properties for compatibility
                    fromMe: false,
                    isGroup: message.chat?.type === 'group' || message.chat?.type === 'supergroup',
                    participant: sender.id || sender.username
                };

                logDebug(`Executing command: ${commandText} from chat: ${chatId}`);
                
                // Execute command with safety features
                await executeWhatsAppCommand(commandText, commandFn, tgSock, chatId, mockMsg, rawText);
                return;
            } catch (err) {
                logError(`Bridge Error (${commandText}): ${err.message}`);
                await sendMsg(chatId, `❌ *Error executing command:* ${err.message.substring(0, 200)}`);
                return;
            }
        }

        // Command not found
        if (rawText.startsWith('/') || rawText.startsWith('.')) {
            // Suggest similar commands
            const suggestions = [];
            for (const [cmdName] of whatsappCommands) {
                if (cmdName.startsWith(commandText.substring(0, 2))) {
                    suggestions.push(cmdName);
                }
            }
            
            let errorMsg = `❌ *Command '${commandText}' not found.*\n\n`;
            if (suggestions.length > 0) {
                errorMsg += `💡 *Did you mean:* ${suggestions.slice(0, 5).map(s => `\`${s}\``).join(', ')}\n\n`;
            }
            errorMsg += `📂 *Available commands:*\n`;
            const cmds = Array.from(whatsappCommands.keys()).slice(0, 15);
            errorMsg += cmds.map(c => `┣ \`${c}\``).join('\n');
            if (whatsappCommands.size > 15) {
                errorMsg += `\n┗ ... and ${whatsappCommands.size - 15} more`;
            }
            
            return sendMsg(chatId, errorMsg);
        }
    } catch (error) {
        logError(`Update handling error: ${error.message}`);
        // Try to notify user
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
    // Check if bot is already running
    if (isTelegramBotRunning) {
        logInfo('Telegram bot is already running.');
        return { sendMessage: sendTelegramMessage };
    }

    const token = settings.telegram?.botToken?.trim();
    if (!token) { 
        logError('Telegram botToken not found in settings.js'); 
        return null; 
    }

    ensureTelegramDataFile();
    loadWhatsappCommands();
    await removeWebhookIfSet(token);
    
    logSuccess('Telegram bot starting...');
    logInfo(`Loaded ${whatsappCommands.size} commands from /commands folder`);
    logInfo('Only /pair command is handled internally');
    logInfo('All other commands are loaded from /commands folder');
    
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
            
            // Reset error counter on success
            pollingErrors = 0;
            
            const updates = response.data.result;
            if (updates && updates.length > 0) {
                logDebug(`Processing ${updates.length} updates`);
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
                logError('Too many polling errors. Bot might be offline or token invalid.');
                // Don't stop, just continue with longer delay
            }
        }
        
        // Adaptive polling interval
        const interval = pollingErrors > 5 ? 5000 : 1000;
        setTimeout(pollUpdates, interval);
    };
    
    // Start polling
    pollUpdates();
    
    // Send startup notification to owner
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    if (ownerId) {
        try {
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const startMsg = "✅ *MICKEY GLITCH BOT STARTED!*\n\n" +
                            "🟢 *Status:* Online\n" +
                            `💾 *RAM:* ${ramUsage} MB\n` +
                            `📂 *Commands Loaded:* ${whatsappCommands.size}\n` +
                            `👥 *Paired Chats:* ${loadAllowedChats().length}\n` +
                            `📅 *Time:* ${new Date().toLocaleString()}\n\n` +
                            "⚡ *Ready to serve!*";
            await sendTelegramMessage(ownerId, startMsg);
        } catch (e) {
            logError(`Startup notification failed: ${e.message}`);
        }
    }
    
    // Set the flag to true after successful startup
    isTelegramBotRunning = true;
    logSuccess('Telegram bot is running!');
    return { sendMessage: sendTelegramMessage };
}

module.exports = { startTelegramBot, isTelegramBotRunning };