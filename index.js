/**
 * MICKEY GLITCH - A WhatsApp Bot
 * CUSTOM PAIRING - Uses Custom 8-digit code (MICKDADY)
 * MODERNISED CONSOLE UI & GITHUB IMAGE CONNECTION
 * FIXED: Session preservation & Safe temp/tmp auto-cleanup
 * FIXED: Connection stability & Reconnection logic
 * FIXED: Memory management & Queue handling
 */

require("dotenv").config();
require("./settings");
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    delay,
    Browsers
} = require("@whiskeysockets/baileys");

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require("./main");
const { handleAnticall } = require("./commands/anticall");
const { getButtonId, isButtonResponse, autoDetectButtonCommand, isCommandId } = require("./lib/buttonLoader");
const store = require("./lib/lightweight_store");
const settings = require("./settings");
const MickeyHelper = require("./lib/Mickey");
const credentials = require("./lib/credentials");
const { MB, MBuilder } = require("./lib/mbuilder");

// Try to load telegram module
let startTelegramBot = null;
try {
    const telegramModule = require("./telegram-bot");
    startTelegramBot = telegramModule.startTelegramBot;
} catch (err) {
    // Silent fail if not found
}

// Try to load pair command
let pairCmdModule = null;
try {
    pairCmdModule = require("./commands/pair");
} catch (err) {
    // Silent fail if not found
}

// ────────────────────────────────────────────────
// LOGGER - COMPLETELY SILENT
// ────────────────────────────────────────────────
const pinoLogger = pino({
    level: 'fatal',
    transport: {
        target: 'pino/file',
        options: { destination: '/dev/null' }
    }
});

const silentLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    debug: () => {},
    trace: () => {},
    child: () => silentLogger,
    level: 'fatal'
};

// ────────────────────────────────────────────────
// GLOBAL SETTINGS
// ────────────────────────────────────────────────
const _botName = settings.botName || settings.botname || "𝙼𝚒𝚌𝚔𝚎yka 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.botname = _botName;
global.botName = _botName;
global.themeemoji = '•';

// ────────────────────────────────────────────────
// PATHS
// ────────────────────────────────────────────────
const SESSION_DIR = path.resolve(process.cwd(), 'session');
const TEMP_DIR = path.resolve(process.cwd(), 'temp');
const TMP_DIR = path.resolve(process.cwd(), 'tmp');
const CACHE_DIR = path.resolve(process.cwd(), 'cache');
const MEDIA_DIR = path.resolve(process.cwd(), 'media');

// ────────────────────────────────────────────────
// SAFE AUTO-CLEANUP FUNCTIONS
// ────────────────────────────────────────────────

// 1. CLEAN TEMP & TMP FILES - Every 30 seconds (Safe Interval)
function cleanTempAndTmpFiles() {
    try {
        const dirs = [TEMP_DIR, TMP_DIR, CACHE_DIR];
        let totalDeleted = 0;

        dirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                        totalDeleted++;
                    } catch (e) {
                        // Skip if file is currently locked/in use
                    }
                });
            }
        });

        if (totalDeleted > 0) {
            console.log(chalk.dim(`  [CLEANER] Purged ${totalDeleted} temp/tmp/cache files`));
        }
    } catch (err) {
        // Silent fail
    }
}

// 2. CHECK AND FIX CORRUPTED SESSION FILES ONLY (NEVER DELETE VALID FILES)
function checkAndFixCorruptedSession() {
    try {
        if (!fs.existsSync(SESSION_DIR)) return;

        const files = fs.readdirSync(SESSION_DIR);
        let corruptedCount = 0;

        files.forEach(file => {
            const filePath = path.join(SESSION_DIR, file);
            if (file.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.trim() === '' || content.trim() === '{}') {
                        fs.unlinkSync(filePath);
                        corruptedCount++;
                    } else {
                        JSON.parse(content); // Test json validity
                    }
                } catch (e) {
                    // Prevent deleting main creds if it can be recovered, but remove broken pre-keys
                    if (file !== 'creds.json') {
                        try {
                            fs.unlinkSync(filePath);
                            corruptedCount++;
                        } catch (e2) {}
                    }
                }
            }
        });

        if (corruptedCount > 0) {
            console.log(chalk.yellow(`  [CLEANER] Removed ${corruptedCount} corrupted session keys`));
        }
    } catch (err) {
        // Silent fail
    }
}

