/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH ULTIMATE
 * Version 2.0 - Fully Enhanced with African Charts, Downloader, and AI Features
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const os = require('os');
const { performance } = require('perf_hooks');
const settings = require('./settings');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const FormData = require('form-data');

// ============================================================
// 📁 DIRECTORIES & CONFIGURATION
// ============================================================
const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;
const TEMP_DIR = path.join(__dirname, 'tmp');
const COMMANDS_DIR = path.join(__dirname, 'commands');
const CACHE_DIR = path.join(__dirname, 'cache');
const LOGS_DIR = path.join(__dirname, 'logs');

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
                    text: btn.text || btn.label || 'Button'
                };

                if (btn.url) {
                    button.url = btn.url;
                } else if (btn.callback_data) {
                    button.callback_data = String(btn.callback_data);
                } else if (btn.command) {
                    button.callback_data = String(btn.command);
                } else if (btn.switch_inline_query) {
                    button.switch_inline_query = btn.switch_inline_query;
                } else {
                    button.callback_data = 'action_' + (btn.text || 'button');
                }

                row.push(button);

                if (row.length === 3) {
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
        // Send interactive message with buttons
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
    return {
        sendMessage: async (jid, content, options = {}) => {
            try {
                const id = String(jid);
                if (!content || typeof content !== 'object') {
                    throw new Error('Invalid content format');
                }

                // Handle various content types
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
                } else if (content.sticker) {
                    const url = content.sticker.url || content.sticker;
                    if (!url) throw new Error('Sticker URL missing');
                    return await sendTelegramSticker(id, url, messageId);
                } else if (content.buttons || content.interactiveButtons) {
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
                    await sendTelegramMessage(String(jid), `❌ *Error:* ${error.message.substring(0, 200)}`, {}, messageId);
                } catch (e) {}
                return false;
            }
        },
        sendMessageAck: async () => true,
        react: async (jid, { text }) => {
            try {
                return await sendTelegramMessage(String(jid), text, {}, messageId);
            } catch (error) {
                return false;
            }
        },
        sendPresenceUpdate: async (presence) => {
            try {
                return true;
            } catch (error) {
                return false;
            }
        },
        readMessages: async (messages) => {
            try {
                const token = settings.telegram?.botToken?.trim();
                if (!token) return false;

                const chatId = String(jid || chatId);
                if (messages && messages.length > 0) {
                    for (const msg of messages) {
                        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendChatAction`, {
                            chat_id: chatId,
                            action: 'typing'
                        });
                    }
                }
                return true;
            } catch (error) {
                return false;
            }
        },
        updateMessage: async (jid, message, content) => {
            try {
                return await sendTelegramMessage(String(jid), content, {}, messageId);
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
        getChatId: () => chatId,
        getMessageId: () => messageId
    };
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
            
            // Handle different export formats
            let commandFunction = null;
            let commandConfig = {};
            let aliases = [];
            let commandName = baseName;

            // Check if it's a function directly
            if (typeof cmdModule === 'function') {
                commandFunction = cmdModule;
            } 
            // Check if it has execute property
            else if (cmdModule && typeof cmdModule === 'object') {
                if (typeof cmdModule.execute === 'function') {
                    commandFunction = cmdModule.execute;
                    commandConfig = cmdModule.config || {};
                    aliases = Array.isArray(cmdModule.aliases) ? cmdModule.aliases : [];
                } 
                // Check if it has default export
                else if (cmdModule.default) {
                    if (typeof cmdModule.default === 'function') {
                        commandFunction = cmdModule.default;
                    } else if (typeof cmdModule.default.execute === 'function') {
                        commandFunction = cmdModule.default.execute;
                        commandConfig = cmdModule.default.config || {};
                        aliases = Array.isArray(cmdModule.default.aliases) ? cmdModule.default.aliases : [];
                    }
                }
                // Check for run or handler
                else if (typeof cmdModule.run === 'function') {
                    commandFunction = cmdModule.run;
                    commandConfig = cmdModule.config || {};
                    aliases = Array.isArray(cmdModule.aliases) ? cmdModule.aliases : [];
                } else if (typeof cmdModule.handler === 'function') {
                    commandFunction = cmdModule.handler;
                    commandConfig = cmdModule.config || {};
                    aliases = Array.isArray(cmdModule.aliases) ? cmdModule.aliases : [];
                }
            }

            // If still no function, try to get it from exports
            if (!commandFunction) {
                const exports = Object.values(cmdModule);
                for (const exp of exports) {
                    if (typeof exp === 'function') {
                        commandFunction = exp;
                        break;
                    }
                }
            }

            if (commandFunction && typeof commandFunction === 'function') {
                const resolvedName = (typeof cmdModule?.name === 'string' && cmdModule.name) || baseName;
                const resolvedAliases = Array.isArray(commandConfig.aliases) ? commandConfig.aliases : aliases;
                
                const entry = {
                    execute: commandFunction,
                    config: commandConfig,
                    aliases: resolvedAliases,
                    category: commandConfig.category || null,
                    description: commandConfig.description || null
                };

                whatsappCommands.set(normalizeCommandName(resolvedName), entry);
                for (const alias of resolvedAliases) {
                    if (alias) whatsappCommands.set(normalizeCommandName(alias), entry);
                }
                logDebug(`Loaded command: ${resolvedName}${resolvedAliases.length ? ` (aliases: ${resolvedAliases.join(', ')})` : ''}`);
            } else {
                logWarning(`Could not load command from ${file}: No function found`);
            }
        } catch (e) {
            logError(`Failed to load ${file}: ${e.message}`);
        }
    }
    logSuccess(`Loaded ${whatsappCommands.size} commands from /commands folder`);
}

// ============================================================
// 📱 ENHANCED TELEGRAM MEDIA FUNCTIONS
// ============================================================

async function sendTelegramMessage(chatId, text, extra = {}, messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
        const safeText = String(text || '').substring(0, 4096);
        if (!safeText) return false;

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
            chat_id: String(chatId),
            text: safeText,
            disable_web_page_preview: true,
            parse_mode: 'HTML',
            reply_to_message_id: messageId,
            ...extra
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 30000
        });

        return response?.data?.ok !== false;
    } catch (error) {
        if (error.response?.status === 400) {
            try {
                const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
                    chat_id: String(chatId),
                    text: String(text || '').substring(0, 4096),
                    disable_web_page_preview: true,
                    reply_to_message_id: messageId,
                    ...extra
                }, {
                    ...AXIOS_DEFAULTS,
                    timeout: 30000
                });
                return response?.data?.ok !== false;
            } catch (e) {
                logError(`Send message fallback error: ${e.message}`);
            }
        }
        logError(`Send message error: ${error.message}`);
        return false;
    }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !photoUrl) return false;

    try {
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: photoUrl,
            caption: caption.substring(0, 1024),
            parse_mode: 'HTML',
            reply_to_message_id: messageId
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 60000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send photo error: ${error.message}`);
        return false;
    }
}

async function sendTelegramAudio(chatId, audioUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !audioUrl) {
        logError('Missing token, chatId, or audioUrl');
        return false;
    }

    try {
        logDebug(`Sending audio to ${chatId}`);

        const audioInfo = await getAudioInfo(audioUrl);

        const payload = {
            chat_id: String(chatId),
            audio: audioUrl,
            caption: caption.substring(0, 1024),
            parse_mode: 'HTML',
            reply_to_message_id: messageId,
            supports_streaming: true
        };

        if (audioInfo) {
            if (audioInfo.duration) payload.duration = Math.floor(audioInfo.duration);
            if (audioInfo.title) payload.title = audioInfo.title;
            if (audioInfo.performer) payload.performer = audioInfo.performer;
        }

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendAudio`, payload, {
            ...AXIOS_DEFAULTS,
            timeout: 180000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response?.data?.ok === true) {
            logSuccess(`Audio sent successfully`);
            return true;
        } else {
            logError(`Audio send failed: ${JSON.stringify(response?.data)}`);
            return false;
        }
    } catch (error) {
        if (error.response?.status === 400) {
            logError(`Audio error 400: File may be too large or invalid format`);
            try {
                const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendDocument`, {
                    chat_id: String(chatId),
                    document: audioUrl,
                    caption: `🎵 *Audio file*\n${caption.substring(0, 200)}`,
                    parse_mode: 'Markdown',
                    reply_to_message_id: messageId
                }, {
                    ...AXIOS_DEFAULTS,
                    timeout: 180000
                });
                return response?.data?.ok !== false;
            } catch (e) {
                logError(`Document fallback error: ${e.message}`);
            }
        } else if (error.response?.status === 413) {
            logError(`Audio too large: ${error.message}`);
            await sendTelegramMessage(chatId, '❌ *Audio file too large for Telegram!* Try a smaller file.', {}, messageId);
        } else {
            logError(`Send audio error: ${error.message}`);
        }
        return false;
    }
}

