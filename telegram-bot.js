/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH
 * Fixed: Uses commands from /commands folder only
 * Only /pair command is handled internally for WhatsApp pairing
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
// 🛠️ COMMAND BRIDGE (WHATSAPP TO TELEGRAM)
// ============================================================

/**
 * Inatengeneza "Fake Sock" ili amri za WhatsApp zifanye kazi Telegram
 */
function createTelegramSock(chatId, messageId) {
    return {
        sendMessage: async (jid, content, options = {}) => {
            const id = String(jid);
            if (content.text) {
                return await sendTelegramMessage(id, content.text, {}, messageId);
            } else if (content.image) {
                const url = content.image.url || content.image;
                return await sendTelegramPhoto(id, url, content.caption || '', messageId);
            } else if (content.audio) {
                const url = content.audio.url || content.audio;
                return await sendTelegramMedia(id, 'audio', url, content.caption || '', messageId);
            } else if (content.video) {
                const url = content.video.url || content.video;
                return await sendTelegramMedia(id, 'video', url, content.caption || '', messageId);
            }
        },
        sendMessageAck: async () => {},
        react: async (jid, { text }) => {
            return await sendTelegramMessage(jid, text, {}, messageId);
        }
    };
}

/**
 * Inapakia amri zote kutoka kwenye folder la commands
 */
function loadWhatsappCommands() {
    const commandsDir = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsDir)) {
        logWarning('Commands folder not found. Creating empty commands directory...');
        fs.mkdirSync(commandsDir, { recursive: true });
        return;
    }

    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    whatsappCommands.clear();
    
    for (const file of files) {
        try {
            const baseName = file.replace('.js', '');
            // Clear cache to reload if file changed
            delete require.cache[require.resolve(path.join(commandsDir, file))];
            const cmdModule = require(path.join(commandsDir, file));
            
            // Check if it's a function (like alive.js or text.js)
            if (typeof cmdModule === 'function') {
                whatsappCommands.set(baseName, cmdModule);
                logDebug(`Loaded command: ${baseName} (function)`);
            } 
            // Check if it has a name property and execute function
            else if (cmdModule.name && typeof cmdModule.execute === 'function') {
                whatsappCommands.set(cmdModule.name, cmdModule.execute);
                logDebug(`Loaded command: ${cmdModule.name} (object with execute)`);
            }
            // Fallback to file name
            else if (typeof cmdModule === 'object' && cmdModule !== null) {
                // Try to find execute function
                if (typeof cmdModule.execute === 'function') {
                    whatsappCommands.set(baseName, cmdModule.execute);
                    logDebug(`Loaded command: ${baseName} (execute function)`);
                } else {
                    // Assume the object itself is callable or has a default export
                    whatsappCommands.set(baseName, cmdModule);
                    logDebug(`Loaded command: ${baseName} (object)`);
                }
            }
        } catch (e) {
            logError(`Failed to load command ${file}: ${e.message}`);
        }
    }
    logSuccess(`Loaded ${whatsappCommands.size} WhatsApp commands from /commands folder`);
}

// Global flag to track if Telegram bot is running
let isTelegramBotRunning = false;

// ============================================================
// 📱 TELEGRAM MEDIA FUNCTIONS
// ============================================================

async function sendTelegramMessage(chatId, text, extra = {}, messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
            chat_id: String(chatId),
            text: text,
            disable_web_page_preview: true,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId,
            ...extra
        }, AXIOS_DEFAULTS);
        return true;
    } catch (error) {
        logError(`Send message error: ${error.message}`);
        return false;
    }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: photoUrl,
            caption: caption,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId
        }, AXIOS_DEFAULTS);
        return true;
    } catch (error) {
        logError(`Send photo error: ${error.message}`);
        return false;
    }
}

async function sendTelegramMedia(chatId, type, url, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;
    const endpoint = type === 'audio' ? 'sendAudio' : 'sendVideo';
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/${endpoint}`, {
            chat_id: String(chatId),
            [type]: url,
            caption: caption,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId
        }, AXIOS_DEFAULTS);
        return true;
    } catch (error) {
        logError(`Send media error: ${error.message}`);
        await sendTelegramMessage(chatId, `❌ Failed to send ${type}. File may be too large.`);
        return false;
    }
}

// ============================================================
// 🔐 PAIRING FUNCTIONS (Only internal command)
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
        await sendMessage(chatId, '❌ *PAIRING FAILED!*\n\nPlease try again later.');
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
    const unique = Array.from(new Set(chats.map(id => String(id))));
    fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
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
// 🚀 MAIN UPDATE HANDLER
// ============================================================

async function handleUpdate(update) {
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat?.id;
    const messageId = message.message_id;
    const sender = message.from;
    const rawText = String(message.text || '').trim();

    const sendMsg = async (id, txt, extra = {}, msgId = messageId) => sendTelegramMessage(id, txt, extra, msgId);

    // Handle callback queries if any
    if (update.callback_query) {
        // You can add callback handling here if needed
        return;
    }

    // Only process commands starting with / or .
    if (!rawText.startsWith('/') && !rawText.startsWith('.')) return;

    const cleanText = rawText.substring(1);
    const parts = cleanText.split(/\s+/);
    const commandText = parts[0].toLowerCase();
    const args = parts.slice(1);
    const fullArgs = args.join(' ');

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
            const cmd = whatsappCommands.get(commandText);
            const tgSock = createTelegramSock(chatId, messageId);
            
            // Create mock WhatsApp message object
            const mockMsg = {
                key: { remoteJid: chatId, fromMe: false, id: messageId },
                pushName: sender.first_name || sender.username || 'Telegram User',
                message: { conversation: rawText },
                quoted: message.reply_to_message || null
            };

            // Execute the command
            await cmd(tgSock, chatId, mockMsg, rawText);
            return;
        } catch (err) {
            logError(`Bridge Error (${commandText}): ${err.message}`);
            await sendMsg(chatId, `❌ *Error executing command:* ${err.message}`);
            return;
        }
    }

    // Command not found
    if (rawText.startsWith('/') || rawText.startsWith('.')) {
        return sendMsg(chatId, `❌ Command '${commandText}' not found.\n\n📂 Available commands are in the /commands folder.\nUse /menu to see available commands.`);
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
    
    let offset = 0;
    
    const pollUpdates = async () => {
        try {
            const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
                params: { timeout: 30, offset: offset + 1 },
                ...AXIOS_DEFAULTS
            });
            
            const updates = response.data.result;
            for (const update of updates) {
                await handleUpdate(update);
                offset = update.update_id;
            }
        } catch (err) {
            logError(`Polling error: ${err.message}`);
        }
        
        setTimeout(pollUpdates, 1000);
    };
    
    pollUpdates();
    
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    if (ownerId) {
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const startMsg = "✅ *MICKEY GLITCH BOT STARTED!*\n\n" +
                        "🟢 *Status:* Online\n" +
                        `💾 *RAM:* ${ramUsage} MB\n` +
                        `📂 *Commands Loaded:* ${whatsappCommands.size}\n` +
                        `📅 *Time:* ${new Date().toLocaleString()}`;
        await sendTelegramMessage(ownerId, startMsg);
    }
    
    // Set the flag to true after successful startup
    isTelegramBotRunning = true;
    logSuccess('Telegram bot is running!');
    return { sendMessage: sendTelegramMessage };
}

module.exports = { startTelegramBot, isTelegramBotRunning };