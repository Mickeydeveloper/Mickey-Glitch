/**
 * MICKEY GLITCH - A WhatsApp Bot
 * CUSTOM PAIRING - Uses Custom 8-digit code (MICKDADY)
 * MODERNISED CONSOLE UI & GITHUB IMAGE CONNECTION
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
global.botname = settings.botname || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.themeemoji = '•';

// ────────────────────────────────────────────────
// PATHS & AUTO CLEANUP
// ────────────────────────────────────────────────
const SESSION_DIR = path.resolve(process.cwd(), 'session');
const TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const CACHE_DIR = path.resolve(process.cwd(), 'cache');
const MEDIA_DIR = path.resolve(process.cwd(), 'media');

function ensureDirectories() {
    [SESSION_DIR, TEMP_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

function autoClean() {
    try {
        let cleaned = 0;
        [TEMP_DIR, CACHE_DIR, MEDIA_DIR].forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (Date.now() - stats.mtimeMs > 3600000) {
                            if (stats.isDirectory()) {
                                fs.rmSync(filePath, { recursive: true, force: true });
                            } else {
                                fs.unlinkSync(filePath);
                            }
                            cleaned++;
                        }
                    } catch (e) {}
                });
            }
        });
        if (cleaned > 0) console.log(chalk.cyan(`▓▒░ [CLEANER] auto-purged ${cleaned} temporary cache files.`));
    } catch (err) {}
}

// ────────────────────────────────────────────────
// SESSION MANAGEMENT
// ────────────────────────────────────────────────
function clearSession() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            UI.warning('Clearing corrupted/expired session files...');
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
  /  |/  (_)____/ /_____  __  / __/ /_  / __/ /_ v3.1
 / /|_/ / / __/  '_/ __ \\/ / / / _// / / / /_/ __ /
/_/  /_/_/\\__/_/\\_\\\\____/\\_ / /_/ /_/_/_/\\__/_/ /_/
                        /___/
        `));
        console.log(chalk.dim('       ⚡ Cyberpunk Core Setup Engaged ⚡\n'));
    }
};

// ────────────────────────────────────────────────
// MAIN BOT FUNCTION
// ────────────────────────────────────────────────
let whatsappBot = null;
let isWhatsAppRunning = false;
let reconnectAttempts = 0;

async function startMickeyBot() {
    if (isWhatsAppRunning && whatsappBot) return whatsappBot;

    try {
        ensureDirectories();
        autoClean();
        
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

        // --- Message Handler ---
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
            } catch (err) {}
        });

        // --- Call Handler ---
        Mickey.ev.on("call", async (callData) => {
            try {
                if (handleAnticall) await handleAnticall(Mickey, { call: callData });
            } catch (err) {}
        });

        // --- Group Participant Handler ---
        Mickey.ev.on("group-participants.update", async (update) => {
            try {
                if (handleGroupParticipantUpdate) await handleGroupParticipantUpdate(Mickey, update);
            } catch (err) {}
        });

        // --- Connection Handler ---
        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                isWhatsAppRunning = true;
                reconnectAttempts = 0;
                isPairing = false;
                pairingAttempts = 0;
                
                console.log('\n' + chalk.bgGreen.black.bold("  🚀 CORE ONLINE  ") + chalk.greenBright(" System successfully synchronized with WhatsApp matrix.\n"));

                const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                
                console.log(chalk.cyan('  ┌─[ BOT METRICS ]'));
                console.log(chalk.cyan('  │ ') + chalk.white(`User-ID  : ${chalk.greenBright(Mickey.user.id.split(':')[0])}`));
                console.log(chalk.cyan('  │ ') + chalk.white(`Memory   : ${chalk.yellow(ramUsage + ' MB')}`));
                console.log(chalk.cyan('  └────────────────'));
                UI.divider();

                // 🔌 RAW URL YA PICHA YA WATER BILLING KUTOKA GITHUB REPO YAKO MPYA
                const currentTanzaniaTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' });
                const connectionText = `🔌 *CONNECTION STATUS*\n\n` +
                                       `📡 *Status:* 🟢 ONLINE\n` +
                                       `📝 *Details:* Bot is online and ready!\n` +
                                       `⏱️ *Time:* ${currentTanzaniaTime}\n\n` +
                                       `🤖 *Mickey Glitch Bot*`;

                try {
                    await Mickey.sendMessage(myNumber, {
                        image: { url: "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg" },
                        caption: connectionText
                    });
                    UI.success('Connection layout and GitHub image transmitted successfully!');
                } catch (e) {
                    try {
                        await Mickey.sendMessage(myNumber, { text: connectionText });
                    } catch (err) {}
                    UI.warning('Could not pull image from GitHub, text payload dispatched instead.');
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
                
                UI.warning(`Link disrupted: ${errorMessage.substring(0, 50)}`);
                
                if (statusCode === DisconnectReason.loggedOut) {
                    UI.error('Session structure revoked (Logged Out). Flashing memory...');
                    clearSession();
                    await delay(3000);
                    return startMickeyBot();
                }
                
                if (reconnectAttempts < 15) {
                    const delayTime = Math.min(5000 + (reconnectAttempts * 1000), 30000);
                    reconnectAttempts++;
                    console.log(chalk.cyan(`  🔄 [RECONNECT] Attempting re-entry in ${delayTime/1000}s... (${reconnectAttempts}/15)`));
                    await delay(delayTime);
                    return startMickeyBot();
                } else {
                    UI.error('Max reconnection threshold reached. Manual restart mandatory.');
                }
            }
        });

        // ────────────────────────────────────────────────
        // PAIRING - INJECTING CUSTOM CODE "MICKDADY"
        // ────────────────────────────────────────────────
        if (!hasSession && !isPairing) {
            isPairing = true;
            
            const phoneNumber = await askPhoneNumber();
            UI.info('Intercepting token stream and pushing custom signature...');
            
            await delay(3000);
            
            try {
                // Inalazimisha custom code yako ya MICKDADY
                await Mickey.requestPairingCode(phoneNumber, "MICKDADY");
                
                console.log('\n' + chalk.magenta.bold('  ┌────────────────────────────────────────────────────────┐'));
                console.log(chalk.magenta.bold('  │') + chalk.bgMagenta.black.bold('              🔐 CUSTOM WHATSAPP PAIRING CODE             ') + chalk.magenta.bold('  │'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Nenda: WhatsApp ➜ Settings ➜ Linked Devices ➜ Link    ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Kisha chagua "Link with phone number instead"        ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.greenBright.bold('               👉    M I C K D A D Y    👈               ') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  └────────────────────────────────────────────────────────┘\n'));
                
                UI.info('Waiting for authorization handshakes... (10-30s)');
                
                const keepAliveInterval = setInterval(() => {
                    if (!isWhatsAppRunning) {
                        try { Mickey.sendPresenceUpdate('available'); } catch (e) {}
                    } else {
                        clearInterval(keepAliveInterval);
                    }
                }, 5000);
                
            } catch (err) {
                UI.error('Pairing pipeline blocked: ' + err.message);
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
        UI.error('Critical exception detected: ' + err.message);
        await delay(5000);
        return startMickeyBot();
    }
}

// ────────────────────────────────────────────────
// KEEP ALIVE & MONITORING
// ────────────────────────────────────────────────
function startKeepAlive() {
    setInterval(autoClean, 30 * 60 * 1000);
    
    setInterval(() => {
        if (whatsappBot && isWhatsAppRunning) {
            try { whatsappBot.sendPresenceUpdate('available'); } catch (err) {}
        }
        const status = isWhatsAppRunning ? chalk.greenBright('ONLINE') : chalk.redBright('OFFLINE');
        const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        console.log(chalk.dim(`  [MONITOR] Status: [${status}] | Core RAM: ${ram}MB`));
    }, 5 * 60 * 1000);
}

// ────────────────────────────────────────────────
// INITIALIZATION ENTRYPOINT
// ────────────────────────────────────────────────
async function initializeBot() {
    UI.banner();
    startKeepAlive();
    
    const hasTelegramToken = settings.telegram?.botToken && settings.telegram.botToken?.trim()?.length > 0;
    let telegramStarted = false;
    
    if (hasTelegramToken && startTelegramBot) {
        try {
            await startTelegramBot();
            UI.success('Telegram mainframe operational.');
            telegramStarted = true;
        } catch (err) {
            UI.warning(`Telegram linkage error: ${err.message}`);
        }
    } else {
        UI.info('WhatsApp standalone operation active.');
    }
    
    await startMickeyBot();
    
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n  👋 Terminating bot processes...'));
        if (whatsappBot) { try { await whatsappBot.end(); } catch(e) {} }
        if (rl) { try { rl.close(); } catch(e) {} }
        process.exit(0);
    });
}

initializeBot().catch(err => {
    UI.error(`Fatal crash: ${err.message}`);
    process.exit(1);
});