async function sendTelegramVideo(chatId, videoUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !videoUrl) return false;

    try {
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendVideo`, {
            chat_id: String(chatId),
            video: videoUrl,
            caption: caption.substring(0, 1024),
            parse_mode: 'HTML',
            reply_to_message_id: messageId,
            supports_streaming: true
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 180000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send video error: ${error.message}`);
        return false;
    }
}

async function sendTelegramDocument(chatId, docUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !docUrl) return false;

    try {
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendDocument`, {
            chat_id: String(chatId),
            document: docUrl,
            caption: caption.substring(0, 1024),
            parse_mode: 'HTML',
            reply_to_message_id: messageId
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 180000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send document error: ${error.message}`);
        return false;
    }
}

async function sendTelegramSticker(chatId, stickerUrl, messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !stickerUrl) return false;

    try {
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendSticker`, {
            chat_id: String(chatId),
            sticker: stickerUrl,
            reply_to_message_id: messageId
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 60000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send sticker error: ${error.message}`);
        return false;
    }
}

async function sendTelegramPoll(chatId, question, options, extra = {}) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !question || !options || options.length < 2) return false;

    try {
        const payload = {
            chat_id: String(chatId),
            question: question,
            options: options.map(o => String(o)),
            ...(extra.is_anonymous !== undefined && { is_anonymous: extra.is_anonymous }),
            ...(extra.type && { type: extra.type }),
            ...(extra.allows_multiple_answers && { allows_multiple_answers: extra.allows_multiple_answers }),
            ...(extra.correct_option_id !== undefined && { correct_option_id: extra.correct_option_id }),
            ...(extra.explanation && { explanation: extra.explanation }),
            ...(extra.explanation_parse_mode && { explanation_parse_mode: extra.explanation_parse_mode }),
            ...(extra.open_period && { open_period: extra.open_period }),
            ...(extra.close_date && { close_date: extra.close_date })
        };

        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPoll`, payload, {
            ...AXIOS_DEFAULTS,
            timeout: 30000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send poll error: ${error.message}`);
        return false;
    }
}