// 3. COMPLETE SESSION RESET (Only on absolute logout)
function resetCorruptedSession() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            console.log(chalk.yellow('  [CLEANER] Resetting revoked session...'));
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            console.log(chalk.green('  [CLEANER] Session reset complete!'));
        }
        ensureDirectories();
        return true;
    } catch (err) {
        console.log(chalk.red(`  [CLEANER] Failed to reset: ${err.message}`));
        return false;
    }
}

// 4. ENSURE DIRECTORIES EXIST
function ensureDirectories() {
    [SESSION_DIR, TEMP_DIR, TMP_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

// ────────────────────────────────────────────────
// START SAFE CLEANUP INTERVALS
// ────────────────────────────────────────────────
let cleanupInterval = null;
let sessionCheckInterval = null;

function startAggressiveCleanup() {
    // Clear existing intervals
    if (cleanupInterval) clearInterval(cleanupInterval);
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);

    // Clean temp/tmp files safely every 30 seconds (Avoids race conditions)
    cleanupInterval = setInterval(cleanTempAndTmpFiles, 30000);
    console.log(chalk.dim('  [CLEANER] Temp/Tmp cleaner active (every 30s)'));

    // Check corrupted session keys every 60 seconds
    sessionCheckInterval = setInterval(checkAndFixCorruptedSession, 60000);
    console.log(chalk.dim('  [CLEANER] Session integrity checker active (every 60s)'));
}

// ────────────────────────────────────────────────
// READLINE FOR CONSOLE INPUT
// ────────────────────────────────────────────────
let rl = null;
let isPairing = false;
let pairingAttempts = 0;

function createReadline() {
    if (rl) {
        try { rl.close(); } catch(e) {}
        rl = null;
    }
    rl = readline.createInterface({ 
        input: process.stdin, 
        output: process.stdout 
    });
    return rl;
}

async function askPhoneNumber() {
    return new Promise((resolve) => {
        const readlineInterface = createReadline();

        console.log('\n' + chalk.cyan.bold('┌────────────────────────────────────────────────────────┐'));
        console.log(chalk.cyan.bold('│') + chalk.bgCyan.black.bold('              📱 WHATSAPP PAIRING INTERFACE             ') + chalk.cyan.bold('│'));
        console.log(chalk.cyan.bold('└────────────────────────────────────────────────────────┘'));
        console.log(chalk.dim('  Ingiza namba ya simu ya WhatsApp (Mfano: 255612130873)'));
        console.log('');

        readlineInterface.question(chalk.cyan.bold('  ⚡ Namba yako ➜ '), (answer) => {
            let num = answer.trim().replace(/[^0-9]/g, '');
            if (!num.startsWith("255") && num.startsWith("0")) {
                num = "255" + num.substring(1);
            } else if (!num.startsWith("255")) {
                num = "255" + num;
            }
            UI.success(`Namba imethibitishwa: ${num}`);
            resolve(num);
        });
    });
}

// Initialize store
try {
    store.readFromFile();
} catch (err) {}
setInterval(() => {
    try { store.writeToFile(); } catch (err) {}
}, settings.storeWriteInterval || 10000);

// ────────────────────────────────────────────────
// ULTRA-MODERN UI COMPONENTS
// ────────────────────────────────────────────────
const UI = {
    success: (text) => console.log(chalk.greenBright.bold('  ✔ [SUCCESS] ') + chalk.white(text)),
    error: (text) => console.log(chalk.redBright.bold('  ✖ [ERROR]   ') + chalk.red(text)),
    warning: (text) => console.log(chalk.yellowBright.bold('  ⚠ [WARNING] ') + chalk.yellow(text)),
    info: (text) => console.log(chalk.blueBright.bold('  ℹ [INFO]    ') + chalk.dim(text)),
    divider: () => console.log(chalk.cyan.dim('  ─'.repeat(45))),
    banner: () => {
        console.clear();
        console.log(chalk.cyan.bold(`
   __  ____      _             ____ _ _ _ _     
  /  |/  (_)____/ /_____  __  / __/ /_  / __/ /_ v3.4
 / /|_/ / / __/  '_/ __ \\/ / / / _// / / / /_/ __ /
/_/  /_/_/\\__/_/\\_\\\\____/\\_ / /_/ /_/_/_/\\__/_/ /_/
                        /___/
        `));
        console.log(chalk.dim('       ⚡ Cyberpunk Core with Safe Session Management ⚡\n'));
    }
};

// ────────────────────────────────────────────────
// MAIN BOT FUNCTION
// ────────────────────────────────────────────────
let whatsappBot = null;
let isWhatsAppRunning = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let messageProcessingQueue = [];
let isProcessingQueue = false;

// ────────────────────────────────────────────────
// MESSAGE QUEUE PROCESSOR
// ────────────────────────────────────────────────
async function processMessageQueue() {
    if (isProcessingQueue || messageProcessingQueue.length === 0) return;
    isProcessingQueue = true;

    try {
        while (messageProcessingQueue.length > 0) {
            const item = messageProcessingQueue.shift();
            try {
                const { Mickey, chatUpdate } = item;
                await handleMessages(Mickey, chatUpdate, true);
            } catch (err) {
                // Complete silence
            }
            await delay(50);
        }
    } finally {
        isProcessingQueue = false;
    }
}

// ────────────────────────────────────────────────
// START BOT
// ────────────────────────────────────────────────
async function startMickeyBot() {
    if (isWhatsAppRunning && whatsappBot) return whatsappBot;

    try {
        ensureDirectories();

        UI.banner();

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.cyan('  » Core Engine :'), chalk.green(`Baileys v${version.join('.')}`));

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        const hasSession = state.creds?.registered === true;
        console.log(chalk.cyan('  » Security auth:'), hasSession ? chalk.green('Session Loaded ✓') : chalk.yellow('No active session found'));

        const msgRetryCounterCache = new NodeCache();

        // ────────────────────────────────────────────────
        // FIX: IMPROVED SOCKET CONFIGURATION
        // ────────────────────────────────────────────────
        const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: false, // Tunatumia Custom Pairing Code daima
            browser: ["MickeyBot", "Chrome", "120.0.0"], // Salama dhidi ya ban za WhatsApp
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pinoLogger)
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            // FIX: Reduced timeouts for better stability
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 15000,
            keepAliveIntervalMs: 30000,
            // FIX: Better retry handling
            maxRetries: 3,
            retryDelay: 5000,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            },
            getMessage: async (key) => {
                if (!key || !key.id) return undefined;
                const jid = key.remoteJid || key.participant || key.sender || '';
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || undefined;
            },
            msgRetryCounterCache
        });

        whatsappBot = Mickey;
        Mickey.ev.on("creds.update", saveCreds);
        store.bind(Mickey.ev);

        // ────────────────────────────────────────────────
        // Mfumo wa ALRICH kwa Ujumbe Wote Unaotoka (sendMessage)
        // ────────────────────────────────────────────────
        const originalSendMessage = Mickey.sendMessage.bind(Mickey);
        Mickey.sendMessage = async (jid, message, options = {}) => {
            if (message && typeof message === 'object') {
                // 1. Kama ni Text ya Kawaida
                if (typeof message.text === 'string') {
                    const aiRichPayload = MBuilder.buildAIRich(message.text);
                    if (aiRichPayload) {
<<<<<<< HEAD
                        if (message.contextInfo) {
                            aiRichPayload.messageContextInfo = {
                                ...aiRichPayload.messageContextInfo,
                                ...message.contextInfo,
                            };
                            aiRichPayload.botForwardedMessage.message.richResponseMessage.contextInfo = {
                                ...aiRichPayload.botForwardedMessage.message.richResponseMessage.contextInfo,
                                ...message.contextInfo,
                            };
                        }
                        const { additionalNodes, ...payload } = aiRichPayload;
                        const sendOptions = {
                            ...options,
                            ...(additionalNodes ? { additionalNodes: [
                                ...(options.additionalNodes || []),
                                ...additionalNodes,
                            ] } : {}),
                        };
                        const result = await originalSendMessage(jid, payload, sendOptions);
                        return result;
=======
                        return originalSendMessage(jid, {
                            ...aiRichPayload,
                            ...(message.contextInfo ? { contextInfo: message.contextInfo } : {}),
                        }, options);
>>>>>>> 966d5a23cd1bccc642913d85c08146ee758a8f66
                    }
                }
                // 2. Kama ni Ujumbe wenye Media (Image, Video, n.k.) na una Caption
                else if (typeof message.caption === 'string') {
                    const aiRichPayload = MBuilder.buildAIRich(message.caption);
                    if (aiRichPayload) {
                        // Tunaingiza ALRICH ndani ya text property ya media layout badala ya caption ya kawaida
                        return originalSendMessage(jid, {
                            ...message,
                            ...aiRichPayload
                        }, options);
                    }
                }
            }
            return originalSendMessage(jid, message, options);
        };

        // ────────────────────────────────────────────────
        // MESSAGE HANDLER
        // ────────────────────────────────────────────────
        Mickey.ev.on("messages.upsert", async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message) return;

                if (isButtonResponse && isButtonResponse(mek)) {
                    const buttonId = getButtonId && getButtonId(mek);
                    if (buttonId && isCommandId && isCommandId(buttonId)) {
                        const command = autoDetectButtonCommand && autoDetectButtonCommand(mek);
                        if (command) {
                            mek.message.conversation = command;
                            mek.message.extendedTextMessage = null;
                            messageProcessingQueue.push({ Mickey, chatUpdate });
                            if (!isProcessingQueue) processMessageQueue();
                            return;
                        }
                    }
                }

                if (mek.key?.remoteJid === "status@broadcast") {
                    if (handleStatus) await handleStatus(Mickey, chatUpdate);
                    return;
                }

                messageProcessingQueue.push({ Mickey, chatUpdate });
                if (!isProcessingQueue) processMessageQueue();

            } catch (err) {
                // Complete silence
            }
        });

        // ────────────────────────────────────────────────
        // CALL HANDLER
        // ────────────────────────────────────────────────
        Mickey.ev.on("call", async (callData) => {
            try {
                if (handleAnticall) await handleAnticall(Mickey, { call: callData });
            } catch (err) {
                // Silent
            }
        });

        // ────────────────────────────────────────────────
        // GROUP PARTICIPANT HANDLER
        // ────────────────────────────────────────────────
        Mickey.ev.on("group-participants.update", async (update) => {
            try {
                if (handleGroupParticipantUpdate) await handleGroupParticipantUpdate(Mickey, update);
            } catch (err) {
                // Silent
            }
        });

        // ────────────────────────────────────────────────
        // ERROR HANDLER - COMPLETELY SILENT
        // ────────────────────────────────────────────────
        Mickey.ev.on("error", (err) => {
            // FIX: Log only critical errors
            if (err.message && err.message.includes('timeout')) {
                console.log(chalk.dim(`  [NETWORK] Connection timeout, will retry...`));
            }
            return;
        });

        // ────────────────────────────────────────────────
        // FIX: CONNECTION HANDLER WITH STABILITY IMPROVEMENTS
        // ────────────────────────────────────────────────
        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                isWhatsAppRunning = true;
                reconnectAttempts = 0;
                isPairing = false;
                pairingAttempts = 0;

                // Clear any pending reconnect timers
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }

                console.log('\n' + chalk.bgGreen.black.bold("  🚀 CORE ONLINE  ") + chalk.greenBright(" System synchronized.\n"));

                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

                console.log(chalk.cyan('  ┌─[ BOT METRICS ]'));
                console.log(chalk.cyan('  │ ') + chalk.white(`User-ID  : ${chalk.greenBright(Mickey.user.id.split(':')[0])}`));
                console.log(chalk.cyan('  │ ') + chalk.white(`Memory   : ${chalk.yellow(ramUsage + ' MB')}`));
                console.log(chalk.cyan('  └────────────────'));
                UI.divider();

                try {
                    await MickeyHelper.handleConnection(Mickey, UI);
                } catch (e) {
                    // Silent
                }

                if (rl) {
                    try { rl.close(); } catch(e) {}
                    rl = null;
                }
            }

            if (connection === "close") {
                isWhatsAppRunning = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || 'Unknown error';

                // FIX: Log actual disconnect reason
                console.log(chalk.yellow(`  [DISCONNECT] Code: ${statusCode} | ${errorMessage}`));

                if (statusCode === DisconnectReason.loggedOut) {
                    UI.error('Session revoked by user. Clearing auth folder...');
                    resetCorruptedSession();
                    await delay(3000);
                    return startMickeyBot();
                }

                // FIX: Better reconnection with exponential backoff
                if (reconnectAttempts < 10) {
                    // FIX: Exponential backoff with jitter
                    const baseDelay = Math.min(5000 + (reconnectAttempts * 3000), 45000);
                    const jitter = Math.random() * 2000;
                    const delayTime = baseDelay + jitter;

                    reconnectAttempts++;

                    console.log(chalk.cyan(`  🔄 [RECONNECT] Attempt ${reconnectAttempts}/10 in ${(delayTime/1000).toFixed(1)}s...`));

                    // Clear any existing timer
                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer);
                        reconnectTimer = null;
                    }

                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        startMickeyBot();
                    }, delayTime);
                } else {
                    UI.error('Max reconnection attempts reached. Restarting process...');
                    // FIX: Graceful exit to let process manager restart
                    process.exit(0);
                }
            }
        });

        // ────────────────────────────────────────────────
        // PAIRING - TELEGRAM or CONSOLE SUPPORT
        // ────────────────────────────────────────────────
        if (!hasSession && !isPairing) {
            isPairing = true;
            let phoneNumber = null;
            let telegramPairingChatId = null;

            // Check if pairing was requested via Telegram
            const currentCreds = credentials.readCreds();
            if (currentCreds && !currentCreds.paired && currentCreds.phoneNumber) {
                // Telegram pairing in progress
                phoneNumber = currentCreds.phoneNumber;
                telegramPairingChatId = currentCreds.telegramChatId;
                UI.info(`Telegram pairing detected: ${phoneNumber}`);
            } else {
                // Console pairing (fallback)
                phoneNumber = await askPhoneNumber();
            }

            UI.info('Initiating pairing sequence...');
            await delay(3000);

            // Handle QR code from pairing
            const qrHandler = async (qr) => {
                if (telegramPairingChatId && pairCmdModule && pairCmdModule.handleQRCode) {
                    try {
                        await pairCmdModule.handleQRCode(qr, telegramPairingChatId);
                    } catch (e) {
                        console.log(chalk.dim(`  [PAIRING] QR telegram send: ${e.message}`));
                    }
                } else {
                    // Console fallback - show QR in terminal
                    console.log(chalk.magenta.bold('\n  ┌────────────────────────────────────────────────────────┐'));
                    console.log(chalk.magenta.bold('  │') + chalk.bgMagenta.black.bold('                    📱 QR CODE GENERATED                    ') + chalk.magenta.bold('  │'));
                    console.log(chalk.magenta.bold('  └────────────────────────────────────────────────────────┘\n'));
                }
            };

            // Register temporary QR handler
            const tempQRHandler = (qr) => qrHandler(qr);
            Mickey.ev.on('connection.update', async (update) => {
                if (update.qr && tempQRHandler) {
                    await tempQRHandler(update.qr);
                }
            });

            try {
                await Mickey.requestPairingCode(phoneNumber, "MICKDADY");

                console.log('\n' + chalk.magenta.bold('  ┌────────────────────────────────────────────────────────┐'));
                console.log(chalk.magenta.bold('  │') + chalk.bgMagenta.black.bold('              🔐 CUSTOM WHATSAPP PAIRING CODE             ') + chalk.magenta.bold('  │'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Nenda: WhatsApp ➜ Settings ➜ Linked Devices ➜ Link    ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Kisha chagua "Link with phone number instead"        ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.greenBright.bold('               👉    M I C K D A D Y    👈               ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  └────────────────────────────────────────────────────────┘\n'));

                UI.info('Waiting for authorization...');

                // Set pairing credentials
                credentials.setPairingInProgress(phoneNumber, telegramPairingChatId);

                const keepAliveInterval = setInterval(() => {
                    if (!isWhatsAppRunning) {
                        try { Mickey.sendPresenceUpdate('available'); } catch (e) {}
                    } else {
                        clearInterval(keepAliveInterval);
                        // On successful connection, mark as paired
                        if (telegramPairingChatId) {
                            credentials.markAsPaired(phoneNumber, telegramPairingChatId);
                            if (pairCmdModule && pairCmdModule.handlePairingSuccess) {
                                pairCmdModule.handlePairingSuccess(phoneNumber, telegramPairingChatId, `session_${Date.now()}`).catch(e => 
                                    console.log(chalk.dim(`  [PAIRING] Telegram notification: ${e.message}`))
                                );
                            }
                        }
                    }
                }, 5000);

            } catch (err) {
                UI.error('Pairing failed: ' + err.message);
                // Notify Telegram if applicable
                if (telegramPairingChatId && pairCmdModule && pairCmdModule.handlePairingFailure) {
                    try {
                        await pairCmdModule.handlePairingFailure(telegramPairingChatId, err);
                    } catch (e) {
                        console.log(chalk.dim(`  [PAIRING] Telegram error notification: ${e.message}`));
                    }
                }
                credentials.clearPairing();
                if (pairingAttempts < 3) {
                    pairingAttempts++;
                    isPairing = false;
                    await delay(5000);
                    return startMickeyBot();
                }
            }
        }

        return Mickey;

    } catch (err) {
        UI.error('Startup error: ' + err.message);
        await delay(5000);
        return startMickeyBot();
    }
}

