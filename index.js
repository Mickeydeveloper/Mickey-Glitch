/**
 * MICKEY GLITCH - A WhatsApp Bot
 * FULLY FIXED & IMPROVED VERSION
 * [STABLE | AUTO-CLEAN | ERROR RESISTANT]
 */

require("dotenv").config();
require("./settings");
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");
const os = require("os");
const cron = require('node-cron');
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

// ============================================================
// 🎨 COLORED UI COMPONENTS - RANGI ZA KUVUTIA
// ============================================================
const UI = {
    // Header kubwa
    mainHeader: () => {
        console.clear();
        console.log(chalk.bgCyan.black.bold('═══════════════════════════════════════════════════════════════'));
        console.log(chalk.bgCyan.black.bold('          🚀 MICKEY GLITCH BOT v3.0 - STABLE EDITION 🚀          '));
        console.log(chalk.bgCyan.black.bold('═══════════════════════════════════════════════════════════════'));
        console.log('');
    },
    
    // Sanduku la taarifa
    infoBox: (title, content, color = 'blue') => {
        const colors = {
            blue: chalk.blue,
            green: chalk.green,
            red: chalk.red,
            yellow: chalk.yellow,
            cyan: chalk.cyan,
            magenta: chalk.magenta
        };
        const c = colors[color] || chalk.white;
        const border = c('╔' + '═'.repeat(58) + '╗');
        const bottom = c('╚' + '═'.repeat(58) + '╝');
        console.log(border);
        console.log(c(`║ ${chalk.bold(title)}`.padEnd(60) + '║'));
        console.log(c('╠' + '═'.repeat(58) + '╣'));
        if (Array.isArray(content)) {
            content.forEach(line => {
                console.log(c(`║ ${line}`.padEnd(60) + '║'));
            });
        } else {
            console.log(c(`║ ${content}`.padEnd(60) + '║'));
        }
        console.log(bottom);
    },
    
    // Sanduku la pairing code
    pairingBox: (code) => {
        console.log('');
        console.log(chalk.bgGreen.black.bold('╔═══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.bgGreen.black.bold('║                    🔐 PAIRING CODE GENERATED 🔐               ║'));
        console.log(chalk.bgGreen.black.bold('╚═══════════════════════════════════════════════════════════════╝'));
        console.log('');
        console.log(chalk.white.bold('  ┌─────────────────────────────────────────────────────────────┐'));
        console.log(chalk.white.bold('  │  ') + chalk.cyan.bold('YOUR 8-DIGIT PAIRING CODE:') + chalk.white.bold('                                    │'));
        console.log(chalk.white.bold('  │                                                             │'));
        console.log(chalk.white.bold('  │         ') + chalk.bgWhite.black.bold(`     ${code}     `) + chalk.white.bold('                                          │'));
        console.log(chalk.white.bold('  │                                                             │'));
        console.log(chalk.white.bold('  └─────────────────────────────────────────────────────────────┘'));
        console.log('');
        console.log(chalk.yellow.bold('  ⚠️  MAELEKEZO:'));
        console.log(chalk.gray('    1. Fungua WhatsApp kwenye simu yako'));
        console.log(chalk.gray('    2. Nenda Settings → Linked Devices'));
        console.log(chalk.gray('    3. Bonyeza "Link a Device"'));
        console.log(chalk.gray(`    4. Weka code hii: ${chalk.white.bold(code)}`));
        console.log('');
        console.log(chalk.cyan.bold('  ⏳ Inasubiri muunganiko...'));
        console.log('');
    },
    
    // Sanduku la kuingiza namba
    phoneInputBox: () => {
        console.log('');
        console.log(chalk.bgYellow.black.bold('╔═══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.bgYellow.black.bold('║                    📱 PHONE NUMBER REQUIRED 📱               ║'));
        console.log(chalk.bgYellow.black.bold('╚═══════════════════════════════════════════════════════════════╝'));
        console.log('');
        console.log(chalk.white.bold('  ┌─────────────────────────────────────────────────────────────┐'));
        console.log(chalk.white.bold('  │  FORMAT: ') + chalk.green.bold('255XXXXXXXXX') + chalk.white.bold(' (Tanzania)                           │'));
        console.log(chalk.white.bold('  │  EXAMPLE: ') + chalk.green.bold('255612130873') + chalk.white.bold('                                         │'));
        console.log(chalk.white.bold('  │                                                             │'));
        console.log(chalk.white.bold('  │  ') + chalk.cyan.bold('💡 Hakikisha namba ni sahihi kabla ya kuendelea') + chalk.white.bold('                 │'));
        console.log(chalk.white.bold('  └─────────────────────────────────────────────────────────────┘'));
        console.log('');
    },
    
    // Success message
    success: (text) => console.log(chalk.green.bold('✅ ') + chalk.green(text)),
    error: (text) => console.log(chalk.red.bold('❌ ') + chalk.red(text)),
    warning: (text) => console.log(chalk.yellow.bold('⚠️ ') + chalk.yellow(text)),
    info: (text) => console.log(chalk.blue.bold('ℹ️ ') + chalk.blue(text)),
    debug: (text) => console.log(chalk.gray('🐛 ') + chalk.gray(text)),
    
    // Mstari wa kutenganisha
    divider: () => console.log(chalk.gray('─'.repeat(70))),
    
    // Header ndogo
    smallHeader: (text, color = 'cyan') => {
        const colors = {
            cyan: chalk.bgCyan,
            green: chalk.bgGreen,
            red: chalk.bgRed,
            yellow: chalk.bgYellow,
            blue: chalk.bgBlue
        };
        const bg = colors[color] || chalk.bgCyan;
        console.log(bg.black.bold(` ${text} `));
    }
};

// ============================================================
// 🧹 SESSION MANAGEMENT - KUZURURA NA KUSAFISHA
// ============================================================
const SESSION_DIR = path.resolve(process.cwd(), 'session');
const CREDS_PATH = path.join(SESSION_DIR, 'creds.json');
const TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const TEMP_DIR_ALT = path.resolve(process.cwd(), 'temp');
const CACHE_DIR = path.resolve(process.cwd(), 'cache');

// Kusafisha old session files
function cleanOldSessions() {
    try {
        if (!fs.existsSync(SESSION_DIR)) return;
        
        const files = fs.readdirSync(SESSION_DIR);
        let cleaned = 0;
        
        files.forEach(file => {
            const filePath = path.join(SESSION_DIR, file);
            const stats = fs.statSync(filePath);
            const now = Date.now();
            const fileAge = now - stats.mtimeMs;
            
            // Delete files older than 7 days (except creds.json)
            if (file !== 'creds.json' && fileAge > 7 * 24 * 60 * 60 * 1000) {
                fs.unlinkSync(filePath);
                cleaned++;
            }
        });
        
        if (cleaned > 0) {
            UI.info(`🧹 Cleaned ${cleaned} old session file(s)`);
        }
    } catch (err) {
        UI.debug(`Session cleanup error: ${err.message}`);
    }
}

// Kusafisha tmp na temp folders
function cleanTempFolders() {
    const foldersToClean = [TEMP_DIR, TEMP_DIR_ALT, CACHE_DIR];
    
    foldersToClean.forEach(folder => {
        try {
            if (fs.existsSync(folder)) {
                const files = fs.readdirSync(folder);
                let deleted = 0;
                
                files.forEach(file => {
                    const filePath = path.join(folder, file);
                    try {
                        const stats = fs.statSync(filePath);
                        // Delete files older than 1 hour
                        if (Date.now() - stats.mtimeMs > 60 * 60 * 1000) {
                            if (stats.isDirectory()) {
                                fs.rmSync(filePath, { recursive: true, force: true });
                            } else {
                                fs.unlinkSync(filePath);
                            }
                            deleted++;
                        }
                    } catch (e) {}
                });
                
                if (deleted > 0) {
                    UI.debug(`🧹 Cleaned ${deleted} old file(s) from ${path.basename(folder)}`);
                }
            } else {
                fs.mkdirSync(folder, { recursive: true });
            }
        } catch (err) {
            UI.debug(`Temp folder cleanup error (${folder}): ${err.message}`);
        }
    });
}

// Validate and fix session
async function validateAndFixSession() {
    try {
        if (!fs.existsSync(CREDS_PATH)) {
            UI.info('No existing session found. New pairing required.');
            return false;
        }
        
        // Check if creds.json is valid JSON
        const credsContent = fs.readFileSync(CREDS_PATH, 'utf8');
        JSON.parse(credsContent);
        
        // Check session directory has required files
        const sessionFiles = fs.readdirSync(SESSION_DIR);
        const hasKeys = sessionFiles.some(f => f.includes('keys') || f.includes('creds'));
        
        if (!hasKeys) {
            UI.warning('Session files corrupted. Cleaning...');
            clearSessionDirectory('corrupted session');
            return false;
        }
        
        UI.success('Session validated successfully!');
        return true;
    } catch (err) {
        UI.warning(`Session validation failed: ${err.message}`);
        clearSessionDirectory('validation failed');
        return false;
    }
}

function clearSessionDirectory(reason = 'unknown') {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        UI.warning(`🧹 Cleared WhatsApp auth session (${reason})`);
    } catch (err) {
        UI.error(`Failed to clear session: ${err.message}`);
    }
}

// Auto cleanup scheduler
function startAutoCleanup() {
    // Run every 6 hours
    cron.schedule('0 */6 * * *', () => {
        UI.info('🔄 Running scheduled cleanup...');
        cleanOldSessions();
        cleanTempFolders();
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            UI.debug('Manual garbage collection executed');
        }
    });
    
    // Run temp cleanup every hour
    cron.schedule('0 * * * *', () => {
        cleanTempFolders();
    });
    
    UI.success('🕐 Auto-cleanup scheduler started (every 6 hours for sessions, hourly for temp)');
}

// ============================================================
// 📊 SYSTEM MONITORING
// ============================================================
let reconnectAttempts = 0;
let lastReconnectTime = 0;
let isShuttingDown = false;
let connectionState = 'idle';
let whatsappBot = null;
let whatsappBootstrapPromise = null;
let lastPairingCode = null;
let botStartTime = Date.now();

// Monitor system health
function startSystemMonitor() {
    setInterval(() => {
        const usageMB = process.memoryUsage().rss / 1024 / 1024;
        const uptime = Math.floor((Date.now() - botStartTime) / 1000);
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        
        // Memory warning
        if (usageMB > 450 && !isShuttingDown) {
            UI.warning(`RAM usage high: ${usageMB.toFixed(2)}MB`);
            if (global.gc) global.gc();
            
            if (usageMB > 550) {
                UI.error(`Critical memory usage: ${usageMB.toFixed(2)}MB - Forcing restart`);
                softRestart();
            }
        }
        
        // Log status every hour
        if (uptime % 3600 < 10 && connectionState === 'open') {
            UI.info(`📊 System Status - Uptime: ${uptimeHours}h ${uptimeMinutes}m | RAM: ${usageMB.toFixed(2)}MB | State: ${connectionState}`);
        }
    }, 30000);
}

// ============================================================
// 🔄 RESTART & ERROR HANDLING
// ============================================================
async function softRestart() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    UI.warning('🔄 Performing soft restart...');
    
    if (whatsappBot) {
        try {
            await whatsappBot.end();
        } catch(e) {}
        whatsappBot = null;
    }
    
    whatsappBootstrapPromise = null;
    reconnectAttempts = 0;
    
    setTimeout(() => {
        isShuttingDown = false;
        startMickeyBot().catch(err => {
            UI.error(`Restart failed: ${err.message}`);
            setTimeout(() => {
                isShuttingDown = false;
                startMickeyBot();
            }, 30000);
        });
    }, 10000);
}

// ============================================================
// 📱 PAIRING INTERFACE
// ============================================================
const rl = process.stdin.isTTY ? readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
}) : null;