// ============================================================
// 🎵 ENHANCED YOUTUBE FUNCTIONS WITH CACHING
// ============================================================

function extractVideoId(ytUrl) {
    if (!ytUrl || typeof ytUrl !== 'string') return null;
    let videoId = '';

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = ytUrl.match(pattern);
        if (match) {
            videoId = match[1];
            break;
        }
    }

    return videoId || null;
}

async function tryRequest(getter, attempts = 3) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try { 
            return await getter(); 
        } catch (err) { 
            lastErr = err; 
            logDebug(`Request attempt ${i} failed: ${err.message}`);
            if (i < attempts) await new Promise(r => setTimeout(r, 2000 * i));
        }
    }
    throw lastErr;
}

async function getAudioInfo(url) {
    try {
        const response = await axios.head(url, {
            ...AXIOS_DEFAULTS,
            timeout: 10000
        });

        const contentLength = parseInt(response.headers['content-length'] || '0');
        const contentType = response.headers['content-type'] || '';

        return {
            duration: Math.floor(contentLength / 160000) || 0,
            title: path.basename(url).split('.')[0] || 'Audio',
            performer: 'Unknown',
            fileSize: contentLength
        };
    } catch (error) {
        return null;
    }
}

async function getYoutubeAudio(ytUrl) {
    const videoId = extractVideoId(ytUrl);
    if (!videoId) {
        return await searchYoutubeAudio(ytUrl);
    }

    const cacheKey = `yt_audio_${videoId}`;
    if (commandCache.has(cacheKey)) {
        const cached = commandCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 3600000) {
            logDebug(`Using cached audio for ${videoId}`);
            return cached.data;
        }
        commandCache.delete(cacheKey);
    }

    const apis = [
        async () => {
            const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

            if (res.data?.status === true && res.data?.data?.data?.formats) {
                const formats = res.data.data.data.formats;
                const title = res.data.data.data.title || 'Unknown Title';
                const thumbnail = res.data.data.data.thumbnail || '';
                const duration = res.data.data.data.duration || '0';

                const audioFormats = formats.filter(f => f.type === 'audio');
                const priorityMap = { '251': 100, '250': 90, '249': 85, '140': 80, '139': 70 };

                let bestAudio = null;
                let bestPriority = 0;

                for (const format of audioFormats) {
                    const priority = priorityMap[format.formatId] || 50;
                    if (priority > bestPriority && format.url) {
                        bestPriority = priority;
                        bestAudio = format;
                    }
                }

                if (bestAudio?.url) {
                    const result = {
                        url: bestAudio.url,
                        title: title,
                        thumbnail: thumbnail,
                        quality: bestAudio.quality || 'MP3',
                        duration: duration
                    };

                    commandCache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });

                    return result;
                }
            }
            throw new Error('No audio found in first API');
        },
        async () => {
            const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

            if (res.data?.status === true && res.data?.data) {
                const videoData = res.data.data;
                const videoUrl = videoData.high || videoData.low;
                if (videoUrl) {
                    const result = {
                        url: videoUrl,
                        title: videoData.title || 'Unknown Title',
                        thumbnail: videoData.thumbnail || '',
                        quality: 'MP3',
                        duration: videoData.duration || '0'
                    };

                    commandCache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });

                    return result;
                }
            }
            throw new Error('No audio found in second API');
        }
    ];

    let lastError;
    for (const api of apis) {
        try {
            const result = await api();
            if (result?.url) {
                return result;
            }
        } catch (err) {
            lastError = err;
            logDebug(`API attempt failed: ${err.message}`);
            continue;
        }
    }

    return await searchYoutubeAudio(ytUrl);
}

