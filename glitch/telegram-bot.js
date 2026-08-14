/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH ULTIMATE
 * Version 2.0 - Fully Enhanced with African Charts, Downloader, and AI Features
 * Autofix & Crash Prevention Enabled
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const os = require('os');
const { performance } = require('perf_hooks');
const settings = require('../settings');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
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

// Store active pairing sessions and command cache
const activePairingSessions = new Map();
const whatsappCommands = new Map();
const commandCache = new Map();
const rateLimiter = new Map();

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
// 🎯 ENHANCED BUTTONS AND INLINE KEYBOARDS
// ============================================================

async function sendTelegramButtons(chatId, text, buttons, options = {}) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
        const keyboard = {
            inline_keyboard: []
        };

        if (Array.isArray(buttons)) {
            let row = [];
            for (const btn of buttons) {
                const button = {
                    text: btn.text || btn.label || btn.display_text || 'Button'
                };

                // Autofix nativeflow button mapping to telegram inline callback
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
                } else if (btn.switch_inline_query) {
                    button.switch_inline_query = btn.switch_inline_query;
                } else {
                    button.callback_data = 'action_' + (button.text.toLowerCase().replace(/\s+/g, '_'));
                }

                row.push(button);

                if (row.length === 2) { // 2 Buttons per row looks cleaner on mobile devices
                    keyboard.inline_keyboard.push(row);
                    row = [];
                }
            }
            if (row.length > 0) {
                keyboard.inline_keyboard.push(row);
            }
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

// ============================================================
// 🛠️ ENHANCED TELEGRAM SOCK WITH MORE FEATURES
// ============================================================

function createTelegramSock(chatId, messageId) {
    const token = settings.telegram?.botToken?.trim();
    const currentChatId = String(chatId);

    const baseSock = {
        sendMessage: async (jid, content, options = {}) => {
            try {
                const id = String(jid || currentChatId);
                if (!content || typeof content !== 'object') {
                    throw new Error('Invalid content format');
                }

                if (content.text) {
                    return await sendTelegramMessage(id, content.text, {}, messageId);
                } else if (content.image) {
                    const url = content.image.url || content.image;
                    if (!url) throw new Error('Image URL missing');
                    return await sendTelegramPhoto(id, url, content.caption || '', messageId);
                } else if (content.audio) {
                    const url = content.audio.url || content.audio;
                    if (!url) throw new Error('Audio URL missing');
                    return await sendTelegramAudio(id, url, content.caption || '', messageId);
                } else if (content.video) {
                    const url = content.video.url || content.video;
                    if (!url) throw new Error('Video URL missing');
                    return await sendTelegramVideo(id, url, content.caption || '', messageId);
                } else if (content.document) {
                    const url = content.document.url || content.document;
                    if (!url) throw new Error('Document URL missing');
                    return await sendTelegramDocument(id, url, content.caption || '', messageId);
                } else if (content.hasOwnProperty('buttons') || content.hasOwnProperty('interactiveButtons')) {
                    return await sendInteractiveMessage(null, id, content, { quoted: { message_id: messageId } });
                } else if (content.poll) {
                    return await sendTelegramPoll(id, content.poll.question, content.poll.options, {
                        reply_to_message_id: messageId,
                        ...content.poll
                    });
                } else {
                    const text = typeof content === 'string' ? content : JSON.stringify(content);
                    return await sendTelegramMessage(id, text.substring(0, 4000), {}, messageId);
                }
            } catch (error) {
                logError(`[Sock.sendMessage] Error: ${error.message}`);
                try {
                    await sendTelegramMessage(String(jid || currentChatId), `❌ *Error:* ${error.message.substring(0, 200)}`, {}, messageId);
                } catch (e) {}
                return false;
            }
        },
        sendMessageAck: async () => true,
        react: async (jid, { text }) => {
            try {
                return await sendTelegramMessage(String(jid || currentChatId), text, {}, messageId);
            } catch (error) {
                return false;
            }
        },
        sendPresenceUpdate: async (presence) => {
            try {
                if (!token) return false;
                const action = presence === 'composing' ? 'typing' : presence === 'recording' ? 'upload_audio' : 'typing';
                await axios.post(`${TELEGRAM_BASE_URL(token)}/sendChatAction`, {
                    chat_id: currentChatId,
                    action: action
                });
                return true;
            } catch (error) {
                return false;
            }
        },
        readMessages: async (messages) => {
            try {
                if (!token) return false;
                await axios.post(`${TELEGRAM_BASE_URL(token)}/sendChatAction`, {
                    chat_id: currentChatId,
                    action: 'typing'
                });
                return true;
            } catch (error) {
                return false;
            }
        },
        updateMessage: async (jid, message, content) => {
            try {
                return await sendTelegramMessage(String(jid || currentChatId), content, {}, messageId);
            } catch (error) {
                return false;
            }
        },
        logger: {
            info: logInfo,
            error: logError,
            warn: logWarning,
            debug: logDebug
        },
        // [Autofix] WhatsApp mock properties to prevent breakdown inside native modules
        user: { id: 'telegram_bridge@s.whatsapp.net', name: 'Mickey Bridge' },
        profilePictureUrl: async () => 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png',
        groupMetadata: async () => ({ id: currentChatId, subject: 'Telegram Chat Group', participants: [] }),
        getChatId: () => currentChatId,
        getMessageId: () => messageId
    };

    return baseSock;
}

