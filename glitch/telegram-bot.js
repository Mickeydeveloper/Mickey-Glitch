/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH ULTIMATE
 * Version 4.0 - Auto-Adapter for WhatsApp-to-Telegram Compatibility
 * (Supports: Images, Audio/Voice, Videos, Buttons, Documents, Buffers, Streams)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');
const FormData = require('form-data');
const settings = require('../settings');
const { createCtx } = require('../lib/messageBuilder');

// ============================================================
// 📁 DIRECTORIES & CONFIGURATION
// ============================================================
const TELEGRAM_DATA_DIR = path.join(__dirname, '..', 'data');
const TELEGRAM_STATE_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramBot.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;
const TEMP_DIR = path.join(__dirname, '..', 'tmp');
const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

const whatsappCommands = new Map();
let isPollingActive = false;
let pollingOffset = 0;
let globalSock = null;

function readTelegramState() {
    try {
        const state = JSON.parse(fs.readFileSync(TELEGRAM_STATE_FILE, 'utf8'));
        return { enabled: state.enabled !== false };
    } catch {
        return { enabled: true };
    }
}

function writeTelegramState(enabled) {
    fs.writeFileSync(TELEGRAM_STATE_FILE, JSON.stringify({ enabled: !!enabled }, null, 2));
}

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
    }
};

const dirs = [TEMP_DIR, COMMANDS_DIR, TELEGRAM_DATA_DIR];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Logging Helpers
const logSuccess = (t) => console.log(`\x1b[32m[Telegram Engine] ✅ ${t}\x1b[0m`);
const logError = (t) => console.log(`\x1b[31m[Telegram Engine] ❌ ${t}\x1b[0m`);
const logInfo = (t) => console.log(`\x1b[34m[Telegram Engine] ℹ️ ${t}\x1b[0m`);
const logDebug = (t) => console.log(`\x1b[36m[Telegram Engine] 🐛 ${t}\x1b[0m`);

// ============================================================
// 🚀 START TELEGRAM BOT ENGINE
// ============================================================