async function searchYoutubeAudio(query) {
    try {
        const searchResult = await yts(query);
        const videos = searchResult.videos;
        if (!videos || videos.length === 0) {
            throw new Error('No results found');
        }
        const video = videos[0];
        if (!video) {
            throw new Error('No video found');
        }
        return await getYoutubeAudio(video.url);
    } catch (error) {
        throw new Error(`Search failed: ${error.message}`);
    }
}

// ============================================================
// 📊 ENHANCED TELEGRAM DATA MANAGEMENT
// ============================================================

function ensureTelegramDataFile() {
    if (!fs.existsSync(TELEGRAM_DATA_DIR)) fs.mkdirSync(TELEGRAM_DATA_DIR, { recursive: true });
    if (!fs.existsSync(TELEGRAM_DATA_FILE)) fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify({ allowedChats: [], settings: {} }, null, 2), 'utf8');
}

function loadAllowedChats() {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map(id => String(id));
        } else if (parsed.allowedChats && Array.isArray(parsed.allowedChats)) {
            return parsed.allowedChats.map(id => String(id));
        }
        return [];
    } catch (error) { 
        logError(`Load allowed chats error: ${error.message}`);
        return []; 
    }
}

function loadTelegramSettings() {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed.settings || {};
    } catch (error) {
        return {};
    }
}

