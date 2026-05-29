/**
 * MICKEY GLITCH - A WhatsApp Bot
 * [DUAL MODE: WhatsApp + Telegram Together]
 * [AUTO-DETECT: If no Telegram token, start WhatsApp only]
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

// Try to load telegram module (optional)
let startTelegramBot = null;
try {
    const telegramModule = require("./telegram-bot");
    startTelegramBot = telegramModule.startTelegramBot;
} catch (err) {
    console.log(chalk.yellow('⚠️ Telegram module not found, running WhatsApp only'));
}

// ============================================================
// 🎨 COLORED UI COMPONENTS
// ============================================================
const UI = {
    success: (text) => console.log(chalk.green.bold('✅ ') + chalk.green(text)),
    error: (text) => console.log(chalk.red.bold('❌ ') + chalk.red(text)),
    warning: (text) => console.log(chalk.yellow.bold('⚠️ ') + chalk.yellow(text)),
    info: (text) => console.log(chalk.blue.bold('ℹ️ ') + chalk.blue(text)),
    debug: (text) => console.log(chalk.gray('🐛 ') + chalk.gray(text)),
    divider: () => console.log(chalk.gray('─'.repeat(70))),
    header: (text, bgColor = 'cyan') => {
        const colors = {
            cyan: chalk.bgCyan.black, green: chalk.bgGreen.black, red: chalk.bgRed.black,
            yellow: chalk.bgYellow.black, blue: chalk.bgBlue.black, magenta: chalk.bgMagenta.black
        };
        const bg = colors[bgColor] || chalk.bgCyan.black;
        console.log(bg(` ${text} `));
    },
    connectionBox: (status, details = '') => {
        const statusColor = status === 'ONLINE' ? chalk.green : (status === 'CONNECTING' ? chalk.yellow : chalk.red);
        const statusText = status === 'ONLINE' ? '🟢 ONLINE' : (status === 'CONNECTING' ? '🟡 CONNECTING' : '🔴 OFFLINE');
        console.log('');
        console.log(chalk.bgCyan.black.bold('╔' + '═'.repeat(70) + '╗'));
        console.log(chalk.bgCyan.black.bold('║' + ' '.repeat(20) + '🔌 CONNECTION STATUS 🔌' + ' '.repeat(19) + '║'));
        console.log(chalk.bgCyan.black.bold('╚' + '═'.repeat(70) + '╝'));
        console.log('');
        console.log(chalk.white.bold(`  📡 Status: ${statusColor.bold(statusText)}`));
        if (details) console.log(chalk.white.bold(`  📝 Details: ${chalk.gray(details)}`));
        console.log('');
    }
};

// ============================================================
// 🧹 AUTO-CLEANUP SYSTEM
// ============================================================
const SESSION_DIR = path.resolve(process.cwd(), 'session');
const CREDS_PATH = path.join(SESSION_DIR, 'creds.json');
const TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const CACHE_DIR = path.resolve(process.cwd(), 'cache');
const MEDIA_DIR = path.resolve(process.cwd(), 'media');
const SESSION_BACKUP_DIR = path.resolve(process.cwd(), 'session_backup');

function ensureDirectories() {
    [SESSION_DIR, TEMP_DIR, CACHE_DIR, MEDIA_DIR, SESSION_BACKUP_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

function autoCleanTempFiles() {
    try {
        let cleanedCount = 0;
        [TEMP_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (Date.now() - stats.mtimeMs > 2 * 60 * 60 * 1000) {
                            if (stats.isDirectory()) fs.rmSync(filePath, { recursive: true, force: true });
                            else fs.unlinkSync(filePath);
                            cleanedCount++;
                        }
                    } catch (e) {}
                });
            }
        });
        if (cleanedCount > 0) UI.info(`🧹 Cleaned ${cleanedCount} temp files`);
    } catch (err) { UI.debug(`Cleanup error: ${err.message}`); }
}

function backupSession() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(SESSION_BACKUP_DIR, `session_${timestamp}`);
            fs.cpSync(SESSION_DIR, backupPath, { recursive: true });
            const backups = fs.readdirSync(SESSION_BACKUP_DIR).filter(f => f.startsWith('session_')).sort().reverse();
            backups.slice(5).forEach(old => fs.rmSync(path.join(SESSION_BACKUP_DIR, old), { recursive: true, force: true }));
            UI.debug(`Session backed up: ${timestamp}`);
        }
    } catch (err) { UI.debug(`Backup failed: ${err.message}`); }
}

function startAutoCleanup() {
    setInterval(autoCleanTempFiles, 30 * 60 * 1000);
    setInterval(backupSession, 6 * 60 * 60 * 1000);
    UI.success('🧹 Auto-cleanup system started!');
}

// ============================================================
// 🔍 SESSION DETECTION
// ============================================================
function isSessionExists() {
    try {
        if (!fs.existsSync(CREDS_PATH)) return false;
        const credsContent = fs.readFileSync(CREDS_PATH, 'utf8');
        const creds = JSON.parse(credsContent);
        return creds && creds.registered === true;
    } catch (err) {
        return false;
    }
}

// ============================================================
// 📱 PAIRING INTERFACE
// ============================================================
let rl = null;

function createReadlineInterface() {
    if (rl) { try { rl.close(); } catch(e) {} }
    if (process.stdin.isTTY) {
        rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }
    return rl;
}

const question = (text) => {
    return new Promise((resolve) => {
        const readlineInterface = createReadlineInterface();
        if (readlineInterface) {
            readlineInterface.question(text, (answer) => resolve(answer));
        } else {
            resolve(settings.ownerNumber || "255612130873");
        }
    });
};

function normalizeNumber(phoneNumber) {
    let num = phoneNumber.replace(/[^0-9]/g, '');
    if (!num.startsWith("255")) num = "255" + num;
    return num;
}

// ============================================================
// 📱 SEND CONNECTION STATUS TO WHATSAPP OWNER
// ============================================================
async function sendWhatsAppStatus(sock, status, details = '') {
    if (!sock) return;
    try {
        const ownerJid = settings.ownerNumber + "@s.whatsapp.net";
        const statusText = status === 'connected' ? '🟢 ONLINE' : '🔴 OFFLINE';
        const message = `🔌 *CONNECTION STATUS*\n\n📡 *Status:* ${statusText}\n📝 *Details:* ${details || 'No additional info'}\n⏱️ *Time:* ${new Date().toLocaleString()}\n\n🤖 *Mickey Glitch Bot*`;
        
        await sock.sendMessage(ownerJid, { text: message });
        UI.info(`📱 Status sent to WhatsApp owner: ${statusText}`);
    } catch (err) {
        UI.debug(`Failed to send WhatsApp status: ${err.message}`);
    }
}

// ============================================================
// 🚀 WHATSAPP BOT INITIALIZATION
// ============================================================
const pinoLogger = pino({ level: process.env.LOG_LEVEL || 'warn' });
global.botname = settings.botname || settings.botName || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.themeemoji = '•';

let whatsappBot = null;
let isWhatsAppRunning = false;
let telegramModuleInstance = null;

// Initialize store
try {
    store.readFromFile();
} catch (err) {
    UI.warning(`Store read failed: ${err.message}`);
}
setInterval(() => {
    try {
        store.writeToFile();
    } catch (err) {}
}, settings.storeWriteInterval || 10000);

async function startWhatsAppBot(retryCount = 0) {
    if (isWhatsAppRunning && whatsappBot) return whatsappBot;
    
    try {
        ensureDirectories();
        autoCleanTempFiles();
        
        UI.header('📱 STARTING WHATSAPP BOT 📱', 'green');
        UI.connectionBox('CONNECTING', 'Establishing connection to WhatsApp...');
        
        const { version } = await fetchLatestBaileysVersion();
        UI.info(`📦 Baileys Version: ${chalk.green(version.join('.'))}`);
        
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        
        const isRegistered = state.creds?.registered === true;
        if (isRegistered) {
            UI.success('📁 Valid session found! Auto-connecting...');
        } else {
            UI.info('📁 No session found. Pairing required...');
        }
        
        const msgRetryCounterCache = new NodeCache();
        
        const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: false,
            browser: ["Mickey Glitch", "Chrome", "120.0.0.0"],
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
        
        // Message handler
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
                if (!err.message?.includes("No session found")) {
                    UI.debug(`Message error: ${err.message}`);
                }
            }
        });
        
        // Call handler
        Mickey.ev.on("call", async (callData) => {
            try {
                if (handleAnticall) await handleAnticall(Mickey, { call: callData });
            } catch (err) { UI.debug(`Call error: ${err.message}`); }
        });
        
        // Group participants handler
        Mickey.ev.on("group-participants.update", async (update) => {
            try {
                if (handleGroupParticipantUpdate) await handleGroupParticipantUpdate(Mickey, update);
            } catch (err) { UI.debug(`Group update error: ${err.message}`); }
        });
        
        // Connection handler
        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "open") {
                isWhatsAppRunning = true;
                UI.connectionBox('ONLINE', 'Connected successfully!');
                UI.success('\n✅ WHATSAPP BOT IS NOW ONLINE!');
                
                if (Mickey.user && Mickey.user.id) {
                    UI.info(`📱 Connected as: ${chalk.green.bold(Mickey.user.id.split(':')[0])}`);
                }
                UI.info(`💾 RAM Usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`);
                UI.divider();
                
                // Send status to WhatsApp owner
                await sendWhatsAppStatus(Mickey, 'connected', 'Bot is online and ready!');
                
                if (rl) { try { rl.close(); } catch(e) {} rl = null; }
            }
            
            if (connection === "close") {
                isWhatsAppRunning = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
                
                UI.error(`\n❌ WhatsApp connection closed!`);
                UI.connectionBox('OFFLINE', errorMessage);
                
                // Send status to WhatsApp owner
                await sendWhatsAppStatus(Mickey, 'disconnected', errorMessage);
                
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect && retryCount < 10) {
                    UI.warning(`🔄 Reconnecting... (Attempt ${retryCount + 1}/10)`);
                    await delay(Math.min(5000 + (retryCount * 1000), 30000));
                    startWhatsAppBot(retryCount + 1);
                } else if (statusCode === DisconnectReason.loggedOut) {
                    UI.error('🚫 Session expired! Please restart the bot.');
                }
            }
        });
        
        // Pairing code (only if not registered)
        if (!state.creds?.registered) {
            UI.info('\n⏳ Pairing required. Please wait...\n');
            
            let num = await question(chalk.cyan.bold("📱 Enter WhatsApp number (255XXXXXXXXX): "));
            num = normalizeNumber(num);
            
            if (!num) {
                num = settings.ownerNumber || "255612130873";
            }
            
            UI.info(`📱 Requesting pairing code for ${num}...`);
            
            setTimeout(async () => {
                try {
                    const code = await Mickey.requestPairingCode(num);
                    if (code) {
                        console.log('');
                        console.log(chalk.bgGreen.black.bold('╔═══════════════════════════════════════════════════════════════╗'));
                        console.log(chalk.bgGreen.black.bold('║                    🔐 PAIRING CODE GENERATED 🔐               ║'));
                        console.log(chalk.bgGreen.black.bold('╚═══════════════════════════════════════════════════════════════╝'));
                        console.log('');
                        console.log(chalk.white.bold(`  🔐 YOUR CODE: ${chalk.bgWhite.black.bold(` ${code} `)}`));
                        console.log('');
                        console.log(chalk.yellow.bold('  ⚠️  MAELEKEZO:'));
                        console.log(chalk.gray('    1. Fungua WhatsApp kwenye simu yako'));
                        console.log(chalk.gray('    2. Nenda Settings → Linked Devices'));
                        console.log(chalk.gray('    3. Bonyeza "Link a Device"'));
                        console.log(chalk.gray(`    4. Weka code hii: ${chalk.white.bold(code)}`));
                        console.log('');
                    }
                } catch (e) { 
                    UI.error(`Pairing failed: ${e.message}`);
                }
            }, 3000);
        }
        
        return Mickey;
        
    } catch (err) {
        UI.error(`Failed to start WhatsApp bot: ${err.message}`);
        if (retryCount < 5) {
            await delay(10000);
            return startWhatsAppBot(retryCount + 1);
        }
        return null;
    }
}

// ============================================================
// 🎯 MAIN INITIALIZATION
// ============================================================
async function initializeBot() {
    console.log(chalk.green.bold('\n🚀 Initializing Mickey Glitch Bot...\n'));
    
    startAutoCleanup();
    
    // Log sudo users
    if (settings.sudoUsers && settings.sudoUsers.length) {
        console.log(chalk.magenta('✔️ Permanent sudo users initialized:'), settings.sudoUsers);
    }
    
    // Check if Telegram token exists
    const hasTelegramToken = settings.telegram?.botToken && settings.telegram.botToken.trim().length > 0;
    
    // Start Telegram bot ONLY IF token exists
    let telegramStarted = false;
    if (hasTelegramToken && startTelegramBot) {
        try {
            telegramModuleInstance = await startTelegramBot();
            if (telegramModuleInstance) {
                UI.success('🤖 Telegram bot is running!');
                telegramStarted = true;
            }
        } catch (err) {
            UI.warning(`Telegram bot error: ${err.message}`);
            UI.info('Continuing with WhatsApp only...');
        }
    } else {
        if (!hasTelegramToken) {
            UI.warning('⚠️ Telegram bot token not found in settings!');
        }
        UI.info('📱 Running WhatsApp only mode...');
    }
    
    // Check if session exists
    const sessionExists = isSessionExists();
    
    // Start WhatsApp bot (always)
    if (sessionExists) {
        UI.success('📁 Valid WhatsApp session detected!');
        UI.info('🔄 Auto-starting WhatsApp bot...');
        await startWhatsAppBot();
    } else {
        UI.warning('📁 No WhatsApp session found!');
        UI.info('ℹ️ You will be prompted to enter phone number for pairing.');
        await startWhatsAppBot();
    }
    
    // Display final status
    console.log('');
    UI.divider();
    console.log(chalk.cyan.bold('╔═══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║                    🚀 BOT STATUS 🚀                           ║'));
    console.log(chalk.cyan.bold('╠═══════════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan.bold('║  ') + chalk.white('🤖 WhatsApp Bot: ') + (isWhatsAppRunning ? chalk.green('🟢 RUNNING') : chalk.yellow('🟡 CONNECTING')) + chalk.cyan('                          ║'));
    console.log(chalk.cyan.bold('║  ') + chalk.white('📱 Telegram Bot: ') + (telegramStarted ? chalk.green('🟢 RUNNING') : chalk.red('🔴 DISABLED (No Token)')) + chalk.cyan('                    ║'));
    console.log(chalk.cyan.bold('║  ') + chalk.white('💾 RAM Usage: ') + chalk.yellow((process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB') + chalk.cyan('                               ║'));
    console.log(chalk.cyan.bold('║  ') + chalk.white('📅 Time: ') + chalk.yellow(new Date().toLocaleString()) + chalk.cyan('                                    ║'));
    console.log(chalk.cyan.bold('╚═══════════════════════════════════════════════════════════════╝'));
    console.log('');
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        UI.warning('\n👋 Shutting down gracefully...');
        if (whatsappBot) {
            try { await whatsappBot.end(); } catch(e) {}
        }
        if (rl) { try { rl.close(); } catch(e) {} }
        UI.success('Bot stopped!');
        process.exit(0);
    });
    
    process.on('uncaughtException', (err) => {
        UI.error(`Uncaught Exception: ${err.message}`);
        if (!err.message?.includes('ECONNRESET')) {
            setTimeout(() => process.exit(1), 5000);
        }
    });
}

// Start the bot
initializeBot().catch(err => {
    UI.error(`Fatal error: ${err.message}`);
    process.exit(1);
});