// ────────────────────────────────────────────────
// FIX: KEEP ALIVE & MONITORING WITH BETTER PRESENCE
// ────────────────────────────────────────────────
let monitorInterval = null;

function startKeepAlive() {
    if (monitorInterval) clearInterval(monitorInterval);

    monitorInterval = setInterval(() => {
        if (whatsappBot && isWhatsAppRunning) {
            try { 
                whatsappBot.sendPresenceUpdate('available'); 
            } catch (err) {
                // If presence fails, connection might be dead
                console.log(chalk.dim('  [KEEPALIVE] Connection may be unstable...'));
            }
        }

        // FIX: Less frequent logging
        if (Math.floor(Date.now() / (15 * 60 * 1000)) % 4 === 0) {
            const status = isWhatsAppRunning ? chalk.greenBright('ONLINE') : chalk.redBright('OFFLINE');
            const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            console.log(chalk.dim(`  [MONITOR] Status: [${status}] | Uptime: ${hours}h${minutes}m | RAM: ${ram}MB`));
        }
    }, 15 * 60 * 1000); // FIX: 15 min instead of 10
}

// ────────────────────────────────────────────────
// FIX: MEMORY MANAGEMENT - BETTER QUEUE HANDLING
// ────────────────────────────────────────────────
setInterval(() => {
    if (messageProcessingQueue.length > 100) {
        const dropped = messageProcessingQueue.length - 50;
        messageProcessingQueue = messageProcessingQueue.slice(-50);
        console.log(chalk.yellow(`  [QUEUE] Dropped ${dropped} old messages to prevent memory leak`));
    }
}, 60000);

