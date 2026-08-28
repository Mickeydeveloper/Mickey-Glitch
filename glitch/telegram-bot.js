/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH ULTIMATE
 * Version 2.0 - Fully Enhanced with Real Telegram Polling Engine & Auto-Start
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const os = require('os');
const { performance } = require('perf_hooks');
const settings = require('../settings');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const FormData = require('form-data');

// ============================================================
// 📁 DIRECTORIES & CONFIGURATION
// ============================================================
const TELEGRAM_DATA_DIR = path.join(__dirname, '..', 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;
const TEMP_DIR = path.join(__dirname, '..', 'tmp');
const COMMANDS_DIR = path.join(__dirname, '..', 'commands');
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Store active pairing sessions and states
const activePairingSessions = new Map();
const whatsappCommands = new Map();
const commandCache = new Map();
const rateLimiter = new Map();

let isPollingActive = false;
let pollingOffset = 0;

// Default axios config with retry
const AXIOS_DEFAULTS = {
    timeout: 120000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
    }
};

// Ensure directories exist
const dirs = [TEMP_DIR, COMMANDS_DIR, CACHE_DIR, LOGS_DIR];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============================================================
// 🎨 ENHANCED COLORED LOGGING WITH TIMESTAMPS
// ============================================================
const colors = {
    green: (t) => `\x1b[32m${t}\x1b[0m`,
    red: (t) => `\x1b[31m${t}\x1b[0m`,
    yellow: (t) => `\x1b[33m${t}\x1b[0m`,
    blue: (t) => `\x1b[34m${t}\x1b[0m`,
    cyan: (t) => `\x1b[36m${t}\x1b[0m`,
    magenta: (t) => `\x1b[35m${t}\x1b[0m`,
    white: (t) => `\x1b[37m${t}\x1b[0m`,
    gray: (t) => `\x1b[90m${t}\x1b[0m`
};

function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function logSuccess(text) { console.log(colors.green(`[${getTimestamp()}] ✅ ${text}`)); }
function logError(text) { console.log(colors.red(`[${getTimestamp()}] ❌ ${text}`)); }
function logWarning(text) { console.log(colors.yellow(`[${getTimestamp()}] ⚠️ ${text}`)); }
function logInfo(text) { console.log(colors.blue(`[${getTimestamp()}] ℹ️ ${text}`)); }
function logDebug(text) { console.log(colors.cyan(`[${getTimestamp()}] 🐛 ${text}`)); }
function logSystem(text) { console.log(colors.magenta(`[${getTimestamp()}] ⚙️ ${text}`)); }