async function startTelegramBot(providedSock = null) {
    const token = settings.telegram?.botToken?.trim();

    if (!token) {
        logError('Bot Token haipo! Weka telegram.botToken kwenye settings.js');
        return false;
    }

    if (providedSock) globalSock = providedSock;

    writeTelegramState(true);

    if (isPollingActive) {
        logInfo('Ina-restart Polling Engine kuondoa stuck connections...');
        isPollingActive = false;
        await new Promise(r => setTimeout(r, 1500));
    }

    loadWhatsappCommands();

    try {
        await axios.get(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`, { params: { drop_pending_updates: false } });

        const meRes = await axios.get(`${TELEGRAM_BASE_URL(token)}/getMe`);
        if (!meRes.data || !meRes.data.ok) {
            logError('Telegram Bot Token siyo sahihi!');
            return false;
        }

        const botInfo = meRes.data.result;
        logSuccess(`Bot Imeunganishwa kikamilifu: @${botInfo.username} (${botInfo.first_name})`);

        isPollingActive = true;
        runTelegramPollingLoop(token);
        return true;
    } catch (e) {
        logError(`Imeshindwa kuanzisha Telegram Bot: ${e.message}`);
        return false;
    }
}

function isTelegramBotRunning() {
    return isPollingActive;
}

function isTelegramBotEnabled() {
    return readTelegramState().enabled;
}

async function stopTelegramBot() {
    writeTelegramState(false);
    isPollingActive = false;
    pollingOffset = 0;
    logInfo('Telegram Bot imezimwa.');
    return true;
}

// ============================================================
// 🔄 POLLING LOOP ENGINE
// ============================================================

async function runTelegramPollingLoop(token) {
    logInfo('Polling Engine inasikiliza jumbe na commands...');

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
                    handleTelegramUpdate(update);
                }
            }
        } catch (err) {
            if (err.code !== 'ECONNABORTED' && isPollingActive) {
                logError(`Polling Connection Error: ${err.message}`);
                await new Promise(r => setTimeout(r, 4000));
            }
        }
    }
}

// ============================================================
// 📩 HANDLE INCOMING MESSAGES & CALLBACKS
// ============================================================

async function handleTelegramUpdate(update) {
    try {
        let message = update.message || update.edited_message;
        let callbackData = null;

        if (update.callback_query) {
            message = update.callback_query.message;
            callbackData = update.callback_query.data;
            // Answer Callback Query to stop loading spinner on buttons
            const token = settings.telegram?.botToken?.trim();
            axios.post(`${TELEGRAM_BASE_URL(token)}/answerCallbackQuery`, {
                callback_query_id: update.callback_query.id
            }).catch(() => {});
        }

        if (!message) return;

        const chatId = message.chat.id;
        const ownerId = String(settings.telegram?.ownerId || '').trim();
        const actor = update.callback_query?.from || message.from;
        if (ownerId && String(actor?.id || '') !== ownerId) {
            logDebug(`Telegram update imekataliwa kwa user ${actor?.id || 'unknown'}.`);
            return;
        }
        const text = callbackData || message.text || message.caption || '';

        if (!text) return;

        logDebug(`Received Msg [Chat: ${chatId}]: ${text}`);

        // Handle commands with ., /, !, # or direct button clicks
        if (/^[./!#]/.test(text.trim()) || callbackData) {
            const mockSock = createTelegramSock(chatId, message.message_id);
            await executeCommand(mockSock, chatId, message, text);
        }
    } catch (e) {
        logError(`Error in handleTelegramUpdate: ${e.message}`);
    }
}

// ============================================================
// 🛠️ AUTO-ADAPTER MOCK SOCK (WhatsApp -> Telegram Bridge)
// ============================================================

function createTelegramSock(chatId, messageId) {
    return {
        sendMessage: async (jid, content, options = {}) => {
            const targetChat = String(jid || chatId);
            const replyId = options.quoted?.message_id || messageId;

            // Normalize content structure
            if (typeof content === 'string') {
                return await sendTelegramMessage(targetChat, content, {}, replyId);
            }

            // Extract Caption/Text
            const caption = content.caption || content.text || '';

            // Handle WhatsApp Inline Buttons & Interactive Layouts
            const buttons = content.interactiveButtons || content.buttons || content.templateButtons || [];
            if (buttons.length > 0) {
                return await sendTelegramButtons(targetChat, caption, buttons, replyId);
            }

            // Handle Images (Buffer, Stream, URL, Local Path)
            if (content.image) {
                return await sendTelegramMediaSmart(targetChat, 'sendPhoto', 'photo', content.image, caption, replyId);
            }

            // Handle Audio / Voice (Buffer, Stream, URL, Local Path)
            if (content.audio) {
                const method = content.ptt ? 'sendVoice' : 'sendAudio';
                const field = content.ptt ? 'voice' : 'audio';
                return await sendTelegramMediaSmart(targetChat, method, field, content.audio, caption, replyId);
            }

            // Handle Video
            if (content.video) {
                return await sendTelegramMediaSmart(targetChat, 'sendVideo', 'video', content.video, caption, replyId);
            }

            // Handle Documents
            if (content.document) {
                return await sendTelegramMediaSmart(targetChat, 'sendDocument', 'document', content.document, caption, replyId, content.fileName);
            }

            // Fallback for Text
            if (content.text) {
                return await sendTelegramMessage(targetChat, content.text, {}, replyId);
            }

            return false;
        },
        sendMessageAck: async () => true,
        react: async (jid, { text }) => sendTelegramMessage(String(jid || chatId), text, {}, messageId),
        user: { id: 'telegram_bridge@s.whatsapp.net', name: 'Mickey Bridge' },
        profilePictureUrl: async (jid) => {
            const token = settings.telegram?.botToken?.trim();
            const targetId = String(jid || chatId).split('@')[0];
            if (!token || !targetId) throw new Error('Telegram profile target is missing');
            const photos = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUserProfilePhotos`, {
                params: { user_id: targetId, limit: 1 },
                ...AXIOS_DEFAULTS,
            });
            const sizes = photos.data?.result?.photos?.[0];
            const largest = sizes?.[sizes.length - 1];
            if (!largest?.file_id) throw new Error('Telegram user has no profile picture');
            const file = await axios.get(`${TELEGRAM_BASE_URL(token)}/getFile`, {
                params: { file_id: largest.file_id },
                ...AXIOS_DEFAULTS,
            });
            const filePath = file.data?.result?.file_path;
            if (!filePath) throw new Error('Telegram profile picture path unavailable');
            return `https://api.telegram.org/file/bot${token}/${filePath}`;
        },
        getChatId: () => String(chatId),
        getMessageId: () => messageId
    };
}

// ============================================================
// 🔘 AUTO-CONVERT WHATSAPP BUTTONS TO TELEGRAM INLINE KEYBOARD
// ============================================================