// ============================================================
// 📁 COMMAND LOADER WITH HOT RELOAD
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
        if (typeof handler === 'function') {
            entries.push({
                execute: handler,
                name: name || baseName,
                aliases: Array.isArray(aliases) ? aliases : [],
                config
            });
        }
    };

    if (typeof cmdModule === 'function') {
        addEntry(cmdModule, baseName);
        return entries;
    }

    if (!cmdModule || typeof cmdModule !== 'object') {
        return entries;
    }

    if (typeof cmdModule.execute === 'function') {
        addEntry(cmdModule.execute, cmdModule.name || baseName, Array.isArray(cmdModule.aliases) ? cmdModule.aliases : [], cmdModule.config || {});
        return entries;
    }

    if (cmdModule.default) {
        if (typeof cmdModule.default === 'function') {
            addEntry(cmdModule.default, cmdModule.name || baseName);
        } else if (typeof cmdModule.default.execute === 'function') {
            addEntry(
                cmdModule.default.execute,
                cmdModule.default.name || cmdModule.name || baseName,
                Array.isArray(cmdModule.default.aliases) ? cmdModule.default.aliases : [],
                cmdModule.default.config || {}
            );
        }
        return entries;
    }

    if (typeof cmdModule.run === 'function') {
        addEntry(cmdModule.run, cmdModule.name || baseName, Array.isArray(cmdModule.aliases) ? cmdModule.aliases : [], cmdModule.config || {});
        return entries;
    }

    if (typeof cmdModule.handler === 'function') {
        addEntry(cmdModule.handler, cmdModule.name || baseName, Array.isArray(cmdModule.aliases) ? cmdModule.aliases : [], cmdModule.config || {});
        return entries;
    }

    for (const [key, value] of Object.entries(cmdModule)) {
        if (typeof value === 'function') {
            addEntry(value, key === 'default' ? baseName : key);
        } else if (value && typeof value === 'object' && typeof value.execute === 'function') {
            const entryName = value.name || (key === 'default' ? baseName : key);
            addEntry(value.execute, entryName, Array.isArray(value.aliases) ? value.aliases : [], value.config || {});
        }
    }

    return entries;
}