// ============================================================
// 📋 FORMATTING UTILITIES
// ============================================================
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}ᴅ`);
    if (h > 0) parts.push(`${h}ʜ`);
    if (m > 0) parts.push(`${m}ᴍ`);
    parts.push(`${s}ꜱ`);

    return parts.join(' ');
};

const progressBar = (percentage, length = 10) => {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
};

const getSystemLoad = () => {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    return {
        '1m': (loadAvg[0] / cpuCount * 100).toFixed(1),
        '5m': (loadAvg[1] / cpuCount * 100).toFixed(1),
        '15m': (loadAvg[2] / cpuCount * 100).toFixed(1)
    };
};

// ============================================================
// 🛠️ TELEGRAM POLLING & LISTENER ENGINE
// ============================================================

async function startTelegramBot(providedSock = null) {
    const token = settings.telegram?.botToken?.trim();

    if (!token) {
        logError('Cannot start Telegram Bot: Token missing in settings.js!');
        return false;
    }

    if (isPollingActive) {
        logWarning('Telegram Bot polling is already active.');
        return true;
    }

    // Load WhatsApp commands into Telegram Bridge
    loadWhatsappCommands();

    try {
        // Test connection with Telegram API
        const meRes = await axios.get(`${TELEGRAM_BASE_URL(token)}/getMe`, { timeout: 10000 });
        if (!meRes.data || !meRes.data.ok) {
            logError('Telegram Bot Token is invalid!');
            return false;
        }

        const botInfo = meRes.data.result;
        logSuccess(`Telegram Bot Connected: @${botInfo.username} (${botInfo.first_name})`);

        isPollingActive = true;
        runTelegramPollingLoop(token, providedSock);
        return true;
    } catch (e) {
        logError(`Failed to start Telegram Bot: ${e.message}`);
        return false;
    }
}

async function runTelegramPollingLoop(token, sock) {
    while (isPollingActive) {
        try {
            const res = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
                params: {
                    offset: pollingOffset,
                    timeout: 20
                },
                timeout: 30000
            });

            if (res.data && res.data.ok && Array.isArray(res.data.result)) {
                for (const update of res.data.result) {
                    pollingOffset = update.update_id + 1;
                    handleTelegramUpdate(update, sock);
                }
            }
        } catch (err) {
            if (err.code !== 'ECONNABORTED') {
                logError(`Telegram polling loop error: ${err.message}`);
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
}

async function handleTelegramUpdate(update, sock) {
    try {
        const message = update.message || update.edited_message || update.callback_query?.message;
        if (!message) return;

        const chatId = message.chat.id;
        const text = update.message?.text || update.callback_query?.data || '';

        if (!text) return;

        // Check command
        if (text.startsWith('/') || text.startsWith('.')) {
            const tempSock = sock || createTelegramSock(chatId, message.message_id);
            await executeCommand(tempSock, chatId, message, text);
        }
    } catch (e) {
        logError(`Error handling update: ${e.message}`);
    }
}

// ============================================================
// 🎯 BUTTONS & MESSAGING UTILITIES
// ============================================================

async function sendTelegramButtons(chatId, text, buttons, options = {}) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
        const keyboard = { inline_keyboard: [] };

        if (Array.isArray(buttons)) {
            let row = [];
            for (const btn of buttons) {
                const button = {
                    text: btn.text || btn.label || btn.display_text || 'Button'
                };

                if (btn.buttonParamsJson) {
                    try {
                        const parsedParams = JSON.parse(btn.buttonParamsJson);
                        button.text = parsedParams.display_text || button.text;
                        button.callback_data = String(parsedParams.id || 'action_flow');
                    } catch (e) {
                        button.callback_data = 'action_flow_err';
                    }
                } else if (btn.url) {
                    button.url = btn.url;
                } else if (btn.callback_data) {
                    button.callback_data = String(btn.callback_data);
                } else if (btn.command) {
                    button.callback_data = String(btn.command);
                } else if (btn.id) {
                    button.callback_data = String(btn.id);
                } else {
                    button.callback_data = 'action_' + (button.text.toLowerCase().replace(/\s+/g, '_'));
                }

                row.push(button);
                if (row.length === 2) {
                    keyboard.inline_keyboard.push(row);
                    row = [];
                }
            }
            if (row.length > 0) keyboard.inline_keyboard.push(row);
        }

        const payload = {
            chat_id: String(chatId),
            text: text,
            parse_mode: 'HTML',
            reply_markup: keyboard,
            disable_web_page_preview: true,
            ...(options.reply_to_message_id && { reply_to_message_id: options.reply_to_message_id })
        };

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, payload, {
            ...AXIOS_DEFAULTS,
            timeout: 30000
        });

        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send buttons error: ${error.message}`);
        return await sendTelegramMessage(chatId, text, {}, options.reply_to_message_id);
    }
}

async function sendInteractiveMessage(sock, chatId, content, options = {}) {
    try {
        const text = content.text || '';
        const buttons = content.interactiveButtons || content.buttons || [];

        if (buttons.length > 0) {
            return await sendTelegramButtons(chatId, text, buttons, {
                reply_to_message_id: options.quoted?.message_id || options.reply_to_message_id
            });
        } else {
            return await sendTelegramMessage(chatId, text, {}, options.quoted?.message_id || options.reply_to_message_id);
        }
    } catch (error) {
        logError(`Send interactive error: ${error.message}`);
        return false;
    }
}