function saveTelegramSettings(settings) {
    try {
        const data = {
            allowedChats: loadAllowedChats(),
            settings: settings
        };
        fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        logError(`Save settings error: ${error.message}`);
    }
}

function saveAllowedChats(chats) {
    try {
        const unique = Array.from(new Set(chats.map(id => String(id))));
        const settings = loadTelegramSettings();
        const data = {
            allowedChats: unique,
            settings: settings
        };
        fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
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
        return true;
    }
    return false;
}

function removeAllowedChat(chatId) {
    const allowed = loadAllowedChats().filter(id => id !== String(chatId)); 
    saveAllowedChats(allowed);
    logInfo(`Chat unpaired: ${chatId}`);
    return true;
}

// ============================================================
// 🚀 RATE LIMITING & SECURITY
// ============================================================

function checkRateLimit(chatId, command = 'default') {
    const key = `${chatId}_${command}`;
    const now = Date.now();

    if (!rateLimiter.has(key)) {
        rateLimiter.set(key, { count: 1, timestamp: now });
        return true;
    }

    const data = rateLimiter.get(key);
    const timeWindow = 30000;

    if (now - data.timestamp > timeWindow) {
        rateLimiter.set(key, { count: 1, timestamp: now });
        return true;
    }

    if (data.count >= 5) {
        return false;
    }

    data.count++;
    rateLimiter.set(key, data);
    return true;
}

// ============================================================
// 📝 LOGGING SYSTEM
// ============================================================

