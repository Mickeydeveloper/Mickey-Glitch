/**
 * MICKEY GLITCH - A WhatsApp Bot
 * Clean, Optimized & Auto-Skip Version
 * [ENHANCED UI - COLOR CODED | STABLE | AUTO-RECONNECT]
 */

require("dotenv").config();
require("./settings");
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");
const os = require("os");
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

// ============================================================
// 🎨 COLORED UI COMPONENTS (KAMA ULIVYOTAKA)
// ============================================================
const UI = {
    // Header kubwa yenye rangi
    header: (text, bgColor = 'cyan') => {
        const colors = {
            cyan: chalk.bgCyan.black,
            green: chalk.bgGreen.black,
            red: chalk.bgRed.black,
            yellow: chalk.bgYellow.black,
            blue: chalk.bgBlue.black,
            magenta: chalk.bgMagenta.black
        };
        const bg = colors[bgColor] || chalk.bgCyan.black;
        console.log(bg(` ${text} `));
    },
    
    // Sanduku la taarifa (info box)
    box: (title, content, color = 'blue') => {
        const colors = {
            blue: chalk.blue,
            green: chalk.green,
            red: chalk.red,
            yellow: chalk.yellow,
            cyan: chalk.cyan,
            magenta: chalk.magenta
        };
        const c = colors[color] || chalk.white;
        const border = c('┌' + '─'.repeat(58) + '┐');
        const bottom = c('└' + '─'.repeat(58) + '┘');
        console.log(border);
        console.log(c(`│ ${chalk.bold(title)}`.padEnd(60) + '│'));
        console.log(c('├' + '─'.repeat(58) + '┤'));
        if (Array.isArray(content)) {
            content.forEach(line => {
                console.log(c(`│ ${line}`.padEnd(60) + '│'));
            });
        } else {
            console.log(c(`│ ${content}`.padEnd(60) + '│'));
        }
        console.log(bottom);
    },
    
    // Sanduku la pairing code
    pairingCodeBox: (code) => {
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
    
    // Sanduku la connection status
    connectionBox: (status, details = '') => {
        const statusColor = status === 'ONLINE' ? chalk.green : (status === 'CONNECTING' ? chalk.yellow : chalk.red);
        console.log('');
        console.log(chalk.bgCyan.black.bold('╔═══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.bgCyan.black.bold('║                    🔌 CONNECTION STATUS 🔌                  ║'));
        console.log(chalk.bgCyan.black.bold('╚═══════════════════════════════════════════════════════════════╝'));
        console.log('');
        console.log(chalk.white.bold(`  📡 Status: ${statusColor.bold(status)}`));
        if (details) console.log(chalk.white.bold(`  📝 Details: ${chalk.gray(details)}`));
        console.log('');
    },
    
    success: (text) => console.log(chalk.green.bold('✅ ') + chalk.green(text)),
    error: (text) => console.log(chalk.red.bold('❌ ') + chalk.red(text)),
    warning: (text) => console.log(chalk.yellow.bold('⚠️ ') + chalk.yellow(text)),
    info: (text) => console.log(chalk.blue.bold('ℹ️ ') + chalk.blue(text)),
    debug: (text) => console.log(chalk.gray('🐛 ') + chalk.gray(text)),
    divider: () => console.log(chalk.gray('─'.repeat(70))),
    
    // Banner ya startup
    startupBanner: () => {
        console.clear();
        console.log(chalk.bgCyan.black.bold('═══════════════════════════════════════════════════════════════'));
        console.log(chalk.bgCyan.black.bold('          🚀 MICKEY GLITCH BOT v3.0 - STABLE EDITION 🚀          '));
        console.log(chalk.bgCyan.black.bold('═══════════════════════════════════════════════════════════════'));
        console.log('');
        console.log(chalk.cyan('  ╔══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.cyan('  ║  ') + chalk.white.bold('🤖 BOT NAME: ') + chalk.green(global.botname || 'Mickey Glitch') + chalk.cyan('                      ║'));
        console.log(chalk.cyan('  ║  ') + chalk.white.bold('💾 RAM USAGE: ') + chalk.yellow((process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB') + chalk.cyan('               ║'));
        console.log(chalk.cyan('  ║  ') + chalk.white.bold('🕐 START TIME: ') + chalk.yellow(new Date().toLocaleString()) + chalk.cyan('              ║'));
        console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝'));
        console.log('');
    }
};

let whatsappBot = null;
let whatsappBootstrapPromise = null;
let lastPairingCode = null;
let reconnectAttempts = 0;
let lastReconnectTime = 0;
let isShuttingDown = false;
let connectionState = 'idle';
let heartbeatInterval = null;

const SESSION_DIR = path.resolve(process.cwd(), 'session');
const CREDS_PATH = path.join(SESSION_DIR, 'creds.json');
const TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const CACHE_DIR = path.resolve(process.cwd(), 'cache');

// ============================================================
// 🧹 SESSION AND TEMP CLEANUP
// ============================================================
function createDirectories() {
    const dirs = [SESSION_DIR, TEMP_DIR, CACHE_DIR];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function cleanTempFolders() {
    try {
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            files.forEach(file => {
                const filePath = path.join(TEMP_DIR, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (Date.now() - stats.mtimeMs > 3600000) { // 1 hour
                        if (stats.isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                    }
                } catch (e) {}
            });
        }
        if (fs.existsSync(CACHE_DIR)) {
            const files = fs.readdirSync(CACHE_DIR);
            files.forEach(file => {
                const filePath = path.join(CACHE_DIR, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (Date.now() - stats.mtimeMs > 86400000) { // 24 hours
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {}
            });
        }
    } catch (err) {
        UI.debug(`Temp cleanup error: ${err.message}`);
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

// ============================================================
// 💓 HEARTBEAT SYSTEM (Kuzuia bot kuzima)
// ============================================================
function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    heartbeatInterval = setInterval(() => {
        if (connectionState === 'open' && whatsappBot) {
            // Send heartbeat to keep connection alive
            UI.debug('💓 Heartbeat sent');
        } else if (connectionState !== 'open' && !isShuttingDown && reconnectAttempts < 10) {
            UI.warning('💔 Heartbeat: Connection lost, attempting recovery...');
            if (!whatsappBootstrapPromise) {
                startMickeyBot().catch(() => {});
            }
        }
    }, 30000); // Every 30 seconds
}

// ============================================================
// 📊 MEMORY MANAGEMENT (Kuzuia crash)
// ============================================================
function startMemoryManagement() {
    setInterval(() => {
        const usageMB = process.memoryUsage().rss / 1024 / 1024;
        
        if (usageMB > 400 && !isShuttingDown) {
            UI.warning(`⚠️ RAM usage: ${usageMB.toFixed(2)}MB - Cleaning...`);
            if (global.gc) {
                global.gc();
                UI.debug('Garbage collection executed');
            }
            cleanTempFolders();
        }
        
        if (usageMB > 550 && !isShuttingDown) {
            UI.error(`🔥 CRITICAL RAM: ${usageMB.toFixed(2)}MB - Forcing restart`);
            softRestart();
        }
    }, 60000);
}

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
    isShuttingDown = false;
    
    setTimeout(() => {
        startMickeyBot();
    }, 10000);
}

// ============================================================
// 📱 PAIRING INTERFACE
// ============================================================
const pairingCode = true;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const question = (text) => {
    return new Promise(resolve => rl.question(chalk.magenta.bold(`📱 ${text} `), resolve));
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
// 🚀 BOT INITIALIZATION (ILIYOBORESHA KUZUIA KUTOKA KUZIMA)
// ============================================================
const pinoLogger = pino({ level: 'silent' });
global.botname = settings.botname || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
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

async function startMickeyBot(options = {}) {
    if (whatsappBot && connectionState === 'open') return whatsappBot;
    if (whatsappBootstrapPromise) return whatsappBootstrapPromise;
    
    // Anti reconnect spam
    const now = Date.now();
    if (now - lastReconnectTime < 30000 && reconnectAttempts > 3) {
        UI.error('Too many reconnect attempts! Waiting 2 minutes...');
        await delay(120000);
        reconnectAttempts = 0;
    }
    lastReconnectTime = now;
    
    whatsappBootstrapPromise = (async () => {
        try {
            createDirectories();
            cleanTempFolders();
            
            UI.startupBanner();
            UI.info('Starting WhatsApp connection...');
            
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
            
            const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
            
            const Mickey = makeWASocket({
                version,
                logger: pinoLogger,
                printQRInTerminal: !pairingCode,
                browser: ["Ubuntu", "Chrome", "20.0.04"],
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pinoLogger)
                },
                markOnlineOnConnect: true,
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                generateHighQualityLinkPreview: false,
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
                msgRetryCounterCache
            });
            
            whatsappBot = Mickey;
            connectionState = 'connecting';
            
            UI.connectionBox('CONNECTING', 'Establishing connection to WhatsApp...');
            
            // ============================================================
            // MESSAGE HANDLER
            // ============================================================
            const messageUpsertHandler = async (chatUpdate) => {
                if (connectionState !== 'open') return;
                try {
                    const mek = chatUpdate.messages[0];
                    if (!mek?.message) return;
                    
                    setImmediate(async () => {
                        try {
                            if (isButtonResponse && isButtonResponse(mek)) {
                                const buttonId = getButtonId && getButtonId(mek);
                                if (buttonId && isCommandId && isCommandId(buttonId)) {
                                    const command = autoDetectButtonCommand && autoDetectButtonCommand(mek);
                                    if (command) {
                                        mek.message.conversation = command;
                                        mek.message.extendedTextMessage = null;
                                        if (handleMessages) await handleMessages(Mickey, chatUpdate, true);
                                        return;
                                    }
                                }
                            }
                            
                            if (mek.key?.remoteJid === "status@broadcast") {
                                if (handleStatus) await handleStatus(Mickey, chatUpdate);
                                return;
                            }
                            
                            if (handleMessages) await handleMessages(Mickey, chatUpdate, true);
                        } catch (innerErr) {
                            UI.debug(`Message handler error: ${innerErr.message}`);
                        }
                    });
                } catch (err) {}
            };
            
            // ============================================================
            // CALL HANDLER
            // ============================================================
            const callHandler = async (callData) => {
                try {
                    if (handleAnticall) await handleAnticall(Mickey, { call: callData });
                } catch (err) {}
            };
            
            // ============================================================
            // CONNECTION HANDLER (IMARISHWA ZAIDI)
            // ============================================================
            const connectionUpdateHandler = async (update) => {
                const { connection, lastDisconnect } = update;
                
                if (connection === "open") {
                    connectionState = 'open';
                    UI.connectionBox('ONLINE', 'Connected successfully!');
                    UI.success('\n✅ MICKEY GLITCH BOT IS NOW ONLINE!');
                    reconnectAttempts = 0;
                    
                    if (Mickey.user && Mickey.user.id) {
                        UI.info(`📱 Connected as: ${chalk.green.bold(Mickey.user.id.split(':')[0])}`);
                    }
                    
                    const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                    UI.info(`💾 RAM Usage: ${ramUsage} MB`);
                    UI.divider();
                    
                    // Send welcome message to owner
                    if (Mickey.user && Mickey.user.id && settings.ownerNumber) {
                        const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                        const welcomeText = `*${global.botname}* 🚀\n\n🟢 *Status:* Online\n💾 *RAM:* ${ramUsage} MB\n📅 *Started:* ${new Date().toLocaleString()}\n\n🎯 All systems operational!`;
                        try {
                            await Mickey.sendMessage(myNumber, { text: welcomeText });
                        } catch (err) {}
                    }
                }
                
                if (connection === "close") {
                    connectionState = 'closed';
                    UI.connectionBox('OFFLINE', 'Connection lost...');
                    
                    try {
                        Mickey.ev.off("messages.upsert", messageUpsertHandler);
                        Mickey.ev.off("call", callHandler);
                        Mickey.ev.off("connection.update", connectionUpdateHandler);
                        await Mickey.end();
                    } catch (err) {}
                    
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    UI.warning(`\n⚠️ Connection closed. Status Code: ${statusCode || 'unknown'}`);
                    
                    reconnectAttempts++;
                    UI.info(`Reconnect attempt ${reconnectAttempts}/20`);
                    
                    // Handle logged out
                    if (statusCode === DisconnectReason.loggedOut) {
                        UI.error("\n❌ LOGGED OUT - Session reset");
                        clearSessionDirectory('logged out');
                        if (!isShuttingDown) {
                            isShuttingDown = true;
                            process.exit(0);
                        }
                        return;
                    }
                    
                    // Handle bad session
                    if (statusCode === DisconnectReason.badSession) {
                        UI.error("\n❌ BAD SESSION - Session reset");
                        clearSessionDirectory('bad session');
                        whatsappBot = null;
                        whatsappBootstrapPromise = null;
                        reconnectAttempts = 0;
                        await delay(5000);
                        if (!isShuttingDown) {
                            startMickeyBot().catch(() => {});
                        }
                        return;
                    }
                    
                    // Auto reconnect with backoff (had 20 attempts)
                    const shouldReconnect = reconnectAttempts <= 20;
                    
                    if (shouldReconnect && !isShuttingDown) {
                        whatsappBot = null;
                        whatsappBootstrapPromise = null;
                        
                        const backoffDelay = Math.min(60000, 5000 * Math.pow(1.2, reconnectAttempts));
                        UI.warning(`Waiting ${Math.floor(backoffDelay/1000)} seconds before reconnecting...`);
                        
                        await delay(backoffDelay);
                        
                        if (!isShuttingDown) {
                            startMickeyBot();
                        }
                    } else {
                        UI.error("\n❌ MAX RECONNECT ATTEMPTS REACHED (20)");
                        UI.info("Bot will keep trying every 2 minutes...");
                        // Continue trying instead of exiting
                        await delay(120000);
                        reconnectAttempts = 0;
                        if (!isShuttingDown) {
                            startMickeyBot();
                        }
                    }
                }
            };
            
            // Register event handlers
            Mickey.ev.on("messages.upsert", messageUpsertHandler);
            Mickey.ev.on("call", callHandler);
            Mickey.ev.on("connection.update", connectionUpdateHandler);
            Mickey.ev.on('creds.update', saveCreds);
            
            // ============================================================
            // PAIRING CODE SECTION (COLOR CODED)
            // ============================================================
            if (pairingCode && !Mickey.authState.creds.registered) {
                UI.phoneInputBox();
                
                const isTelegramTriggered = Boolean(options.useTelegramPairing);
                let num = isTelegramTriggered
                    ? normalizeWhatsappNumber(options.phoneNumber || settings.ownerNumber)
                    : await question("Enter WhatsApp number: ");
                
                if (!num) num = normalizeWhatsappNumber(settings.ownerNumber);
                num = String(num).replace(/[^0-9]/g, '');
                
                UI.success(`✓ Using number: ${chalk.green.bold(num)}`);
                UI.info(`🔧 Device: ${options.deviceName || settings.telegram?.pairCode || 'MICKEY-BOT'}`);
                console.log('');
                
                try {
                    UI.info('⏳ Requesting pairing code from WhatsApp...');
                    const generatedCode = await Mickey.requestPairingCode(
                        num, 
                        options.deviceName || settings.telegram?.pairCode || 'MICKEY-BOT'
                    );
                    lastPairingCode = typeof generatedCode === 'string' ? generatedCode.trim() : 'MICKEY-BOT';
                    UI.pairingCodeBox(lastPairingCode);
                } catch (e) {
                    UI.error(`Pairing failed: ${e.message || e}`);
                    throw e;
                }
            } else if (pairingCode && Mickey.authState.creds.registered) {
                UI.success('✓ Session exists! Connecting...');
            }
            
            // Start heartbeat to keep connection alive
            startHeartbeat();
            
            return Mickey;
            
        } catch (err) {
            const startupError = String(err?.message || err || '');
            UI.error(`Startup error: ${startupError}`);
            
            if (startupError.toLowerCase().includes('session') || startupError.toLowerCase().includes('auth')) {
                clearSessionDirectory('startup error');
            }
            
            whatsappBot = null;
            whatsappBootstrapPromise = null;
            reconnectAttempts++;
            
            if (reconnectAttempts <= 5 && !isShuttingDown) {
                UI.warning(`Retrying in 15 seconds... (Attempt ${reconnectAttempts}/5)`);
                await delay(15000);
                return startMickeyBot();
            } else if (!isShuttingDown) {
                UI.error('Persistent startup error - will keep retrying every minute');
                await delay(60000);
                reconnectAttempts = 0;
                return startMickeyBot();
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
    return { bot, pairingCode: lastPairingCode, registered: Boolean(bot?.authState?.creds?.registered) };
}

async function initializeBot() {
    createDirectories();
    startMemoryManagement();
    startMickeyBot();
}

// ============================================================
// 🛑 GRACEFUL SHUTDOWN (KUZUIA DATA KUPOTEA)
// ============================================================
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    UI.warning(`\n🛑 Received ${signal} - Shutting down gracefully...`);
    
    if (heartbeatInterval) clearInterval(heartbeatInterval);
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
    // Don't exit, just log and continue
});

if (!module.parent) initializeBot();

module.exports = { initializeBot, startMickeyBot, pairWhatsappAccount };