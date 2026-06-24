/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH ULTIMATE
 * Version 2.0 - Fully Enhanced with African Charts, Downloader, and AI Features
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const os = require('os');
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
                } else if (content.buttons) {
                    return await sendTelegramButtons(id, content.text || '', content.buttons, { reply_to_message_id: messageId });
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
                // Telegram doesn't support presence updates directly
                return true;
            } catch (error) {
                return false;
            }
        },
        readMessages: async (messages) => {
            try {
                // Mark messages as read in Telegram
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
                // Telegram doesn't support message editing via bot easily
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
        // Additional utility functions
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
            const exportTarget = cmdModule && typeof cmdModule === 'object' && 'default' in cmdModule ? cmdModule.default : cmdModule;

            let commandName = baseName;
            let commandFunction = null;
            let commandConfig = {};
            let aliases = [];

            if (typeof exportTarget === 'function') {
                commandFunction = exportTarget;
            } else if (exportTarget && typeof exportTarget === 'object') {
                if (typeof exportTarget.execute === 'function') {
                    commandFunction = exportTarget.execute;
                    commandConfig = exportTarget.config || {};
                    aliases = Array.isArray(exportTarget.aliases) ? exportTarget.aliases : [];
                } else if (typeof exportTarget.default === 'function') {
                    commandFunction = exportTarget.default;
                    commandConfig = exportTarget.config || {};
                    aliases = Array.isArray(exportTarget.aliases) ? exportTarget.aliases : [];
                } else if (typeof exportTarget.run === 'function') {
                    commandFunction = exportTarget.run;
                    commandConfig = exportTarget.config || {};
                    aliases = Array.isArray(exportTarget.aliases) ? exportTarget.aliases : [];
                } else if (typeof exportTarget.handler === 'function') {
                    commandFunction = exportTarget.handler;
                    commandConfig = exportTarget.config || {};
                    aliases = Array.isArray(exportTarget.aliases) ? exportTarget.aliases : [];
                }

                if (!commandFunction) {
                    commandName = exportTarget.name || baseName;
                    commandConfig = exportTarget.config || {};
                    aliases = Array.isArray(exportTarget.aliases) ? exportTarget.aliases : [];
                }
            }

            if (commandFunction && typeof commandFunction === 'function') {
                const resolvedName = (typeof exportTarget?.name === 'string' && exportTarget.name) || baseName;
                const resolvedAliases = Array.isArray(commandConfig.aliases) ? commandConfig.aliases : aliases;
                const entry = {
                    execute: commandFunction,
                    config: commandConfig,
                    aliases: resolvedAliases,
                    category: commandConfig.category || exportTarget?.category || null,
                    description: commandConfig.description || exportTarget?.description || null
                };

                whatsappCommands.set(normalizeCommandName(resolvedName), entry);
                for (const alias of resolvedAliases) {
                    if (alias) whatsappCommands.set(normalizeCommandName(alias), entry);
                }
                logDebug(`Loaded command: ${resolvedName}${resolvedAliases.length ? ` (aliases: ${resolvedAliases.join(', ')})` : ''}`);
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

        // Try HTML parsing first (more reliable than Markdown)
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
            // Try without parsing
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

        // Try to get audio info
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
            // Try sending as document
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
        // Try to get audio metadata from the URL
        const response = await axios.head(url, {
            ...AXIOS_DEFAULTS,
            timeout: 10000
        });
        
        const contentLength = parseInt(response.headers['content-length'] || '0');
        const contentType = response.headers['content-type'] || '';
        
        return {
            duration: Math.floor(contentLength / 160000) || 0, // Rough estimate
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

    // Check cache first
    const cacheKey = `yt_audio_${videoId}`;
    if (commandCache.has(cacheKey)) {
        const cached = commandCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
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

                // Find best audio format
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
                    
                    // Cache the result
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
    const timeWindow = 30000; // 30 seconds
    
    if (now - data.timestamp > timeWindow) {
        rateLimiter.set(key, { count: 1, timestamp: now });
        return true;
    }
    
    if (data.count >= 5) { // Max 5 requests per 30 seconds
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
    } catch (error) {
        // Silent fail
    }
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
            }
        }

        if (result === undefined && lastError) {
            throw lastError;
        }

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
            if (result.buttons) {
                await sendTelegramButtons(chatId, result.text || '', result.buttons, { reply_to_message_id: message?.message_id });
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
                // Send QR code to Telegram
                await sendTelegramMessage(chatId, 
                    '📱 *Scan this QR Code with WhatsApp*\n\n' +
                    '1. Open WhatsApp on your phone\n' +
                    '2. Tap Menu or Settings\n' +
                    '3. Tap WhatsApp Web\n' +
                    '4. Scan the QR code below\n\n' +
                    '⚠️ *QR Code expires in 2 minutes*',
                    {}, null
                );
                
                // Send QR as image
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
    logSystem
};