function logToFile(chatId, username, command, message) {
    try {
        const logFile = path.join(LOGS_DIR, `${new Date().toISOString().slice(0,10)}.log`);
        const logEntry = `[${getTimestamp()}] ${chatId} | ${username || 'Unknown'} | ${command} | ${message}\n`;
        fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (error) {}
}

// ============================================================
// 🤖 COMMAND EXECUTION WITH ERROR HANDLING
// ============================================================

async function executeCommand(commandName, sock, chatId, args, message, commandConfig = {}) {
    const normalizedName = normalizeCommandName(commandName);
    const cmd = whatsappCommands.get(normalizedName);
    if (!cmd) {
        logError(`Command not found: ${commandName}`);
        return await sendTelegramMessage(chatId, `❌ Command "${commandName}" not found.`, {}, message?.message_id);
    }

    try {
        if (!checkRateLimit(chatId, normalizedName)) {
            await sendTelegramMessage(chatId, '⏳ *Too many requests!* Please wait a moment.', {}, message?.message_id);
            return;
        }

        const username = message?.from?.username || message?.chat?.username || message?.pushName || 'Unknown';
        logToFile(chatId, username, normalizedName, JSON.stringify(args));
        logInfo(`Executing command "${normalizedName}" from ${username}`);

        let result;
        
        // Try different invocation patterns
        const invocationCandidates = [
            () => cmd.execute(sock, chatId, message, args, commandConfig),
            () => cmd.execute(sock, chatId, args, message, commandConfig),
            () => cmd.execute(sock, chatId, message, args),
            () => cmd.execute(sock, chatId, message),
            () => cmd.execute(sock, chatId, args)
        ];

        let lastError = null;
        for (const candidate of invocationCandidates) {
            try {
                result = await candidate();
                break;
            } catch (error) {
                lastError = error;
                logDebug(`Invocation attempt failed: ${error.message}`);
            }
        }

        if (result === undefined && lastError) {
            throw lastError;
        }

        // Handle different return types
        if (result && typeof result === 'string') {
            await sendTelegramMessage(chatId, result, {}, message?.message_id);
        } else if (result && typeof result === 'object') {
            if (result.text) {
                await sendTelegramMessage(chatId, result.text, {}, message?.message_id);
            }
            if (result.image) {
                await sendTelegramPhoto(chatId, result.image.url || result.image, result.caption || '', message?.message_id);
            }
            if (result.audio) {
                await sendTelegramAudio(chatId, result.audio.url || result.audio, result.caption || '', message?.message_id);
            }
            if (result.video) {
                await sendTelegramVideo(chatId, result.video.url || result.video, result.caption || '', message?.message_id);
            }
            if (result.buttons || result.interactiveButtons) {
                await sendInteractiveMessage(null, chatId, result, { quoted: { message_id: message?.message_id } });
            }
        }
    } catch (error) {
        logError(`Command "${normalizedName}" error: ${error.message}`);
        await sendTelegramMessage(chatId, `❌ *Error executing command:* ${error.message.substring(0, 200)}`, {}, message?.message_id);

        const username = message?.from?.username || message?.chat?.username || message?.pushName || 'Unknown';
        logToFile(chatId, username, normalizedName, `ERROR: ${error.message}`);
    }
}

// ============================================================
// 🌐 AFRICAN CHARTS INTEGRATION
// ============================================================

async function getAfricanMusicCharts(country = 'Tanzania') {
    const chartApis = {
        'Tanzania': 'https://music-charts-api.vercel.app/api/tz',
        'Kenya': 'https://music-charts-api.vercel.app/api/ke',
        'Nigeria': 'https://music-charts-api.vercel.app/api/ng',
        'South Africa': 'https://music-charts-api.vercel.app/api/za',
        'Uganda': 'https://music-charts-api.vercel.app/api/ug',
        'Ghana': 'https://music-charts-api.vercel.app/api/gh'
    };

    const apiUrl = chartApis[country];
    if (!apiUrl) return null;

    try {
        const response = await axios.get(apiUrl, {
            ...AXIOS_DEFAULTS,
            timeout: 15000
        });

        if (response.data && response.data.charts) {
            return {
                country: country,
                charts: response.data.charts,
                updatedAt: response.data.updatedAt || new Date().toISOString()
            };
        }
        return null;
    } catch (error) {
        logError(`Chart fetch error: ${error.message}`);
        return null;
    }
}

// ============================================================
// 📱 WHATSAPP PAIRING
// ============================================================

async function pairWhatsApp(chatId, phoneNumber) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(path.join(TEMP_DIR, `wa_session_${chatId}`));
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr } = update;

            if (qr) {
                await sendTelegramMessage(chatId, 
                    '📱 *Scan this QR Code with WhatsApp*\n\n' +
                    '1. Open WhatsApp on your phone\n' +
                    '2. Tap Menu or Settings\n' +
                    '3. Tap WhatsApp Web\n' +
                    '4. Scan the QR code below\n\n' +
                    '⚠️ *QR Code expires in 2 minutes*',
                    {}, null
                );

                try {
                    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
                    await sendTelegramPhoto(chatId, qrImageUrl, '📱 *Scan this QR Code*', null);
                } catch (e) {
                    logError(`QR image send error: ${e.message}`);
                }
            }

            if (connection === 'open') {
                logSuccess(`WhatsApp paired for ${chatId}`);
                await sendTelegramMessage(chatId, '✅ *WhatsApp Connected Successfully!*\n\n' +
                    'Now you can use WhatsApp features through this bot.', {}, null);
            }

            if (connection === 'close') {
                logWarning(`WhatsApp disconnected for ${chatId}`);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        return sock;
    } catch (error) {
        logError(`Pairing error: ${error.message}`);
        await sendTelegramMessage(chatId, `❌ *Pairing failed:* ${error.message}`, {}, null);
        return null;
    }
}

// ============================================================
// 🚀 BOT INITIALIZATION
// ============================================================

let telegramBotLoop = null;
let telegramBotActive = false;
let telegramBotOffset = 0;