async function sendTelegramButtons(chatId, text, buttons, replyToId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
        const inlineKeyboard = [];
        let currentRow = [];

        for (const btn of buttons) {
            let label = 'Button';
            let actionData = 'none';
            let isUrl = false;

            // Auto-Parse WhatsApp Button Types
            if (btn.displayText) label = btn.displayText;
            else if (btn.buttonText?.displayText) label = btn.buttonText.displayText;
            else if (btn.display_text) label = btn.display_text;
            else if (btn.text) label = btn.text;

            if (btn.buttonId) actionData = btn.buttonId;
            else if (btn.id) actionData = btn.id;
            else if (btn.url) { actionData = btn.url; isUrl = true; }
            else if (btn.buttonParamsJson) {
                try {
                    const parsed = JSON.parse(btn.buttonParamsJson);
                    if (parsed.display_text) label = parsed.display_text;
                    if (parsed.url) { actionData = parsed.url; isUrl = true; }
                    else if (parsed.id) actionData = parsed.id;
                } catch (e) {}
            }

            if (!actionData || actionData === 'none') {
                actionData = `.${label.toLowerCase().replace(/\s+/g, '')}`;
            }

            const buttonObj = { text: label };
            if (isUrl) buttonObj.url = actionData;
            else buttonObj.callback_data = actionData;

            currentRow.push(buttonObj);
            if (currentRow.length === 2) {
                inlineKeyboard.push(currentRow);
                currentRow = [];
            }
        }
        if (currentRow.length > 0) inlineKeyboard.push(currentRow);

        const payload = {
            chat_id: String(chatId),
            text: text || 'Select an option:',
            reply_markup: { inline_keyboard: inlineKeyboard }
        };
        if (replyToId) payload.reply_to_message_id = replyToId;

        const res = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, payload, AXIOS_DEFAULTS);
        return res?.data?.ok === true;
    } catch (e) {
        logError(`sendTelegramButtons Error: ${e.message}`);
        return await sendTelegramMessage(chatId, text, {}, replyToId);
    }
}

// ============================================================
// 📤 SMART MEDIA SENDER (Buffers, URLs, Streams & Local Files)
// ============================================================

async function sendTelegramMediaSmart(chatId, apiMethod, fileField, mediaSource, caption = '', replyToId = null, fileName = 'file') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !mediaSource) return false;

    try {
        // Case 1: Simple URL string
        if (typeof mediaSource === 'string' && /^https?:\/\//i.test(mediaSource)) {
            const payload = {
                chat_id: String(chatId),
                [fileField]: mediaSource,
                caption: String(caption || '').slice(0, 1024)
            };
            if (replyToId) payload.reply_to_message_id = replyToId;

            const res = await axios.post(`${TELEGRAM_BASE_URL(token)}/${apiMethod}`, payload, AXIOS_DEFAULTS);
            return res?.data?.ok === true;
        }

        // Case 2: Buffer / Stream / Local Path Object { url: ... } or Direct Buffer
        const form = new FormData();
        form.append('chat_id', String(chatId));
        if (caption) form.append('caption', String(caption).slice(0, 1024));
        if (replyToId) form.append('reply_to_message_id', String(replyToId));

        let mediaData = mediaSource?.url || mediaSource;

        if (Buffer.isBuffer(mediaData)) {
            form.append(fileField, mediaData, { filename: `${fileName}.${getFileExtension(fileField)}` });
        } else if (typeof mediaData === 'string' && fs.existsSync(mediaData)) {
            form.append(fileField, fs.createReadStream(mediaData));
        } else if (typeof mediaData === 'string' && /^https?:\/\//i.test(mediaData)) {
            const response = await axios.get(mediaData, { responseType: 'arraybuffer' });
            form.append(fileField, Buffer.from(response.data), { filename: `${fileName}.${getFileExtension(fileField)}` });
        } else {
            logError(`Unsupported media format for ${fileField}`);
            return false;
        }

        const res = await axios.post(`${TELEGRAM_BASE_URL(token)}/${apiMethod}`, form, {
            headers: { ...form.getHeaders() },
            timeout: 120000
        });

        return res?.data?.ok === true;
    } catch (e) {
        logError(`Smart Media (${apiMethod}) Error: ${e.message}`);
        return false;
    }
}

function getFileExtension(field) {
    if (field === 'photo') return 'jpg';
    if (field === 'audio' || field === 'voice') return 'mp3';
    if (field === 'video') return 'mp4';
    return 'bin';
}