// ────────────────────────────────────────────────
// FIX: GRACEFUL SHUTDOWN HANDLERS
// ────────────────────────────────────────────────
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n  👋 Shutting down gracefully...'));

    // Clear all timers
    if (monitorInterval) clearInterval(monitorInterval);
    if (cleanupInterval) clearInterval(cleanupInterval);
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);

    // End WhatsApp connection
    if (whatsappBot) { 
        try { 
            await whatsappBot.end(); 
        } catch(e) {} 
    }

    // Close readline
    if (rl) { 
        try { rl.close(); } catch(e) {} 
    }

    process.exit(0);
});

// FIX: Handle unhandled rejections and exceptions gracefully
process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red('  [FATAL] Unhandled Rejection:'), reason);
    // Don't crash, just log
});

process.on('uncaughtException', (error) => {
    console.log(chalk.red('  [FATAL] Uncaught Exception:'), error.message);
    // Don't crash, just log
});

// ────────────────────────────────────────────────
// INITIALIZATION
// ────────────────────────────────────────────────
async function initializeBot() {
    // Kazi ya kusafisha ifanye kazi mwanzo kabisa
    startAggressiveCleanup();

    UI.banner();
    startKeepAlive();

    const hasTelegramToken = settings.telegram?.botToken && settings.telegram.botToken?.trim()?.length > 0;

    if (hasTelegramToken && startTelegramBot) {
        try {
            await startTelegramBot();
            UI.success('Telegram operational.');
        } catch (err) {
            UI.warning(`Telegram error: ${err.message}`);
        }
    } else {
        UI.info('WhatsApp standalone mode.');
    }

    await startMickeyBot();
}

initializeBot().catch(err => {
    UI.error(`Fatal: ${err.message}`);
    process.exit(1);
});
