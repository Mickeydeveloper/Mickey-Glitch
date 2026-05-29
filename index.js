/**
 * MICKEY GLITCH - A WhatsApp Bot
 * Clean & Optimized Version
 * [AUTO-START | SESSION DETECT | SMART MODE]
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
const { startTelegramBot } = require("./telegram-bot");

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
    box: (title, content, color = 'blue') => {
        const colors = {
            blue: chalk.blue, green: chalk.green, red: chalk.red,
            yellow: chalk.yellow, cyan: chalk.cyan, magenta: chalk.magenta
        };
        const c = colors[color] || chalk.white;
        console.log(c('┌' + '─'.repeat(58) + '┐'));
        console.log(c(`│ ${chalk.bold(title)}`.padEnd(60) + '│'));
        console.log(c('├' + '─'.repeat(58) + '┤'));
        if (Array.isArray(content)) {
            content.forEach(line => console.log(c(`│ ${line}`.padEnd(60) + '│')));
        } else {
            console.log(c(`│ ${content}`.padEnd(60) + '│'));
        }
        console.log(c('└' + '─'.repeat(58) + '┘'));
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
// 🔍 SESSION DETECTION (AUTO-SKIP)
// ============================================================
function isSessionExists() {
    try {
        if (!fs.existsSync(CREDS_PATH)) {
            return false;
        }
        const credsContent = fs.readFileSync(CREDS_PATH, 'utf8');
        const creds = JSON.parse(credsContent);
        // Check if creds have valid registration
        if (creds && creds.registered === true) {
            return true;
        }
        // Also check if there are any session files
        const sessionFiles = fs.readdirSync(SESSION_DIR);
        return sessionFiles.length > 1; // More than just creds.json
    } catch (err) {
        return false;
    }
}

function getSessionAge() {
    try {
        if (fs.existsSync(CREDS_PATH)) {
            const stats = fs.statSync(CREDS_PATH);
            const ageMs = Date.now() - stats.mtimeMs;
            const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
            const ageDays = Math.floor(ageHours / 24);
            if (ageDays > 0) return `${ageDays} days ${ageHours % 24} hours`;
            return `${ageHours} hours`;
        }
    } catch (err) {}
    return 'Unknown';
}

// ============================================================
// 📱 PAIRING INTERFACE (ONLY WHEN NO SESSION)
// ============================================================
let rl = null;

function createReadlineInterface() {
    if (rl) {
        try { rl.close(); } catch(e) {}
    }
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
// 🚀 MAIN BOT INITIALIZATION
// ============================================================
const pinoLogger = pino({ level: process.env.LOG_LEVEL || 'warn' });
global.botname = settings.botname || settings.botName || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.themeemoji = '•';

let telegramModule = null;

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

// Log sudo users
if (settings.sudoUsers && settings.sudoUsers.length) {
    console.log(chalk.magenta('✔️ Permanent sudo users initialized:'), settings.sudoUsers);
}

async function startMickeyBot(retryCount = 0) {
    try {
        ensureDirectories();
        autoCleanTempFiles();
        
        UI.header('🚀 STARTING MICKEY GLITCH BOT 🚀', 'cyan');
        
        const { version } = await fetchLatestBaileysVersion();
        UI.info(`📦 Baileys Version: ${chalk.green(version.join('.'))}`);
        
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        
        // Check if session is registered
        const isRegistered = state.creds?.registered === true;
        if (isRegistered) {
            UI.success(`📁 Session found! Age: ${getSessionAge()}`);
            UI.info('🔄 Auto-connecting to WhatsApp...');
        } else {
            UI.info('📁 Session Status: New session will be created');
        }
        
        const msgRetryCounterCache = new NodeCache();
        
        const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: false, // Always false, use pairing code
            browser: ["Ubuntu", "Chrome", "20.0.04"],
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
                    message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...message } } };
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
        
        Mickey.ev.on("creds.update", saveCreds);
        store.bind(Mickey.ev);
        
        // ============================================================
        // EVENT HANDLERS
        // ============================================================
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
        
        Mickey.ev.on("call", async (callData) => {
            try {
                if (handleAnticall) await handleAnticall(Mickey, { call: callData });
            } catch (err) { UI.debug(`Call error: ${err.message}`); }
        });
        
        Mickey.ev.on("group-participants.update", async (update) => {
            try {
                if (handleGroupParticipantUpdate) await handleGroupParticipantUpdate(Mickey, update);
            } catch (err) { UI.debug(`Group update error: ${err.message}`); }
        });
        
        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "open") {
                UI.success('\n✅ MICKEY GLITCH BOT IS NOW ONLINE!');
                if (Mickey.user && Mickey.user.id) {
                    UI.info(`📱 Connected as: ${chalk.green.bold(Mickey.user.id.split(':')[0])}`);
                }
                UI.info(`💾 RAM Usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`);
                UI.divider();
                
                if (rl) { try { rl.close(); } catch(e) {} rl = null; }
            }
            
            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                UI.error(`\n❌ Connection closed!`);
                
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect && retryCount < 10) {
                    UI.warning(`🔄 Reconnecting... (Attempt ${retryCount + 1}/10)`);
                    await delay(Math.min(5000 + (retryCount * 1000), 30000));
                    startMickeyBot(retryCount + 1);
                } else if (statusCode === DisconnectReason.loggedOut) {
                    UI.error('🚫 Session expired! Please restart the bot.');
                    UI.info('Delete session folder and restart to generate new session.');
                } else if (retryCount >= 10) {
                    UI.error('❌ Maximum reconnection attempts reached. Manual restart required.');
                }
            }
        });
        
        // ============================================================
        // PAIRING CODE - ONLY IF NOT REGISTERED
        // ============================================================
        if (!state.creds?.registered) {
            UI.info('\n⏳ No valid session found. Pairing required...\n');
            
            UI.box('📱 PHONE NUMBER REQUIRED', [
                'FORMAT: 255XXXXXXXXX (Tanzania)',
                'EXAMPLE: 255612130873',
                '',
                '💡 Hakikisha namba ni sahihi kabla ya kuendelea'
            ], 'yellow');
            
            let num = await question(chalk.cyan.bold("\n📱 Enter your WhatsApp number: "));
            num = normalizeNumber(num);
            
            if (!num) {
                UI.error('Invalid phone number! Using owner number from settings.');
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
                        console.log(chalk.cyan.bold('  ⏳ Inasubiri muunganiko...'));
                        console.log('');
                    }
                } catch (e) { 
                    UI.error(`Pairing failed: ${e.message}`);
                    UI.info('Please restart the bot and try again.');
                }
            }, 3000);
        }
        
        return Mickey;
        
    } catch (err) {
        UI.error(`Failed to start bot: ${err.message}`);
        if (retryCount < 5) {
            UI.warning(`Retrying in 10 seconds... (Attempt ${retryCount + 1}/5)`);
            await delay(10000);
            return startMickeyBot(retryCount + 1);
        }
        throw err;
    }
}

// ============================================================
// 🎯 AUTO-INITIALIZATION (SMART MODE SELECTION)
// ============================================================
async function initializeBot() {
    console.log(chalk.green.bold('\n🚀 Initializing Mickey Glitch Bot...\n'));
    
    startAutoCleanup();
    
    // Initialize Telegram bot (optional)
    try {
        telegramModule = await startTelegramBot();
        if (telegramModule) {
            UI.success('Telegram bot is running!');
        }
    } catch (err) {
        UI.warning(`Telegram bot error: ${err.message}`);
    }
    
    // ============================================================
    // SMART MODE SELECTION - AUTO SKIP IF SESSION EXISTS
    // ============================================================
    const sessionExists = isSessionExists();
    const settingMode = settings.mode?.toLowerCase() === 'telegram' ? 'telegram' : 'whatsapp';
    let startupMode = settingMode;
    
    // If session exists and mode is whatsapp, auto-start WhatsApp without asking
    if (sessionExists && settingMode === 'whatsapp') {
        UI.success('📁 Valid session detected!');
        UI.info('🔄 Auto-starting WhatsApp bot...');
        startupMode = 'whatsapp';
    }
    // If session exists but mode is telegram, check if user wants to switch
    else if (sessionExists && settingMode === 'telegram') {
        UI.success('📁 Valid session detected!');
        UI.info('ℹ️ Session exists but mode is set to Telegram.');
        
        // Only ask if we have terminal input
        if (process.stdin.isTTY) {
            console.log(chalk.cyan('\n┌─────────────────────────────────────────────────────────────┐'));
            console.log(chalk.cyan('│                    STARTUP MODE SELECTION                    │'));
            console.log(chalk.cyan('├─────────────────────────────────────────────────────────────┤'));
            console.log(chalk.cyan('│  ') + chalk.white('1) WhatsApp Bot (Session available)') + chalk.cyan('                       │'));
            console.log(chalk.cyan('│  ') + chalk.white('2) Telegram Bot (Monitor Mode)') + chalk.cyan('                           │'));
            console.log(chalk.cyan('│  ') + chalk.white(`3) Use settings.js mode (${settingMode})`) + chalk.cyan('                         │'));
            console.log(chalk.cyan('└─────────────────────────────────────────────────────────────┘'));
            
            const answer = (await question('\n📱 Chagua mode (1/2/3): ')).trim();
            if (answer === '1') startupMode = 'whatsapp';
            if (answer === '2') startupMode = 'telegram';
        } else {
            // No terminal, use settings mode
            startupMode = settingMode;
        }
    }
    // No session exists, need to ask for mode
    else if (!sessionExists && process.stdin.isTTY) {
        UI.warning('📁 No valid session found!');
        console.log(chalk.cyan('\n┌─────────────────────────────────────────────────────────────┐'));
        console.log(chalk.cyan('│                    STARTUP MODE SELECTION                    │'));
        console.log(chalk.cyan('├─────────────────────────────────────────────────────────────┤'));
        console.log(chalk.cyan('│  ') + chalk.white('1) WhatsApp Bot (Requires Pairing)') + chalk.cyan('                         │'));
        console.log(chalk.cyan('│  ') + chalk.white('2) Telegram Bot (Monitor Mode)') + chalk.cyan('                           │'));
        console.log(chalk.cyan('│  ') + chalk.white(`3) Use settings.js mode (${settingMode})`) + chalk.cyan('                         │'));
        console.log(chalk.cyan('└─────────────────────────────────────────────────────────────┘'));
        
        const answer = (await question('\n📱 Chagua mode (1/2/3): ')).trim();
        if (answer === '1') startupMode = 'whatsapp';
        if (answer === '2') startupMode = 'telegram';
    }
    // No session and no terminal, use settings mode
    else if (!sessionExists) {
        UI.warning('📁 No valid session found! Using settings.js mode.');
        startupMode = settingMode;
    }
    
    // ============================================================
    // START SELECTED MODE
    // ============================================================
    if (startupMode === 'telegram') {
        UI.header('🤖 TELEGRAM BOT MODE 🤖', 'magenta');
        if (!telegramModule) {
            UI.error('Telegram bot not configured! Starting WhatsApp mode instead.');
            await startMickeyBot();
        } else {
            UI.success('✅ Telegram bot is running!');
            UI.info('Commands: /start, /status, /restart, /clearsession, /stats, /backup, /uptime, /info');
            UI.info('WhatsApp bot is in standby mode. Use /startwhatsapp to activate.');
        }
    } else {
        UI.header('📱 WHATSAPP BOT MODE 📱', 'green');
        await startMickeyBot();
    }
    
    // ============================================================
    // GRACEFUL SHUTDOWN HANDLERS
    // ============================================================
    process.on('SIGINT', async () => {
        UI.warning('\n👋 Shutting down gracefully...');
        if (rl) try { rl.close(); } catch(e) {}
        UI.success('Bot stopped!');
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        UI.warning('\n👋 Shutting down gracefully...');
        if (rl) try { rl.close(); } catch(e) {}
        UI.success('Bot stopped!');
        process.exit(0);
    });
    
    process.on('uncaughtException', (err) => {
        UI.error(`Uncaught Exception: ${err.message}`);
        if (!err.message?.includes('ECONNRESET') && !err.message?.includes('read ECONNRESET')) {
            UI.warning('Restarting in 5 seconds...');
            setTimeout(() => process.exit(1), 5000);
        }
    });
    
    process.on('unhandledRejection', (reason) => {
        UI.error(`Unhandled Rejection: ${reason}`);
    });
}

// ============================================================
// START THE BOT
// ============================================================
initializeBot().catch(err => {
    UI.error(`Fatal error: ${err.message}`);
    process.exit(1);
});