// ============================================================
// ⚡ EXECUTION ENGINE & COMMAND PARSER
// ============================================================

async function executeCommand(sock, chatId, message, commandText) {
    try {
        const parsed = parseCommandText(commandText || '');
        if (!parsed) return false;

        const target = whatsappCommands.get(parsed.name);
        if (!target || typeof target.execute !== 'function') {
            logDebug(`Command .${parsed.name} haikupatikana.`);
            return false;
        }

        logInfo(`Executing command .${parsed.name} for Telegram Chat ID: ${chatId}`);

        // Construct WhatsApp-like 'm' message object for Telegram
        const fakeMessage = {
            key: {
                remoteJid: String(chatId),
                fromMe: false,
                id: message.message_id
            },
            message: { conversation: commandText },
            chat: String(chatId),
            sender: String(actor?.id || chatId),
            pushName: actor?.first_name || 'Telegram User',
            reply: async (text) => sendTelegramMessage(chatId, text, {}, message.message_id)
        };

        const legacyArgumentOrder = new Set(['pair', 'status', 'unpair']);
        if (legacyArgumentOrder.has(parsed.name)) {
            await target.execute(sock, chatId, parsed.args || '', fakeMessage, {
                senderId: actor?.id || chatId,
                chatId,
                telegram: true,
            });
        } else {
            await target.execute(sock, chatId, fakeMessage, parsed.args || '', {
                senderId: message.from?.id || chatId,
                chatId,
                telegram: true,
            });
        }
        return true;
    } catch (error) {
        logError(`Execution Error (.${commandText}): ${error?.message || error}`);
        return false;
    }
}

function normalizeCommandName(command) {
    if (typeof command !== 'string') return '';
    return command.trim().replace(/^[\/!.#]+/, '').toLowerCase();
}

function parseCommandText(text) {
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    let cleanText = trimmed;
    if (/^[/.!#]/.test(cleanText)) {
        cleanText = cleanText.slice(1);
    }

    const [rawCommand, ...rest] = cleanText.split(/\s+/);
    const name = normalizeCommandName(rawCommand);
    if (!name) return null;

    return {
        name,
        args: rest.join(' ').trim(),
        raw: trimmed
    };
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

            let handler = null;
            if (typeof cmdModule === 'function') handler = cmdModule;
            else if (typeof cmdModule?.execute === 'function') handler = cmdModule.execute;
            else if (typeof cmdModule?.run === 'function') handler = cmdModule.run;
            else if (typeof cmdModule?.handler === 'function') handler = cmdModule.handler;
            else if (typeof cmdModule?.default === 'function') handler = cmdModule.default;
            else if (typeof cmdModule?.code === 'function') {
                handler = async (sock, chatId, message, args, options = {}) => cmdModule.code(
                    createCtx(sock, chatId, message, {
                        args: typeof args === 'string' ? args.trim().split(/\s+/).filter(Boolean) : args,
                        ...options,
                    }),
                );
            }

            if (handler) {
                const entry = { execute: handler };
                whatsappCommands.set(normalizeCommandName(baseName), entry);
                if (cmdModule.name) whatsappCommands.set(normalizeCommandName(cmdModule.name), entry);

                if (Array.isArray(cmdModule.alias || cmdModule.aliases)) {
                    (cmdModule.alias || cmdModule.aliases).forEach(a => {
                        whatsappCommands.set(normalizeCommandName(a), entry);
                    });
                }
            }
        } catch (e) {
            logError(`Imeshindwa ku-load command ${file}: ${e.message}`);
        }
    }
    logSuccess(`Zimepakiwa commands ${whatsappCommands.size} kikamilifu kwa ajili ya Telegram Bridge`);
}

// ============================================================
// 📤 TELEGRAM DIRECT SEND APIS
// ============================================================

async function sendTelegramMessage(chatId, text, options = {}, replyToMessageId = null) {
    const token = settings?.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
        const payload = {
            chat_id: String(chatId),
            text: String(text ?? '').slice(0, 4000),
            disable_web_page_preview: true,
            ...options
        };
        if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;

        const res = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, payload, AXIOS_DEFAULTS);
        return res?.data?.ok === true;
    } catch (error) {
        logError(`sendMessage Failed: ${error?.message}`);
        return false;
    }
}

module.exports = {
    startTelegramBot,
    stopTelegramBot,
    isTelegramBotRunning,
    isTelegramBotEnabled,
    sendTelegramMessage,
    sendTelegramButtons,
    executeCommand,
    loadWhatsappCommands
};
