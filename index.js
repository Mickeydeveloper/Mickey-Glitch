/**
 * MICKEY GLITCH - A WhatsApp Bot
 * CUSTOM PAIRING - Uses Custom 8-digit code (MICKDADY)
 * MODERNISED CONSOLE UI & GITHUB IMAGE CONNECTION
 * FIXED: Aggressive auto-cleanup for session/temp/tmp files
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

// Try to load telegram module
let startTelegramBot = null;
try {
    const telegramModule = require("./telegram-bot");
    startTelegramBot = telegramModule.startTelegramBot;
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
const _botName = settings.botName || settings.botname || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
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
// AGGRESSIVE AUTO-CLEANUP FUNCTIONS
// ────────────────────────────────────────────────

// 1. CLEAN TEMP & TMP FILES - Every 3 seconds
function cleanTempAndTmpFiles() {
    try {
        const dirs = [TEMP_DIR, TMP_DIR];
        let totalDeleted = 0;
        
        dirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        // Delete all files in temp/tmp regardless of age
                        if (stats.isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                        totalDeleted++;
                    } catch (e) {
                        // Skip if file is in use
                    }
                });
            }
        });
        
        if (totalDeleted > 0) {
            console.log(chalk.dim(`  [CLEANER] Purged ${totalDeleted} temp/tmp files`));
        }
    } catch (err) {
        // Silent fail
    }
}

// 2. CLEAN OLD SESSION FILES - Every 5 minutes
function cleanOldSessionFiles() {
    try {
        if (!fs.existsSync(SESSION_DIR)) return;
        
        const files = fs.readdirSync(SESSION_DIR);
        const now = Date.now();
        const SESSION_MAX_AGE = 5 * 60 * 1000; // 5 minutes
        let deletedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(SESSION_DIR, file);
            try {
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtimeMs;
                
                // Delete session files older than 5 minutes
                if (fileAge > SESSION_MAX_AGE) {
                    if (stats.isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    deletedCount++;
                }
            } catch (e) {
                // If file is corrupted or can't be read, delete it
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                } catch (e2) {}
            }
        });
        
        if (deletedCount > 0) {
            console.log(chalk.dim(`  [CLEANER] Removed ${deletedCount} old session files (>5min)`));
        }
    } catch (err) {
        // Silent fail
    }
}

// 3. CHECK AND FIX CORRUPTED SESSION FILES
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
                        JSON.parse(content);
                    }
                } catch (e) {
                    // Corrupted JSON - delete it
                    try {
                        fs.unlinkSync(filePath);
                        corruptedCount++;
                    } catch (e2) {}
                }
            }
        });
        
        if (corruptedCount > 0) {
            console.log(chalk.yellow(`  [CLEANER] Removed ${corruptedCount} corrupted session files`));
        }
    } catch (err) {
        // Silent fail
    }
}

// 4. COMPLETE SESSION RESET (when too corrupted)
function resetCorruptedSession() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            console.log(chalk.yellow('  [CLEANER] Resetting corrupted session...'));
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

// 5. ENSURE DIRECTORIES EXIST
function ensureDirectories() {
    [SESSION_DIR, TEMP_DIR, TMP_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

// ────────────────────────────────────────────────
// START AGGRESSIVE CLEANUP INTERVALS
// ────────────────────────────────────────────────
function startAggressiveCleanup() {
    // Clean temp/tmp every 3 seconds
    setInterval(cleanTempAndTmpFiles, 3000);
    console.log(chalk.dim('  [CLEANER] Temp/Tmp cleaner active (every 3s)'));

    // Check corrupted session files every 10 seconds
    setInterval(checkAndFixCorruptedSession, 10000);
    console.log(chalk.dim('  [CLEANER] Session corruption checker active (every 10s)'));

    // Clean old session files every 5 minutes
    setInterval(cleanOldSessionFiles, 5 * 60 * 1000);
    console.log(chalk.dim('  [CLEANER] Old session cleaner active (every 5min)'));

    // Full session reset if too many corrupted files - every 1 minute
    let corruptionCounter = 0;
    setInterval(() => {
        try {
            if (!fs.existsSync(SESSION_DIR)) return;
            const files = fs.readdirSync(SESSION_DIR);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            // If more than 50% of files are corrupted
            let corrupted = 0;
            jsonFiles.forEach(file => {
                const filePath = path.join(SESSION_DIR, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.trim() === '' || content.trim() === '{}') {
                        corrupted++;
                    } else {
                        JSON.parse(content);
                    }
                } catch (e) {
                    corrupted++;
                }
            });
            
            if (jsonFiles.length > 0 && (corrupted / jsonFiles.length) > 0.5) {
                corruptionCounter++;
                if (corruptionCounter >= 3) {
                    resetCorruptedSession();
                    corruptionCounter = 0;
                }
            } else {
                corruptionCounter = 0;
            }
        } catch (e) {}
    }, 60000);
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
            if (!num.startsWith("255")) {
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
        console.log(chalk.dim('       ⚡ Cyberpunk Core with Aggressive Cleanup ⚡\n'));
    }
};

// ────────────────────────────────────────────────
// MAIN BOT FUNCTION
// ────────────────────────────────────────────────
let whatsappBot = null;
let isWhatsAppRunning = false;
let reconnectAttempts = 0;
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

                 const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: !pairingCode, // Kama pairingCode ipo, haita-print QR
            browser: ["Ubuntu", "Chrome", "20.0.04"], // Salama zaidi dhidi ya ban
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys, 
                    pino({ level: 'fatal' }).child({ level: 'fatal' })
                )
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 60000,
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

        // ────────────────────────────────────────────
        // MESSAGE HANDLER
        // ────────────────────────────────────────────
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

        // ────────────────────────────────────────────
        // CALL HANDLER
        // ────────────────────────────────────────────
        Mickey.ev.on("call", async (callData) => {
            try {
                if (handleAnticall) await handleAnticall(Mickey, { call: callData });
            } catch (err) {
                // Silent
            }
        });

        // ────────────────────────────────────────────
        // GROUP PARTICIPANT HANDLER
        // ────────────────────────────────────────────
        Mickey.ev.on("group-participants.update", async (update) => {
            try {
                if (handleGroupParticipantUpdate) await handleGroupParticipantUpdate(Mickey, update);
            } catch (err) {
                // Silent
            }
        });

        // ────────────────────────────────────────────
        // ERROR HANDLER - COMPLETELY SILENT
        // ────────────────────────────────────────────
        Mickey.ev.on("error", (err) => {
            return; // Complete silence
        });

        // ────────────────────────────────────────────
        // CONNECTION HANDLER
        // ────────────────────────────────────────────
        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                isWhatsAppRunning = true;
                reconnectAttempts = 0;
                isPairing = false;
                pairingAttempts = 0;

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
                const errorMessage = lastDisconnect?.error?.message || '';

                if (statusCode === DisconnectReason.loggedOut) {
                    UI.error('Session revoked. Clearing...');
                    resetCorruptedSession();
                    await delay(3000);
                    return startMickeyBot();
                }

                if (reconnectAttempts < 10) {
                    const delayTime = Math.min(5000 + (reconnectAttempts * 2000), 30000);
                    reconnectAttempts++;
                    if (reconnectAttempts % 3 === 0 || reconnectAttempts === 1) {
                        console.log(chalk.cyan(`  🔄 [RECONNECT] Attempt ${reconnectAttempts}/10...`));
                    }
                    await delay(delayTime);
                    return startMickeyBot();
                } else {
                    UI.error('Max reconnection reached.');
                    process.exit(1);
                }
            }
        });

        // ────────────────────────────────────────────
        // PAIRING - CUSTOM CODE "MICKDADY"
        // ────────────────────────────────────────────
        if (!hasSession && !isPairing) {
            isPairing = true;

            const phoneNumber = await askPhoneNumber();
            UI.info('Initiating pairing sequence...');

            await delay(3000);

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

                const keepAliveInterval = setInterval(() => {
                    if (!isWhatsAppRunning) {
                        try { Mickey.sendPresenceUpdate('available'); } catch (e) {}
                    } else {
                        clearInterval(keepAliveInterval);
                    }
                }, 5000);

            } catch (err) {
                UI.error('Pairing failed: ' + err.message);
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
// KEEP ALIVE & MONITORING
// ────────────────────────────────────────────────
let monitorInterval = null;

function startKeepAlive() {
    if (monitorInterval) clearInterval(monitorInterval);
    
    monitorInterval = setInterval(() => {
        if (whatsappBot && isWhatsAppRunning) {
            try { whatsappBot.sendPresenceUpdate('available'); } catch (err) {}
        }
        if (Math.floor(Date.now() / (10 * 60 * 1000)) % 3 === 0) {
            const status = isWhatsAppRunning ? chalk.greenBright('ONLINE') : chalk.redBright('OFFLINE');
            const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
            console.log(chalk.dim(`  [MONITOR] Status: [${status}] | RAM: ${ram}MB`));
        }
    }, 10 * 60 * 1000);
}

// ────────────────────────────────────────────────
// MEMORY MANAGEMENT
// ────────────────────────────────────────────────
setInterval(() => {
    if (messageProcessingQueue.length > 100) {
        messageProcessingQueue = messageProcessingQueue.slice(-50);
    }
}, 60000);

// ────────────────────────────────────────────────
// INITIALIZATION
// ────────────────────────────────────────────────
async function initializeBot() {
    // Start aggressive cleanup FIRST
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

    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n  👋 Shutting down...'));
        if (whatsappBot) { try { await whatsappBot.end(); } catch(e) {} }
        if (rl) { try { rl.close(); } catch(e) {} }
        process.exit(0);
    });
}

initializeBot().catch(err => {
    UI.error(`Fatal: ${err.message}`);
    process.exit(1);
});