function loadWhatsappCommands() {
    if (!fs.existsSync(COMMANDS_DIR)) {
        fs.mkdirSync(COMMANDS_DIR, { recursive: true });
        return;
    }

    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
    whatsappCommands.clear();

    for (const file of files) {
        try {
            const baseName = file.replace('.js', '');
            const filePath = path.join(COMMANDS_DIR, file);

            delete require.cache[require.resolve(filePath)];
            const cmdModule = require(filePath);

            const commandEntries = collectCommandEntries(cmdModule, baseName);

            if (commandEntries.length > 0) {
                for (const entry of commandEntries) {
                    const resolvedName = entry.name || baseName;
                    const resolvedAliases = Array.isArray(entry.config?.aliases) ? entry.config.aliases : entry.aliases;
                    const normalizedEntry = {
                        execute: entry.execute,
                        config: entry.config || {},
                        aliases: resolvedAliases,
                        category: entry.config?.category || null,
                        description: entry.config?.description || null
                    };

                    whatsappCommands.set(normalizeCommandName(resolvedName), normalizedEntry);
                    for (const alias of resolvedAliases) {
                        if (alias) whatsappCommands.set(normalizeCommandName(alias), normalizedEntry);
                    }
                    logDebug(`Loaded command: ${resolvedName}${resolvedAliases.length ? ` (aliases: ${resolvedAliases.join(', ')})` : ''}`);
                }
            } else {
                logWarning(`Could not load command from ${file}: No function found`);
            }
        } catch (e) {
            logError(`Failed to load ${file}: ${e.message}`);
        }
    }
    logSuccess(`Loaded ${whatsappCommands.size} commands from /commands folder`);
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

async function sendTelegramMedia(chatId, method, media, caption = '', replyToMessageId = null, extra = {}) {
    const token = settings?.telegram?.botToken?.trim();
    if (!token || !chatId || !media) return false;

    try {
        let body;
        const payload = {
            chat_id: String(chatId),
            caption: String(caption || '').slice(0, 1024),
            parse_mode: 'HTML',
            ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
            ...extra
        };

        if (typeof media === 'string' && /^https?:\/\//i.test(media)) {
            payload[method === 'sendPhoto' ? 'photo' : method === 'sendAudio' ? 'audio' : method === 'sendVideo' ? 'video' : method === 'sendDocument' ? 'document' : 'sticker'] = media;
            body = payload;
        } else {
            body = new FormData();
            body.append('chat_id', String(chatId));
            if (caption) body.append('caption', String(caption).slice(0, 1024));
            if (replyToMessageId) body.append('reply_to_message_id', String(replyToMessageId));
            if (typeof media === 'string' && fs.existsSync(media)) {
                const stream = fs.createReadStream(media);
                body.append(method === 'sendPhoto' ? 'photo' : method === 'sendAudio' ? 'audio' : method === 'sendVideo' ? 'video' : method === 'sendDocument' ? 'document' : 'sticker', stream);
            } else {
                body.append(method === 'sendPhoto' ? 'photo' : method === 'sendAudio' ? 'audio' : method === 'sendVideo' ? 'video' : method === 'sendDocument' ? 'document' : 'sticker', media);
            }
        }

        const headers = typeof body === 'object' && body && typeof body.getHeaders === 'function'
            ? { ...AXIOS_DEFAULTS.headers, ...body.getHeaders() }
            : AXIOS_DEFAULTS.headers;

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/${method}`, body, {
            ...AXIOS_DEFAULTS,
            headers,
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024
        });

        return response?.data?.ok === true;
    } catch (error) {
        logError(`Telegram ${method} failed: ${error?.message || error}`);
        return false;
    }
}

async function sendTelegramPhoto(chatId, photo, caption = '', replyToMessageId = null, extra = {}) {
    return sendTelegramMedia(chatId, 'sendPhoto', photo, caption, replyToMessageId, extra);
}

async function sendTelegramAudio(chatId, audio, caption = '', replyToMessageId = null, extra = {}) {
    return sendTelegramMedia(chatId, 'sendAudio', audio, caption, replyToMessageId, extra);
}

async function sendTelegramVideo(chatId, video, caption = '', replyToMessageId = null, extra = {}) {
    return sendTelegramMedia(chatId, 'sendVideo', video, caption, replyToMessageId, extra);
}

async function sendTelegramDocument(chatId, document, caption = '', replyToMessageId = null, extra = {}) {
    return sendTelegramMedia(chatId, 'sendDocument', document, caption, replyToMessageId, extra);
}

async function sendTelegramSticker(chatId, sticker, replyToMessageId = null, extra = {}) {
    const token = settings?.telegram?.botToken?.trim();
    if (!token || !chatId || !sticker) return false;

    try {
        const payload = {
            chat_id: String(chatId),
            ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
            ...extra
        };

        let body = payload;
        if (typeof sticker === 'string' && /^https?:\/\//i.test(sticker)) {
            body.sticker = sticker;
        } else {
            body = new FormData();
            body.append('chat_id', String(chatId));
            if (replyToMessageId) body.append('reply_to_message_id', String(replyToMessageId));
            if (typeof sticker === 'string' && fs.existsSync(sticker)) {
                body.append('sticker', fs.createReadStream(sticker));
            } else {
                body.append('sticker', sticker);
            }
        }

        const headers = body && typeof body.getHeaders === 'function'
            ? { ...AXIOS_DEFAULTS.headers, ...body.getHeaders() }
            : AXIOS_DEFAULTS.headers;

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendSticker`, body, { ...AXIOS_DEFAULTS, headers });
        return response?.data?.ok === true;
    } catch (error) {
        logError(`Telegram sendSticker failed: ${error?.message || error}`);
        return false;
    }
}