async function startTelegramBot() {
    const token = settings.telegram?.botToken?.trim();
    if (!token) {
        logWarning('Telegram bot token not configured. Skipping Telegram bridge startup.');
        return null;
    }

    loadWhatsappCommands();
    if (telegramBotActive) return { active: true };

    telegramBotActive = true;
    logSuccess('Telegram bridge started. Listening for commands...');

    const pollUpdates = async () => {
        if (!telegramBotActive) return;

        try {
            const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
                ...AXIOS_DEFAULTS,
                params: { offset: telegramBotOffset, timeout: 2 }
            });

            if (response?.data?.ok) {
                const updates = response.data.result || [];
                for (const update of updates) {
                    const message = update.message || update.edited_message;
                    if (!message) continue;

                    const chatId = message.chat?.id;
                    const text = message.text || message.caption || '';
                    const parsed = parseCommandText(text);
                    if (!chatId || !parsed) continue;

                    const normalizedMessage = {
                        ...message,
                        chatId: String(chatId),
                        pushName: message.from?.first_name || message.from?.username || message.chat?.title || 'User',
                        message_id: message.message_id,
                        from: message.from || {},
                        chat: message.chat || {}
                    };

                    const sock = createTelegramSock(String(chatId), message.message_id);
                    const args = parsed.args;
                    await executeCommand(parsed.name, sock, String(chatId), args, normalizedMessage, {});
                    telegramBotOffset = Math.max(telegramBotOffset, update.update_id + 1);
                }
            }
        } catch (error) {
            logError(`Telegram polling error: ${error.message}`);
        }

        telegramBotLoop = setTimeout(pollUpdates, 1500);
    };

    pollUpdates();
    return {
        active: true,
        stop: () => {
            telegramBotActive = false;
            if (telegramBotLoop) clearTimeout(telegramBotLoop);
        }
    };
}

// ============================================================
// 📝 EXAMPLE COMMAND - ALIVE/STATUS
// ============================================================

/**
 * Get bot name from config
 */
const getBotName = () => {
    try {
        const configPath = path.join(__dirname, 'config', 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath));
            return config.botName || '𝐌𝐈𝐂𝐊𝐄𝐘-𝐕𝟑';
        }
    } catch (e) {}
    return '𝐌𝐈𝐂𝐊𝐄𝐘-𝐕𝟑';
};

/**
 * Get formatted date with fancy emojis
 */
const getFormattedDate = () => {
    const now = new Date();
    const days = ['𝐒𝐮𝐧𝐝𝐚𝐲', '𝐌𝐨𝐧𝐝𝐚𝐲', '𝐓𝐮𝐞𝐬𝐝𝐚𝐲', '𝐖𝐞𝐝𝐧𝐞𝐬𝐝𝐚𝐲', '𝐓𝐡𝐮𝐫𝐬𝐝𝐚𝐲', '𝐅𝐫𝐢𝐝𝐚𝐲', '𝐒𝐚𝐭𝐮𝐫𝐝𝐚𝐲'];
    const months = ['𝐉𝐚𝐧', '𝐅𝐞𝐛', '𝐌𝐚𝐫', '𝐀𝐩𝐫', '𝐌𝐚𝐲', '𝐉𝐮𝐧', '𝐉𝐮𝐥', '𝐀𝐮𝐠', '𝐒𝐞𝐩', '𝐎𝐜𝐭', '𝐍𝐨𝐯', '𝐃𝐞𝐜'];

    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
};

/**
 * Get network stats
 */
const getNetworkStats = () => {
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'N/A';
    let macAddress = 'N/A';

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ipAddress = iface.address;
                macAddress = iface.mac;
                break;
            }
        }
        if (ipAddress !== 'N/A') break;
    }

    return { ipAddress, macAddress };
};

/**
 * Main alive command function
 */