function createTelegramSock(chatId, messageId) {
    const token = settings.telegram?.botToken?.trim();
    const currentChatId = String(chatId);

    return {
        sendMessage: async (jid, content, options = {}) => {
            try {
                const id = String(jid || currentChatId);
                if (content.text) {
                    return await sendTelegramMessage(id, content.text, {}, messageId);
                } else if (content.image) {
                    const url = content.image.url || content.image;
                    return await sendTelegramPhoto(id, url, content.caption || '', messageId);
                } else if (content.audio) {
                    const url = content.audio.url || content.audio;
                    return await sendTelegramAudio(id, url, content.caption || '', messageId);
                } else if (content.video) {
                    const url = content.video.url || content.video;
                    return await sendTelegramVideo(id, url, content.caption || '', messageId);
                } else if (content.document) {
                    const url = content.document.url || content.document;
                    return await sendTelegramDocument(id, url, content.caption || '', messageId);
                } else {
                    const text = typeof content === 'string' ? content : JSON.stringify(content);
                    return await sendTelegramMessage(id, text.substring(0, 4000), {}, messageId);
                }
            } catch (error) {
                logError(`[Sock.sendMessage] Error: ${error.message}`);
                return false;
            }
        },
        sendMessageAck: async () => true,
        react: async (jid, { text }) => sendTelegramMessage(String(jid || currentChatId), text, {}, messageId),
        sendPresenceUpdate: async () => true,
        readMessages: async () => true,
        user: { id: 'telegram_bridge@s.whatsapp.net', name: 'Mickey Bridge' },
        getChatId: () => currentChatId,
        getMessageId: () => messageId
    };
}

// ============================================================
// 📁 COMMAND LOADER
// ============================================================