const question = (text, isNumber = false) => {
    if (rl) {
        const prompt = isNumber ? chalk.magenta.bold(`📱 ${text} `) : chalk.cyan.bold(`❓ ${text} `);
        return new Promise(resolve => rl.question(prompt, resolve));
    }
    return Promise.resolve(settings.ownerNumber || "255615858685");
};

function normalizeWhatsappNumber(phoneNumber) {
    const cleaned = String(phoneNumber || '').replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('255')) return cleaned;
    if (cleaned.startsWith('0')) return `255${cleaned.substring(1)}`;
    if (cleaned.startsWith('+255')) return cleaned.substring(1);
    return `255${cleaned}`;
}

// ============================================================
// 🚀 BOT INITIALIZATION
// ============================================================
const pinoLogger = pino({ level: 'silent' });
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.themeemoji = '•';

// Initialize store with error handling
try {
    store.readFromFile();
} catch (err) {
    UI.warning(`Store read failed: ${err.message}`);
}
setInterval(() => {
    try {
        store.writeToFile();
    } catch (err) {}
}, settings.storeWriteInterval || 60000);

async function chooseStartupMode() {
    UI.mainHeader();
    
    // Check for existing valid session
    const hasValidSession = await validateAndFixSession();
    if (hasValidSession) {
        UI.success('✓ Valid session detected! Starting bot...');
        return 'whatsapp';
    }
    
    UI.infoBox('🚀 STARTUP MODE SELECTION', [
        '1) WhatsApp Bot - Connect to WhatsApp',
        '2) Telegram Bot - Connect to Telegram',
        '3) Settings.js Mode - Use config file'
    ], 'cyan');
    
    console.log('');
    const answer = (await question('Choose (1/2/3) [3]: ')).trim();
    
    if (answer === '1') return 'whatsapp';
    if (answer === '2') return 'telegram';
    return 'whatsapp';
}