const aliveCommand = async (sock, chatId, message, args, config) => {
    const startTime = performance.now();

    try {
        const botName = getBotName();
        const formattedDate = getFormattedDate();

        const time = new Date().toLocaleTimeString('en-US', { 
            timeZone: 'Africa/Dar_es_Salaam', 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const latency = (performance.now() - startTime).toFixed(0);
        const pingEmoji = latency < 100 ? '🟢' : latency < 200 ? '🟡' : '🔴';

        const totalRam = os.totalmem() / Math.pow(1024, 3);
        const usedRam = process.memoryUsage().heapUsed / Math.pow(1024, 3);
        const freeRam = totalRam - usedRam;
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);
        const ramBar = progressBar(parseFloat(ramPercent), 12);

        const cpuModel = os.cpus()[0]?.model.split('@')[0].trim() || 'Generic CPU';
        const cpuCores = os.cpus().length;
        const cpuLoad = getSystemLoad();

        const network = getNetworkStats();
        const uptime = formatUptime(process.uptime());
        const platform = os.platform() === 'linux' ? '🐧 𝐋𝐢𝐧𝐮𝐱' : os.platform() === 'win32' ? '🪟 𝐖𝐢𝐧𝐝𝐨𝐰𝐬' : '📱 𝐀𝐧𝐝𝐫𝐨𝐢𝐝';
        const arch = os.arch() === 'x64' ? '64-ʙɪᴛ' : os.arch();

        const nodeVersion = process.version.replace('v', '');

        const botStartTime = global.botStartTime || Date.now();
        const botUptime = formatUptime(Math.floor((Date.now() - botStartTime) / 1000));

        const imageUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png';

        const statusMessage = `🚀 *${botName} Status*

*— USER INFO —*
👤 *Name:* ${message.pushName || 'Guest'}
📅 *Date:* ${formattedDate}
🕐 *Time:* ${time} EAT
⚡ *Ping:* ${latency}ms ${pingEmoji}

*— SYSTEM —*
⏳ *Uptime:* ${uptime}
💾 *RAM:* ${ramPercent}% (${usedRam.toFixed(1)}GB)
📊 ${ramBar}
🖥️ *CPU:* ${cpuModel.split(' ').slice(0, 2).join(' ')}
🐧 *OS:* ${platform}

*— HEALTH —*
${ramPercent < 70 ? '🟢 Status: Perfect' : ramPercent < 85 ? '🟡 Status: Stable' : '🔴 Status: Heavy'}
💡 *Free:* ${freeRam.toFixed(2)}GB

_Mickey Glitch Technology_`;

        await sendInteractiveMessage(sock, chatId, {
            text: statusMessage,
            contextInfo: {
                mentionedJid: [chatId],
                externalAdReply: {
                    title: `🚀 ${botName} | 𝐎𝐍𝐋𝐈𝐍𝐄`,
                    body: '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲',
                    thumbnailUrl: imageUrl,
                    sourceUrl: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            },
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📜 𝐌𝐄𝐍𝐔', 
                        id: '.menu' 
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📡 𝐒𝐏𝐄𝐄𝐃', 
                        id: '.ping' 
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '👑 𝐎𝐖𝐍𝐄𝐑', 
                        id: '.owner' 
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '⚡ 𝐑𝐔𝐍𝐓𝐈𝐌𝐄', 
                        id: '.runtime' 
                    })
                }
            ]
        }, { quoted: message });

    } catch (error) {
        console.error('Critical Error in Alive Command:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ *System Error:* Unable to fetch status.\n```' + error.message + '```' 
            }, { quoted: message });
        } catch (e) { }
    }
};

// Export all functions
module.exports = {
    // Core functions
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

    // Command management
    loadWhatsappCommands,
    executeCommand,
    whatsappCommands,

    // Data management
    isChatAllowed,
    addAllowedChat,
    removeAllowedChat,
    loadAllowedChats,
    saveAllowedChats,
    loadTelegramSettings,
    saveTelegramSettings,

    // YouTube functions
    getYoutubeAudio,
    searchYoutubeAudio,
    extractVideoId,

    // African charts
    getAfricanMusicCharts,

    // WhatsApp pairing
    pairWhatsApp,

    // Utility
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
    
    // Example commands
    aliveCommand,
    formatUptime,
    progressBar,
    getSystemLoad,
    getBotName,
    getFormattedDate,
    getNetworkStats
};