async function sendTelegramPoll(chatId, question, options = [], config = {}, replyToMessageId = null) {
    const token = settings?.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
        const payload = {
            chat_id: String(chatId),
            question: String(question || 'Question').slice(0, 255),
            options: Array.isArray(options) ? options.slice(0, 10).map(String) : ['Yes', 'No'],
            ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
            ...config
        };

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPoll`, payload, AXIOS_DEFAULTS);
        return response?.data?.ok === true;
    } catch (error) {
        logError(`Telegram sendPoll failed: ${error?.message || error}`);
        return false;
    }
}

function ensureTelegramDataFile() {
    try {
        if (!fs.existsSync(TELEGRAM_DATA_DIR)) fs.mkdirSync(TELEGRAM_DATA_DIR, { recursive: true });
        if (!fs.existsSync(TELEGRAM_DATA_FILE)) fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify({ pairs: {}, allowedChats: [], settings: {} }, null, 2));
    } catch (error) {
        logError(`Failed to ensure telegram data file: ${error?.message || error}`);
    }
}

function loadAllowedChats() {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.allowedChats) ? parsed.allowedChats : [];
    } catch (error) {
        return [];
    }
}

function saveAllowedChats(chats = []) {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        parsed.allowedChats = Array.isArray(chats) ? chats : [];
        fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(parsed, null, 2));
        return true;
    } catch (error) {
        logError(`saveAllowedChats failed: ${error?.message || error}`);
        return false;
    }
}

function loadTelegramSettings() {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed.settings || {} : {};
    } catch (error) {
        return {};
    }
}

function saveTelegramSettings(settingsData = {}) {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        parsed.settings = settingsData || {};
        fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(parsed, null, 2));
        return true;
    } catch (error) {
        logError(`saveTelegramSettings failed: ${error?.message || error}`);
        return false;
    }
}

function isChatAllowed(chatId) {
    if (!chatId) return false;
    const allowedChats = loadAllowedChats();
    const normalized = String(chatId).trim();
    return allowedChats.some(item => String(item).trim() === normalized) || normalized === 'all';
}

function addAllowedChat(chatId) {
    if (!chatId) return false;
    const chats = loadAllowedChats();
    const normalized = String(chatId).trim();
    if (!chats.includes(normalized)) chats.push(normalized);
    return saveAllowedChats(chats);
}

function removeAllowedChat(chatId) {
    if (!chatId) return false;
    const chats = loadAllowedChats().filter(item => String(item).trim() !== String(chatId).trim());
    return saveAllowedChats(chats);
}

function checkRateLimit(chatId, limit = 10, windowMs = 60000) {
    const key = String(chatId || 'global');
    const now = Date.now();
    const bucket = rateLimiter.get(key) || [];
    const filtered = bucket.filter(ts => now - ts < windowMs);
    filtered.push(now);
    rateLimiter.set(key, filtered);
    return filtered.length <= limit;
}

function logToFile(fileName, content) {
    try {
        const dir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, fileName);
        fs.appendFileSync(filePath, `${new Date().toISOString()} ${String(content)}\n`);
        return true;
    } catch (error) {
        return false;
    }
}

async function executeCommand(sock, chatId, message, commandText) {
    try {
        const parsed = parseCommandText(commandText || '');
        if (!parsed) return false;

        const target = whatsappCommands.get(parsed.name) || whatsappCommands.get(normalizeCommandName(parsed.name));
        if (!target || typeof target.execute !== 'function') return false;

        const result = await target.execute(sock, chatId, message, parsed.args || '');
        return !!result;
    } catch (error) {
        logError(`Telegram command execution failed: ${error?.message || error}`);
        return false;
    }
}

async function getYoutubeAudio(query, options = {}) {
    try {
        const results = await yts(query || '', { pages: 1 });
        const item = results?.all?.[0];
        if (!item?.url) return null;
        return { title: item.title, url: item.url, thumbnail: item.image || item.thumbnail || '', author: item.author || 'Unknown' };
    } catch (error) {
        logError(`getYoutubeAudio failed: ${error?.message || error}`);
        return null;
    }
}

async function searchYoutubeAudio(query, options = {}) {
    try {
        const data = await yts(query || '', { pages: 1 });
        const items = Array.isArray(data?.all) ? data.all.slice(0, 5) : [];
        return items.map(item => ({
            title: item.title,
            url: item.url,
            thumbnail: item.image || item.thumbnail || '',
            author: item.author || 'Unknown'
        }));
    } catch (error) {
        logError(`searchYoutubeAudio failed: ${error?.message || error}`);
        return [];
    }
}

function extractVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/(?:v=|\/)([A-Za-z0-9_-]{11})(?:[&?]|$)/);
    return match ? match[1] : null;
}

async function getAfricanMusicCharts() {
    return [
        { title: 'Trending - 1', artist: 'Local', url: 'https://example.com' }
    ];
}

async function pairWhatsApp(data = {}) {
    try {
        ensureTelegramDataFile();
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        parsed.pairs = parsed.pairs || {};
        if (data && data.whatsappId) parsed.pairs[data.whatsappId] = data;
        fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(parsed, null, 2));
        return true;
    } catch (error) {
        logError(`pairWhatsApp failed: ${error?.message || error}`);
        return false;
    }
}

async function startTelegramBot() {
    logInfo('Telegram bridge ready. Bot startup is being handled by the main process.');
    return true;
}

function getBotName() {
    return String(settings?.botName || settings?.botname || 'MICKEY GLITCH');
}

function getFormattedDate(date = new Date()) {
    try {
        return new Date(date).toLocaleString();
    } catch (error) {
        return String(date || new Date());
    }
}

function getNetworkStats() {
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        uptime: os.uptime(),
        loadavg: os.loadavg()
    };
}

async function aliveCommand(sock, chatId, message) {
    const text = `🟢 Telegram bridge is alive\n\nServer: ${os.hostname()}\nUptime: ${formatUptime(os.uptime())}`;
    return sendTelegramMessage(chatId, text, {}, message?.message_id || null);
}

module.exports = {
    sendTelegramMessage,
    sendTelegramPhoto,
    sendTelegramAudio,
    sendTelegramVideo,
    sendTelegramDocument,
    sendTelegramSticker,
    sendTelegramPoll,
    sendTelegramButtons,
    sendInteractiveMessage,
    createTelegramSock,
    loadWhatsappCommands,
    executeCommand,
    whatsappCommands,
    isChatAllowed,
    addAllowedChat,
    removeAllowedChat,
    loadAllowedChats,
    saveAllowedChats,
    loadTelegramSettings,
    saveTelegramSettings,
    getYoutubeAudio,
    searchYoutubeAudio,
    extractVideoId,
    getAfricanMusicCharts,
    pairWhatsApp,
    checkRateLimit,
    logToFile,
    parseCommandText,
    normalizeCommandName,
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