async function startMickeyBot(options = {}) {
    if (whatsappBot && connectionState === 'open') return whatsappBot;
    if (whatsappBootstrapPromise) return whatsappBootstrapPromise;
    
    // Anti-reconnect spam protection
    const now = Date.now();
    if (now - lastReconnectTime < 30000 && reconnectAttempts > 3) {
        UI.error('Too many reconnect attempts! Waiting 2 minutes...');
        await delay(120000);
        reconnectAttempts = 0;
    }
    lastReconnectTime = now;
    
    whatsappBootstrapPromise = (async () => {
        try {
            // Clean temp before starting
            cleanTempFolders();
            
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
            
            const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
            
            const Mickey = makeWASocket({
                version,
                logger: pinoLogger,
                printQRInTerminal: false,
                browser: Browsers.macOS('Desktop'),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pinoLogger)
                },
                markOnlineOnConnect: true,
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                generateHighQualityLinkPreview: false,
                cachedGroupMetadata: async (jid) => undefined,
                connectTimeoutMs: 90000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 45000,
                patchMessageBeforeSending: (message) => {
                    const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                    if (requiresPatch) {
                        message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...message } } };
                    }
                    return message;
                },
                getMessage: async (key) => {
                    if (!key || !key.id) return undefined;
                    try {
                        const jid = key.remoteJid || key.participant || key.sender || '';
                        const msg = await store.loadMessage(jid, key.id);
                        return msg?.message || undefined;
                    } catch (err) {
                        return undefined;
                    }
                },
                msgRetryCounterCache,
                defaultQueryTimeoutMs: undefined
            });
            
            whatsappBot = Mickey;
            connectionState = 'connecting';
            
            // ============================================================
            // 📨 EVENT HANDLERS
            // ============================================================
            const messageUpsertHandler = async (chatUpdate) => {
                if (connectionState !== 'open') return;
                try {
                    const mek = chatUpdate.messages[0];
                    if (!mek?.message) return;
                    
                    setImmediate(async () => {
                        try {
                            if (isButtonResponse(mek)) {
                                const buttonId = getButtonId(mek);
                                if (buttonId && isCommandId(buttonId)) {
                                    const command = autoDetectButtonCommand(mek);
                                    if (command) {
                                        mek.message.conversation = command;
                                        mek.message.extendedTextMessage = null;
                                        await handleMessages(Mickey, chatUpdate, true);
                                        return;
                                    }
                                }
                            }
                            
                            if (mek.key?.remoteJid === "status@broadcast") {
                                await handleStatus(Mickey, chatUpdate);
                                return;
                            }
                            
                            await handleMessages(Mickey, chatUpdate, true);
                        } catch (innerErr) {
                            UI.debug(`Message handler error: ${innerErr.message}`);
                        }
                    });
                } catch (err) {}
            };
            
            const callHandler = async (callData) => {
                try {
                    await handleAnticall(Mickey, { call: callData });
                } catch (err) {}
            };
            
            const connectionUpdateHandler = async (update) => {
                const { connection, lastDisconnect } = update;
                
                if (connection === "open") {
                    connectionState = 'open';
                    botStartTime = Date.now();
                    reconnectAttempts = 0;
                    
                    UI.success('\n✅ MICKEY GLITCH BOT IS NOW ONLINE!');
                    UI.info(`📱 Connected as: ${chalk.green.bold(Mickey.user.id.split(':')[0])}`);
                    
                    const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                    UI.info(`💾 RAM Usage: ${ramUsage} MB`);
                    UI.divider();
                    
                    // Send welcome message
                    const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                    const welcomeText = `*MICKEY GLITCH BOT* 🚀\n\n🟢 *Status:* Online\n💾 *RAM:* ${ramUsage} MB\n📅 *Started:* ${new Date().toLocaleString()}\n\n🎯 All systems operational!`;
                    
                    try {
                        await Mickey.sendMessage(myNumber, { text: welcomeText });
                    } catch (err) {}
                }
                
                if (connection === "close") {
                    connectionState = 'closed';
                    
                    try {
                        Mickey.ev.off("messages.upsert", messageUpsertHandler);
                        Mickey.ev.off("call", callHandler);
                        Mickey.ev.off("connection.update", connectionUpdateHandler);
                        await Mickey.end();
                    } catch (err) {}
                    
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    UI.warning(`\n⚠️ Connection closed. Code: ${statusCode || 'unknown'}`);
                    
                    reconnectAttempts++;
                    
                    // Handle different disconnect reasons
                    if (statusCode === DisconnectReason.loggedOut) {
                        UI.error('\n❌ LOGGED OUT - Session invalid');
                        clearSessionDirectory('logged out');
                        await delay(2000);
                        if (!isShuttingDown) process.exit(0);
                        return;
                    }
                    
                    if (statusCode === DisconnectReason.badSession) {
                        UI.error('\n❌ BAD SESSION - Resetting...');
                        clearSessionDirectory('bad session');
                        whatsappBot = null;
                        whatsappBootstrapPromise = null;
                        reconnectAttempts = 0;
                        await delay(5000);
                        if (!isShuttingDown) startMickeyBot();
                        return;
                    }
                    
                    if (reconnectAttempts <= 15 && !isShuttingDown) {
                        whatsappBot = null;
                        whatsappBootstrapPromise = null;
                        
                        const backoffDelay = Math.min(60000, 5000 * Math.pow(1.3, reconnectAttempts));
                        UI.info(`Reconnect attempt ${reconnectAttempts}/15 in ${Math.floor(backoffDelay/1000)}s`);
                        
                        await delay(backoffDelay);
                        if (!isShuttingDown) startMickeyBot();
                    } else {
                        UI.error('\n❌ MAX RECONNECT ATTEMPTS - Manual restart needed');
                        if (!isShuttingDown) process.exit(1);
                    }
                }
            };
            
            Mickey.ev.on("messages.upsert", messageUpsertHandler);
            Mickey.ev.on("call", callHandler);
            Mickey.ev.on("connection.update", connectionUpdateHandler);
            Mickey.ev.on('creds.update', saveCreds);
            
            // ============================================================
            // 🔐 PAIRING CODE SECTION - ENHANCED
            // ============================================================
            if (!Mickey.authState.creds.registered) {
                UI.phoneInputBox();
                
                let num = options.phoneNumber || settings.ownerNumber;
                if (!options.useTelegramPairing) {
                    num = await question("Enter WhatsApp number: ", true);
                }
                
                num = normalizeWhatsappNumber(num);
                
                if (!num) {
                    UI.error('Invalid number! Using default...');
                    num = normalizeWhatsappNumber(settings.ownerNumber);
                }
                
                UI.success(`✓ Using number: ${chalk.green.bold(num)}`);
                UI.info(`🔧 Device: ${options.deviceName || settings.telegram?.pairCode || 'MICKEY-BOT'}`);
                console.log('');
                
                try {
                    UI.info('⏳ Requesting pairing code from WhatsApp...');
                    const generatedCode = await Mickey.requestPairingCode(
                        num, 
                        options.deviceName || settings.telegram?.pairCode || 'MICKEY-BOT'
                    );
                    lastPairingCode = typeof generatedCode === 'string' ? generatedCode.trim() : generatedCode;
                    UI.pairingBox(lastPairingCode);
                } catch (err) {
                    UI.error(`Pairing failed: ${err.message || err}`);
                    throw err;
                }
            } else {
                UI.success('✓ Session exists! Connecting...');
            }
            
            return Mickey;
            
        } catch (err) {
            UI.error(`Startup error: ${err.message || err}`);
            
            if (String(err.message || '').toLowerCase().includes('session')) {
                clearSessionDirectory('startup error');
            }
            
            whatsappBot = null;
            whatsappBootstrapPromise = null;
            reconnectAttempts++;
            
            if (reconnectAttempts <= 5 && !isShuttingDown) {
                UI.warning(`Retry in 15s... (${reconnectAttempts}/5)`);
                await delay(15000);
                return startMickeyBot();
            } else if (!isShuttingDown) {
                UI.error('Fatal error - exiting');
                process.exit(1);
            }
            throw err;
        } finally {
            if (whatsappBootstrapPromise === this) {
                whatsappBootstrapPromise = null;
            }
        }
    })();
    
    return whatsappBootstrapPromise;
}