function normalizeCommandName(command) {
    if (typeof command !== 'string') return '';
    return command.trim().replace(/^[\/!.#]+/, '').toLowerCase();
}

function parseCommandText(text) {
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    const startsWithCommandPrefix = /^[/.!#]/.test(trimmed);
    if (!startsWithCommandPrefix) return null;

    const [rawCommand, ...rest] = trimmed.slice(1).split(/\s+/);
    const name = normalizeCommandName(rawCommand);
    if (!name) return null;

    return {
        name,
        args: rest.join(' ').trim(),
        raw: trimmed
    };
}

function collectCommandEntries(cmdModule, baseName) {
    const entries = [];
    const addEntry = (handler, name = baseName, aliases = [], config = {}) => {
        if (typeof handler !== 'function') return;
        const finalName = String(name || baseName || '').trim();
        if (!finalName || finalName === 'default') return;

        entries.push({
            execute: handler,
            name: finalName,
            aliases: Array.isArray(aliases) ? aliases : [],
            config: config || {}
        });
    };

    if (typeof cmdModule === 'function') {
        addEntry(cmdModule, baseName);
        return entries;
    }

    if (cmdModule && typeof cmdModule === 'object') {
        if (typeof cmdModule.execute === 'function') {
            addEntry(cmdModule.execute, cmdModule.name || baseName, cmdModule.aliases, cmdModule.config);
        } else if (typeof cmdModule.run === 'function') {
            addEntry(cmdModule.run, cmdModule.name || baseName, cmdModule.aliases, cmdModule.config);
        }
    }
    return entries;
}

function loadWhatsappCommands() {
    if (!fs.existsSync(COMMANDS_DIR)) return;

    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
    whatsappCommands.clear();

    for (const file of files) {
        try {
            const baseName = file.replace('.js', '');
            const filePath = path.join(COMMANDS_DIR, file);

            delete require.cache[require.resolve(filePath)];
            const cmdModule = require(filePath);
            const commandEntries = collectCommandEntries(cmdModule, baseName);

            for (const entry of commandEntries) {
                whatsappCommands.set(normalizeCommandName(entry.name), entry);
            }
        } catch (e) {
            logError(`Failed to load command ${file}: ${e.message}`);
        }
    }
    logSuccess(`Loaded ${whatsappCommands.size} commands for Telegram`);
}

async function sendTelegramMessage(chatId, text, options = {}, replyToMessageId = null) {
    const token = settings?.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
        const payload = {
            chat_id: String(chatId),
            text: String(text ?? '').slice(0, 4000),
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...options
        };

        if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, payload, AXIOS_DEFAULTS);
        return response?.data?.ok === true;
    } catch (error) {
        logError(`Telegram sendMessage failed: ${error?.message || error}`);
        return false;
    }
}

async function sendTelegramMedia(chatId, method, media, caption = '', replyToMessageId = null) {
    const token = settings?.telegram?.botToken?.trim();
    if (!token || !chatId || !media) return false;

    try {
        let body = {
            chat_id: String(chatId),
            caption: String(caption || '').slice(0, 1024),
            parse_mode: 'HTML',
            ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {})
        };

        if (typeof media === 'string' && /^https?:\/\//i.test(media)) {
            const field = method === 'sendPhoto' ? 'photo' : method === 'sendAudio' ? 'audio' : 'document';
            body[field] = media;
        }

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/${method}`, body, AXIOS_DEFAULTS);
        return response?.data?.ok === true;
    } catch (error) {
        logError(`Telegram ${method} failed: ${error?.message || error}`);
        return false;
    }
}

async function sendTelegramPhoto(chatId, photo, caption = '', replyToMessageId = null) {
    return sendTelegramMedia(chatId, 'sendPhoto', photo, caption, replyToMessageId);
}

async function sendTelegramAudio(chatId, audio, caption = '', replyToMessageId = null) {
    return sendTelegramMedia(chatId, 'sendAudio', audio, caption, replyToMessageId);
}

async function sendTelegramVideo(chatId, video, caption = '', replyToMessageId = null) {
    return sendTelegramMedia(chatId, 'sendVideo', video, caption, replyToMessageId);
}

async function sendTelegramDocument(chatId, document, caption = '', replyToMessageId = null) {
    return sendTelegramMedia(chatId, 'sendDocument', document, caption, replyToMessageId);
}

async function executeCommand(sock, chatId, message, commandText) {
    try {
        const parsed = parseCommandText(commandText || '');
        if (!parsed) return false;

        const target = whatsappCommands.get(parsed.name);
        if (!target || typeof target.execute !== 'function') return false;

        const result = await target.execute(sock, chatId, message, parsed.args || '', {
            senderId: message?.from?.id || chatId,
            chatId,
            telegram: true
        });
        return !!result;
    } catch (error) {
        logError(`Telegram command execution failed: ${error?.message || error}`);
        return false;
    }
}

function getBotName() {
    return String(settings?.botName || settings?.botname || 'MICKEY GLITCH');
}

function getFormattedDate(date = new Date()) {
    return new Date(date).toLocaleString();
}

function getNetworkStats() {
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime()
    };
}

async function aliveCommand(sock, chatId, message) {
    const text = `🟢 Telegram bridge is active & listening!\n\nServer: ${os.hostname()}\nUptime: ${formatUptime(os.uptime())}`;
    return sendTelegramMessage(chatId, text, {}, message?.message_id || null);
}

module.exports = {
    sendTelegramMessage,
    sendTelegramPhoto,
    sendTelegramAudio,
    sendTelegramVideo,
    sendTelegramDocument,
    sendTelegramButtons,
    sendInteractiveMessage,
    createTelegramSock,
    loadWhatsappCommands,
    executeCommand,
    whatsappCommands,
    startTelegramBot,
    colors,
    logSuccess,
    logError,
    logWarning,
    logInfo,
    logDebug,
    logSystem,
    aliveCommand,
    formatUptime,
    progressBar,
    getSystemLoad,
    getBotName,
    getFormattedDate,
    getNetworkStats
};
