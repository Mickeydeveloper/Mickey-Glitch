/**
 * MICKEY GLITCH - A WhatsApp Bot
 * CUSTOM PAIRING - Uses Custom 8-digit code (MICKDADY)
 * MODERNISED CONSOLE UI & GITHUB IMAGE CONNECTION
 * 
 * VERSION: 4.0 - SESSION PERSISTENCE & STABILITY UPGRADE
 * - Session haifutiki wakati wa update
 * - Auto-recovery improved
 * - Manual session clear only
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
    delay 
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
// LOGGER - SILENT FOR CLEAN CONSOLE
// ────────────────────────────────────────────────
const pinoLogger = pino({ level: 'silent' });

// --- Global Settings ---
const _botName = settings.botName || settings.botname || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.botname = _botName;
global.botName = _botName;
global.themeemoji = '•';

// ────────────────────────────────────────────────
// PATHS & AUTO CLEANUP
// ────────────────────────────────────────────────
const SESSION_DIR = path.resolve(process.cwd(), 'session');
const TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const ALT_TEMP_DIR = path.resolve(process.cwd(), 'temp');
const CACHE_DIR = path.resolve(process.cwd(), 'cache');
const MEDIA_DIR = path.resolve(process.cwd(), 'media');
const SESSION_BACKUP_DIR = path.resolve(process.cwd(), 'session_backup');
const CLEANUP_INTERVAL_MS = 39 * 60 * 1000;
const OLD_SESSION_AGE_MS = 24 * 60 * 60 * 1000;
const TEMP_FILE_AGE_MS = 60 * 60 * 1000;

function ensureDirectories() {
    [SESSION_DIR, CACHE_DIR, MEDIA_DIR, TEMP_DIR, ALT_TEMP_DIR, SESSION_BACKUP_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

function removePathIfExists(targetPath) {
    if (!fs.existsSync(targetPath)) return false;
    try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        return true;
    } catch (err) {
        return false;
    }
}

function pruneDirectoryFiles(targetPath, maxAgeMs = TEMP_FILE_AGE_MS) {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        return 0;
    }

    let removed = 0;
    try {
        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        const now = Date.now();
        entries.forEach(entry => {
            const entryPath = path.join(targetPath, entry.name);
            try {
                const stats = fs.statSync(entryPath);
                if (now - stats.mtimeMs > maxAgeMs) {
                    if (entry.isDirectory()) {
                        fs.rmSync(entryPath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(entryPath);
                    }
                    removed++;
                }
            } catch (e) {}
        });
    } catch (err) {}

    return removed;
}

function pruneOldSessionArtifacts() {
    try {
        if (!fs.existsSync(SESSION_BACKUP_DIR)) return 0;

        const now = Date.now();
        const entries = fs.readdirSync(SESSION_BACKUP_DIR, { withFileTypes: true });
        let pruned = 0;

        entries.forEach(entry => {
            const entryPath = path.join(SESSION_BACKUP_DIR, entry.name);
            try {
                const stats = fs.statSync(entryPath);
                if (now - stats.mtimeMs > OLD_SESSION_AGE_MS) {
                    fs.rmSync(entryPath, { recursive: true, force: true });
                    pruned++;
                }
            } catch (e) {}
        });

        return pruned;
    } catch (err) {
        return 0;
    }
}

function autoClean() {
    try {
        ensureDirectories();

        let removed = 0;
        [TEMP_DIR, ALT_TEMP_DIR].forEach(target => {
            removed += pruneDirectoryFiles(target);
        });

        const pruned = pruneOldSessionArtifacts();

        if (removed > 0 || pruned > 0) {
            console.log(chalk.cyan(`▓▒░ [CLEANER] lightweight cleanup finished: pruned ${removed} temp files and ${pruned} old session artifacts.`));
        }
    } catch (err) {
        console.log(chalk.dim(`  [CLEANER] lightweight cleanup skipped: ${err.message}`));
    }
}

// ────────────────────────────────────────────────
// SESSION MANAGEMENT WITH BACKUP & PERSISTENCE
// ────────────────────────────────────────────────
function backupSession() {
    try {
        if (!fs.existsSync(SESSION_DIR)) return false;

        fs.mkdirSync(SESSION_BACKUP_DIR, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(SESSION_BACKUP_DIR, `session_${timestamp}`);
        
        // Copy session directory to backup
        fs.cpSync(SESSION_DIR, backupPath, { recursive: true, force: true });
        
        // Keep only last 5 backups
        const backups = fs.readdirSync(SESSION_BACKUP_DIR)
            .filter(f => f.startsWith('session_'))
            .sort()
            .reverse();
        
        if (backups.length > 5) {
            backups.slice(5).forEach(b => {
                fs.rmSync(path.join(SESSION_BACKUP_DIR, b), { recursive: true, force: true });
            });
        }
        
        console.log(chalk.dim(`  [BACKUP] Session backed up to: ${backupPath}`));
        return true;
    } catch (err) {
        console.log(chalk.dim(`  [BACKUP] Failed: ${err.message}`));
        return false;
    }
}

function clearSession(force = false) {
    try {
        if (!fs.existsSync(SESSION_DIR)) {
            ensureDirectories();
            return true;
        }

        // Check if auto-clear is disabled (default: disabled)
        const autoClearEnabled = process.env.ENABLE_AUTO_CLEAR_SESSION === 'true';
        
        if (!force && !autoClearEnabled) {
            UI.info('🛡️ Session clearing is DISABLED by default (ENABLE_AUTO_CLEAR_SESSION=true to enable)');
            UI.info('📌 To manually clear: delete session folder or use --clear-session flag');
            return false;
        }

        // Backup before clearing
        if (force || autoClearEnabled) {
            UI.warning('Creating session backup before clearing...');
            backupSession();
            
            UI.warning('Clearing session directory...');
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            UI.success('Session directory wiped successfully!');
        }
        
        ensureDirectories();
        return true;
    } catch (err) {
        UI.error(`Failed to clear session: ${err.message}`);
        return false;
    }
}

// Function to validate session without auto-deleting
async function validateAndRepairSession() {
    try {
        if (!fs.existsSync(SESSION_DIR)) {
            ensureDirectories();
            return true;
        }

        const files = fs.readdirSync(SESSION_DIR);
        if (files.length === 0) {
            ensureDirectories();
            return true;
        }

        // Check if creds.json exists and is valid
        const credsPath = path.join(SESSION_DIR, 'creds.json');
        if (fs.existsSync(credsPath)) {
            try {
                const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                
                // Check if credentials exist but might be invalid
                if (!credsData.creds || !credsData.creds.registered) {
                    UI.warning('⚠️ Session credentials appear invalid, but PRESERVING session...');
                    UI.info('🔄 Attempting to use existing session despite validation warning');
                    
                    // Create backup of invalid session for debugging
                    try {
                        const debugPath = path.join(SESSION_BACKUP_DIR, `invalid_session_${Date.now()}.json`);
                        fs.copyFileSync(credsPath, debugPath);
                        UI.dim(`📁 Invalid session saved for debugging: ${debugPath}`);
                    } catch (e) {}
                    
                    return true; // Don't delete, try to use anyway
                }
                
                UI.success('✅ Session credentials validated successfully');
                return true;
                
            } catch (e) {
                UI.warning('⚠️ Session credentials file corrupted, but PRESERVING session...');
                UI.info('🔄 Attempting session recovery without deletion');
                
                // Create backup of corrupted file
                try {
                    const backupPath = path.join(SESSION_BACKUP_DIR, `corrupted_creds_${Date.now()}.json`);
                    fs.copyFileSync(credsPath, backupPath);
                    UI.dim(`📁 Corrupted file saved: ${backupPath}`);
                } catch (backupErr) {
                    // Ignore backup errors
                }
                
                // Try to recover by attempting to use the session anyway
                UI.info('🔄 Continuing with session despite corruption...');
                return true;
            }
        }

        return true;
    } catch (err) {
        UI.error(`Session validation error: ${err.message}`);
        UI.info('🔄 Continuing with session despite validation error...');
        return true; // Don't delete on validation error
    }
}

// ────────────────────────────────────────────────
// READLINE FOR CONSOLE INPUT
// ────────────────────────────────────────────────
let rl = null;
let isPairing = false;
let pairingAttempts = 0;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50;
const MAX_PAIRING_ATTEMPTS = 5;

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
    dim: (text) => console.log(chalk.dim(`  ${text}`)),
    divider: () => console.log(chalk.cyan.dim('  ─'.repeat(45))),
    banner: () => {
        console.clear();
        console.log(chalk.cyan.bold(`
   __  ____      _             ____ _ _ _ _     
  /  |/  (_)____/ /_____  __  / __/ /_  / __/ /_ v4.0
 / /|_/ / / __/  '_/ __ \\/ / / / _// / / / /_/ __ /
/_/  /_/_/\\__/_/\\_\\\\____/\\_ / /_/ /_/_/_/\\__/_/ /_/
                        /___/
        `));
        console.log(chalk.dim('       ⚡ Session Persistence & Stability Core Engaged ⚡\n'));
        console.log(chalk.green('  🛡️  Session Auto-Clear: ') + (process.env.ENABLE_AUTO_CLEAR_SESSION === 'true' ? chalk.red('ENABLED') : chalk.green('DISABLED ✓')));
        console.log(chalk.dim('  📌  Session persists across updates unless manually cleared\n'));
    }
};

// ────────────────────────────────────────────────
// ERROR RECOVERY SYSTEM
// ────────────────────────────────────────────────
class ErrorRecovery {
    constructor() {
        this.errorLogs = [];
        this.maxLogs = 50;
        this.criticalErrors = 0;
        this.lastErrorTime = 0;
        this.recoveryActions = {
            'ECONNRESET': this.handleNetworkError,
            'ETIMEDOUT': this.handleNetworkError,
            'SOCKET': this.handleNetworkError,
            'DECRYPT': this.handleSessionWarning,
            'SESSION': this.handleSessionWarning,
            'AUTH': this.handleSessionWarning
        };
    }

    logError(error, context = '') {
        const timestamp = new Date().toISOString();
        const errorEntry = {
            timestamp,
            message: error.message || String(error),
            stack: error.stack,
            context
        };

        this.errorLogs.push(errorEntry);
        if (this.errorLogs.length > this.maxLogs) {
            this.errorLogs.shift();
        }

        // Track critical errors
        if (this.isCriticalError(error)) {
            this.criticalErrors++;
            this.lastErrorTime = Date.now();
        }

        // Write to error log file
        try {
            const logPath = path.join(process.cwd(), 'error_logs.json');
            const existing = fs.existsSync(logPath) ? 
                JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
            existing.push(errorEntry);
            if (existing.length > 100) existing.shift();
            fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
        } catch (e) {}
    }

    isCriticalError(error) {
        const message = error.message || String(error);
        const criticalKeywords = ['FATAL', 'CRITICAL', 'MANDATORY', 'REQUIRED'];
        return criticalKeywords.some(keyword => message.includes(keyword));
    }

    handleNetworkError(error, bot) {
        UI.info('🌐 Network error detected - auto-recovery initiated');
        return { action: 'reconnect', delay: 3000 };
    }

    handleSessionWarning(error, bot) {
        UI.warning('🔑 Session warning detected - attempting recovery without deletion');
        return { action: 'reconnect', delay: 2000 };
    }

    shouldAutoFix(error) {
        const message = error.message || String(error);
        const autoFixable = [
            'ECONNRESET', 'ETIMEDOUT', 'SOCKET', 
            'decrypt', 'session', 'auth', 'timeout',
            'connection', 'network', 'SSL'
        ];
        return autoFixable.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    getRecoveryAction(error, bot) {
        const message = error.message || String(error);

        for (const [key, handler] of Object.entries(this.recoveryActions)) {
            if (message.includes(key)) {
                return handler(error, bot);
            }
        }

        // Default recovery
        if (this.shouldAutoFix(error)) {
            return { action: 'reconnect', delay: 5000 };
        }

        return { action: 'none', delay: 0 };
    }

    resetCounters() {
        this.criticalErrors = 0;
        this.errorLogs = [];
    }

    getErrorStats() {
        return {
            totalErrors: this.errorLogs.length,
            criticalErrors: this.criticalErrors,
            lastErrorTime: this.lastErrorTime
        };
    }
}

const errorRecovery = new ErrorRecovery();

// ────────────────────────────────────────────────
// MAIN BOT FUNCTION
// ────────────────────────────────────────────────
let whatsappBot = null;
let isWhatsAppRunning = false;
let isReconnecting = false;
let botStartTime = Date.now();

async function startMickeyBot() {
    if (isWhatsAppRunning && whatsappBot && whatsappBot.user) {
        return whatsappBot;
    }

    try {
        ensureDirectories();
        autoClean();

        // Check for manual clear flag
        if (process.argv.includes('--clear-session') || process.argv.includes('-c')) {
            UI.warning('Manual session clear requested via command line');
            const confirmed = await new Promise((resolve) => {
                const rl = createReadline();
                rl.question(chalk.yellow('  Type "CONFIRM" to clear session: '), (answer) => {
                    resolve(answer.trim() === 'CONFIRM');
                    rl.close();
                });
            });
            
            if (confirmed) {
                clearSession(true);
                UI.success('Session cleared manually. Restarting...');
                process.exit(0);
            } else {
                UI.info('Session clear cancelled.');
            }
        }

        // Validate session BEFORE starting (without auto-deleting)
        await validateAndRepairSession();

        UI.banner();

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.cyan('  » Core Engine :'), chalk.green(`Baileys v${version.join('.')}`));

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        const hasSession = state.creds?.registered === true;
        console.log(chalk.cyan('  » Security auth:'), hasSession ? chalk.green('✅ Session Loaded ✓') : chalk.yellow('🔄 No active session found - Pairing Required'));

        const msgRetryCounterCache = new NodeCache();

        const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'silent' }))
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
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

        // --- Enhanced Message Handler with Auto-Recovery ---
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
                            await handleMessages(Mickey, chatUpdate, true);
                            return;
                        }
                    }
                }

                if (mek.key?.remoteJid === "status@broadcast") {
                    if (handleStatus) await handleStatus(Mickey, chatUpdate);
                    return;
                }

                if (handleMessages) await handleMessages(Mickey, chatUpdate, true);
            } catch (err) {
                errorRecovery.logError(err, 'messages.upsert');

                if (errorRecovery.shouldAutoFix(err)) {
                    UI.info(`🔄 Auto-recovering from message error: ${err.message?.substring(0, 50)}...`);
                    await delay(1000);
                } else if (err.message) {
                    console.log(chalk.yellow(`  [Message Handler] ${err.message?.substring(0, 60)}...`));
                }
            }
        });

        // --- Enhanced Call Handler ---
        Mickey.ev.on("call", async (callData) => {
            try {
                if (handleAnticall) await handleAnticall(Mickey, { call: callData });
            } catch (err) {
                errorRecovery.logError(err, 'call');
                console.log(chalk.dim(`  [Call Handler] Error: ${err.message?.substring(0, 40)}`));
            }
        });

        // --- Enhanced Group Participant Handler ---
        Mickey.ev.on("group-participants.update", async (update) => {
            try {
                if (handleGroupParticipantUpdate) await handleGroupParticipantUpdate(Mickey, update);
            } catch (err) {
                errorRecovery.logError(err, 'group-participants.update');
                console.log(chalk.dim(`  [Group Update] Error: ${err.message?.substring(0, 40)}`));
            }
        });

        // --- Enhanced Error Event Handler with Auto-Fix ---
        Mickey.ev.on("error", (err) => {
            errorRecovery.logError(err, 'socket.error');

            if (errorRecovery.shouldAutoFix(err)) {
                UI.info(`🔄 Auto-fixing error: ${err.message?.substring(0, 40)}...`);
                // Don't clear session, just reconnect
            } else {
                console.log(chalk.yellow(`  [Error] ${err.message}`));
            }
        });

        // --- Enhanced Connection Handler with Session Persistence ---
        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                isWhatsAppRunning = true;
                reconnectAttempts = 0;
                isPairing = false;
                pairingAttempts = 0;
                isReconnecting = false;
                errorRecovery.resetCounters();
                botStartTime = Date.now();

                console.log('\n' + chalk.bgGreen.black.bold("  🚀 CORE ONLINE  ") + chalk.greenBright(" System successfully synchronized with WhatsApp matrix.\n"));

                const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                const uptime = Math.floor((Date.now() - botStartTime) / 1000);

                console.log(chalk.cyan('  ┌─[ BOT METRICS ]'));
                console.log(chalk.cyan('  │ ') + chalk.white(`User-ID  : ${chalk.greenBright(Mickey.user.id.split(':')[0])}`));
                console.log(chalk.cyan('  │ ') + chalk.white(`Memory   : ${chalk.yellow(ramUsage + ' MB')}`));
                console.log(chalk.cyan('  │ ') + chalk.white(`Uptime   : ${chalk.yellow(UI.formatUptime(uptime))}`));
                console.log(chalk.cyan('  │ ') + chalk.white(`Errors   : ${chalk.yellow(errorRecovery.getErrorStats().totalErrors)}`));
                console.log(chalk.cyan('  │ ') + chalk.white(`Session  : ${chalk.green('PERSISTED ✓')}`));
                console.log(chalk.cyan('  └────────────────'));
                UI.divider();

                // Connection notification and auto-join handled by helper
                try {
                    await MickeyHelper.handleConnection(Mickey, UI);
                } catch (e) {
                    UI.warning('Connection helper failed: ' + (e.message || e));
                }

                if (rl) {
                    try { rl.close(); } catch(e) {}
                    rl = null;
                }
            }

            if (connection === "close") {
                isWhatsAppRunning = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || 'Unknown';
                const error = lastDisconnect?.error;

                // Log the error for recovery
                if (error) {
                    errorRecovery.logError(error, 'connection.close');
                }

                // 🛡️ SESSION PERSISTENCE: Don't auto-clear for any session errors
                const isDecryptError = errorMessage?.includes('decrypt') || 
                                      errorMessage?.includes('no session') ||
                                      errorMessage?.includes('session') ||
                                      errorMessage?.includes('auth') ||
                                      errorMessage?.includes('credentials');

                if (isDecryptError) {
                    UI.warning(`🔑 Session warning: ${errorMessage.substring(0, 40)}...`);
                    UI.info('🛡️ PRESERVING session - attempting reconnection without clearing');
                    UI.info('📌 If issues persist, manually clear with: node bot.js --clear-session');
                    
                    await delay(2000);
                    reconnectAttempts++;
                    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        const delayTime = Math.min(2000 + (reconnectAttempts * 1500), 60000);
                        UI.info(`🔄 Reconnecting in ${(delayTime/1000).toFixed(1)}s... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                        await delay(delayTime);
                        return startMickeyBot();
                    }
                    return;
                }

                if (statusCode === DisconnectReason.loggedOut) {
                    UI.error('🔴 Session logged out permanently.');
                    UI.info('📌 You need to re-pair manually.');
                    UI.info('📌 To clear session and re-pair: node bot.js --clear-session');
                    // Don't auto-clear, just attempt reconnect with existing session
                    reconnectAttempts++;
                    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        const delayTime = Math.min(5000 + (reconnectAttempts * 2000), 60000);
                        UI.info(`🔄 Attempting reconnection in ${(delayTime/1000).toFixed(1)}s...`);
                        await delay(delayTime);
                        return startMickeyBot();
                    }
                    return;
                }

                if (statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionLost) {
                    UI.info('🌐 Connection lost, auto-reconnecting...');
                }

                // Exponential backoff with intelligent recovery - WITHOUT clearing session
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    const delayTime = Math.min(2000 + (reconnectAttempts * 1500), 60000);
                    reconnectAttempts++;

                    // Reset attempts if we've been running for a while
                    if (Date.now() - botStartTime > 3600000) {
                        reconnectAttempts = Math.max(0, reconnectAttempts - 5);
                    }

                    console.log(chalk.cyan(`  🔄 [RECONNECT] Attempting re-entry in ${(delayTime/1000).toFixed(1)}s... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`));
                    await delay(delayTime);

                    // 🛡️ NO SESSION CLEAR - just reconnect
                    return startMickeyBot();
                } else {
                    UI.error('⚠️ Max reconnection threshold reached.');
                    UI.info('📌 Please restart the bot or clear session manually if needed.');
                    UI.info('📌 To clear: node bot.js --clear-session');
                    reconnectAttempts = 0;
                    await delay(30000); // Wait 30 seconds before retry
                    return startMickeyBot();
                }
            }
        });

        // ────────────────────────────────────────────────
        // PAIRING - INJECTING CUSTOM CODE "MICKDADY"
        // ────────────────────────────────────────────────
        if (!hasSession && !isPairing) {
            isPairing = true;

            const phoneNumber = await askPhoneNumber();
            UI.info('🔑 Intercepting token stream and pushing custom signature...');

            await delay(3000);

            try {
                // Force custom code MICKDADY
                await Mickey.requestPairingCode(phoneNumber, "MICKDADY");

                console.log('\n' + chalk.magenta.bold('  ┌────────────────────────────────────────────────────────┐'));
                console.log(chalk.magenta.bold('  │') + chalk.bgMagenta.black.bold('              🔐 CUSTOM WHATSAPP PAIRING CODE             ') + chalk.magenta.bold('  │'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Nenda: WhatsApp ➜ Settings ➜ Linked Devices ➜ Link    ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Kisha chagua "Link with phone number instead"        ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.greenBright.bold('               👉    M I C K D A D Y    👈               ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  └────────────────────────────────────────────────────────┘\n'));

                UI.info('⏳ Waiting for authorization handshakes... (10-30s)');

                const keepAliveInterval = setInterval(() => {
                    if (!isWhatsAppRunning) {
                        try { Mickey.sendPresenceUpdate('available'); } catch (e) {}
                    } else {
                        clearInterval(keepAliveInterval);
                    }
                }, 5000);

            } catch (err) {
                UI.error('❌ Pairing pipeline blocked: ' + err.message);
                errorRecovery.logError(err, 'pairing');

                if (pairingAttempts < MAX_PAIRING_ATTEMPTS) {
                    pairingAttempts++;
                    isPairing = false;
                    UI.info(`🔄 Retrying pairing (${pairingAttempts}/${MAX_PAIRING_ATTEMPTS})...`);
                    await delay(5000);
                    return startMickeyBot();
                } else {
                    UI.error('❌ Max pairing attempts reached. Please restart manually.');
                    UI.info('📌 To clear session: node bot.js --clear-session');
                    process.exit(1);
                }
            }
        }

        return Mickey;

    } catch (err) {
        UI.error('❌ Critical exception detected: ' + err.message);
        errorRecovery.logError(err, 'startMickeyBot');

        // Try to recover without clearing session
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            UI.info('🔄 Attempting recovery in 5 seconds...');
            await delay(5000);
            return startMickeyBot();
        } else {
            UI.error('❌ Unable to recover from critical error.');
            UI.info('📌 Try manually restarting or clearing session: node bot.js --clear-session');
            process.exit(1);
        }
    }
}

// Helper function for formatting uptime
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
}

// ────────────────────────────────────────────────
// KEEP ALIVE & MONITORING WITH AUTO-HEAL
// ────────────────────────────────────────────────
function startKeepAlive() {
    autoClean();
    setInterval(autoClean, CLEANUP_INTERVAL_MS);

    // Check bot health every 2 minutes
    setInterval(() => {
        if (!whatsappBot || !isWhatsAppRunning) {
            UI.warning('🔄 Bot health check failed - attempting recovery...');
            if (!isReconnecting) {
                isReconnecting = true;
                setTimeout(() => {
                    isReconnecting = false;
                    startMickeyBot();
                }, 3000);
            }
            return;
        }

        // Send presence update to keep connection alive
        try { 
            whatsappBot.sendPresenceUpdate('available'); 
        } catch (err) {
            UI.warning('Presence update failed - connection may be stale');
        }

        // Monitor memory usage and auto-clean if too high
        const ramUsage = process.memoryUsage().rss / 1024 / 1024;
        if (ramUsage > 500) { // 500MB threshold
            UI.warning(`⚠️ High memory usage detected (${ramUsage.toFixed(1)}MB) - cleaning...`);
            autoClean();
            if (global.gc) {
                try { global.gc(); } catch(e) {}
            }
        }

        // Display status
        const status = isWhatsAppRunning ? chalk.greenBright('ONLINE ✅') : chalk.redBright('OFFLINE ❌');
        const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const errors = errorRecovery.getErrorStats().totalErrors;
        console.log(chalk.dim(`  [MONITOR] Status: [${status}] | Core RAM: ${ram}MB | Errors: ${errors} | Session: ${chalk.green('PERSISTED')}`));
    }, 2 * 60 * 1000);

    // Deep health check every 10 minutes
    setInterval(async () => {
        if (whatsappBot && isWhatsAppRunning) {
            try {
                // Ping test
                const pingResult = await Promise.race([
                    whatsappBot.sendPresenceUpdate('available'),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 5000))
                ]);
            } catch (err) {
                UI.warning('🔴 Health check failed - connection may be dead');
                if (!isReconnecting) {
                    isReconnecting = true;
                    setTimeout(() => {
                        isReconnecting = false;
                        startMickeyBot();
                    }, 5000);
                }
            }
        }
    }, 10 * 60 * 1000);
}

// ────────────────────────────────────────────────
// MANUAL SESSION MANAGEMENT COMMANDS
// ────────────────────────────────────────────────
async function showHelp() {
    console.log(chalk.cyan.bold('\n  📖 MICKEY GLITCH - COMMANDS'));
    console.log(chalk.dim('  ─'.repeat(40)));
    console.log(chalk.white('  --clear-session, -c     Clear WhatsApp session'));
    console.log(chalk.white('  --help, -h              Show this help'));
    console.log(chalk.white('  --version, -v           Show version'));
    console.log(chalk.dim('  ─'.repeat(40)));
    console.log(chalk.dim('  Session Status: ') + (fs.existsSync(SESSION_DIR) ? chalk.green('Active ✅') : chalk.yellow('None ❌')));
    console.log(chalk.dim('  Auto-Clear: ') + (process.env.ENABLE_AUTO_CLEAR_SESSION === 'true' ? chalk.red('ENABLED ⚠️') : chalk.green('DISABLED ✅')));
    console.log('');
}

// ────────────────────────────────────────────────
// INITIALIZATION ENTRYPOINT
// ────────────────────────────────────────────────
function isTempPathError(err) {
    const message = (err?.message || String(err || '')).toLowerCase();
    return message.includes('enoent') && (message.includes('/temp/') || message.includes('/tmp/') || message.includes('temp/') || message.includes('tmp/'));
}

async function initializeBot() {
    ensureDirectories();

    // Check for help flags
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        await showHelp();
        process.exit(0);
    }
    
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        console.log(chalk.green('MICKEY GLITCH v4.0 - Session Persistence Edition'));
        process.exit(0);
    }

    UI.banner();
    startKeepAlive();

    const hasTelegramToken = settings.telegram?.botToken && settings.telegram.botToken?.trim()?.length > 0;
    let telegramStarted = false;

    if (hasTelegramToken && startTelegramBot) {
        try {
            await startTelegramBot();
            UI.success('📡 Telegram mainframe operational.');
            telegramStarted = true;
        } catch (err) {
            UI.warning(`⚠️ Telegram linkage error: ${err.message}`);
            errorRecovery.logError(err, 'telegram.init');
        }
    } else {
        UI.info('📱 WhatsApp standalone operation active.');
    }

    // Start main bot
    await startMickeyBot();

    // Enhanced shutdown handler
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n  👋 Gracefully terminating bot processes...'));
        if (whatsappBot) { 
            try { 
                await whatsappBot.sendPresenceUpdate('unavailable');
                await delay(1000);
                await whatsappBot.end(); 
            } catch(e) {}
        }
        if (rl) { try { rl.close(); } catch(e) {} }

        // Save any pending data
        try { store.writeToFile(); } catch(e) {}

        console.log(chalk.green('  ✅ Clean shutdown complete'));
        process.exit(0);
    });

    // Uncaught exception handler
    process.on('uncaughtException', async (err) => {
        console.error(chalk.red('❌ Uncaught Exception:'), err);
        errorRecovery.logError(err, 'uncaughtException');

        if (isTempPathError(err)) {
            ensureDirectories();
            UI.warning('🗂️ Temporary media directory issue detected; recreated temp paths and continuing...');
            return;
        }

        if (errorRecovery.shouldAutoFix(err)) {
            UI.info('🔄 Attempting auto-recovery from uncaught exception...');
            await delay(3000);
            if (!isReconnecting) {
                isReconnecting = true;
                setTimeout(() => {
                    isReconnecting = false;
                    startMickeyBot();
                }, 5000);
            }
        } else {
            UI.error('❌ Critical uncaught exception - restart required');
            UI.info('📌 To clear session: node bot.js --clear-session');
            setTimeout(() => process.exit(1), 3000);
        }
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', async (err) => {
        console.error(chalk.red('❌ Unhandled Rejection:'), err);
        errorRecovery.logError(err, 'unhandledRejection');

        if (errorRecovery.shouldAutoFix(err)) {
            UI.info('🔄 Auto-recovering from unhandled rejection...');
            await delay(2000);
        }
    });
}

// Add formatUptime to UI for use in connection update
UI.formatUptime = formatUptime;

initializeBot().catch(err => {
    UI.error(`💀 Fatal crash: ${err.message}`);
    errorRecovery.logError(err, 'initializeBot.fatal');

    // Last resort recovery
    setTimeout(() => {
        UI.info('🔄 Attempting final recovery...');
        initializeBot();
    }, 10000);
});

// Export for potential external use
module.exports = { startMickeyBot, UI, errorRecovery, clearSession, backupSession };