async function pairWhatsappAccount(options = {}) {
    const bot = await startMickeyBot({
        useTelegramPairing: true,
        phoneNumber: options.phoneNumber || settings.ownerNumber,
        deviceName: options.deviceName || settings.telegram?.pairCode || 'MICKEY-BOT'
    });
    return { 
        bot, 
        pairingCode: lastPairingCode, 
        registered: Boolean(bot?.authState?.creds?.registered) 
    };
}

async function initializeBot() {
    // Start cleanup services
    cleanOldSessions();
    cleanTempFolders();
    startAutoCleanup();
    startSystemMonitor();
    
    const startupMode = await chooseStartupMode();
    
    if (startupMode === 'telegram') {
        try {
            const { startTelegramBot } = require("./telegram-bot");
            startTelegramBot();
        } catch (err) {
            UI.error(`Telegram bot failed: ${err.message}`);
            startMickeyBot();
        }
    } else {
        startMickeyBot();
    }
}

// ============================================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================================
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    UI.warning(`\n🛑 Received ${signal} - Shutting down gracefully...`);
    
    // Final cleanup
    cleanTempFolders();
    
    if (whatsappBot) {
        try {
            await whatsappBot.end();
            UI.success('WhatsApp connection closed');
        } catch (err) {}
    }
    
    UI.success('Shutdown complete. Goodbye! 👋');
    setTimeout(() => process.exit(0), 2000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    UI.error(`Uncaught exception: ${err.message}`);
    if (!isShuttingDown) gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    UI.error(`Unhandled rejection: ${reason}`);
});

if (!module.parent) initializeBot();

module.exports = { initializeBot, startMickeyBot, pairWhatsappAccount };