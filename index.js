/**
 * MICKEY GLITCH - POWERFUL EDITION v4.1
 * FEATURES: Auto-Empty Session Cleaner, Detailed Terminal Input, No Freezing
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
const store = require("./lib/lightweight_store");
const settings = require("./settings");
const MickeyHelper = require("./lib/Mickey");

// Try to load telegram module
let startTelegramBot = null;
try {
    const telegramModule = require("./telegram-bot");
    startTelegramBot = telegramModule.startTelegramBot;
} catch (err) {}

const pinoLogger = pino({ level: 'silent' });
const _botName = settings.botName || settings.botname || "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.botname = _botName;
global.botName = _botName;
global.themeemoji = '•';

const SESSION_DIR = path.resolve(process.cwd(), 'session');
const TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const ALT_TEMP_DIR = path.resolve(process.cwd(), 'temp');
const SESSION_BACKUP_DIR = path.resolve(process.cwd(), 'session_backup');
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const CUSTOM_PAIRING_CODE = process.env.PAIRING_CODE?.trim() || 'MICKDADY';

function ensureDirectories() {
    [SESSION_DIR, TEMP_DIR, ALT_TEMP_DIR, SESSION_BACKUP_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

function autoClean() {
    try {
        ensureDirectories();
        // Clean temp files
        [TEMP_DIR, ALT_TEMP_DIR].forEach(target => {
            if (fs.existsSync(target)) {
                const entries = fs.readdirSync(target, { withFileTypes: true });
                const now = Date.now();
                entries.forEach(entry => {
                    const entryPath = path.join(target, entry.name);
                    try {
                        const stats = fs.statSync(entryPath);
                        if (now - stats.mtimeMs > 3600000) {
                            if (entry.isDirectory()) fs.rmSync(entryPath, { recursive: true, force: true });
                            else fs.unlinkSync(entryPath);
                        }
                    } catch (e) {}
                });
            }
        });
    } catch (err) {}
}

// ★★★ CRITICAL FIX: AUTO-DETECT EMPTY SESSION FOLDER ★★★
function validateAndRepairSessionPath() {
    ensureDirectories();
    
    if (fs.existsSync(SESSION_DIR)) {
        const files = fs.readdirSync(SESSION_DIR);
        
        // If folder exists but has NO files inside OR has no creds.json
        if (files.length === 0 || !files.includes('creds.json')) {
            console.log(chalk.yellowBright.bold('\n  ⚠ [SYSTEM DETECTED] Session folder is EMPTY or CORRUPTED!'));
            console.log(chalk.dim('  🧹 Auto-cleaning empty session directory to trigger fresh pairing...\n'));
            
            // DELETE the empty/corrupt session folder completely
            try {
                fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                console.log(chalk.green('  ✔ Folder cleared successfully.'));
            } catch (e) {
                console.log(chalk.red('  ✖ Failed to delete folder manually, but we will proceed.'));
            }
            ensureDirectories(); // Recreate clean folder
            return false; // Return false to tell bot to Pair
        }
        
        // Check if file size is too small (corrupted)
        try {
            const stats = fs.statSync(path.join(SESSION_DIR, 'creds.json'));
            if (stats.size < 50) { // Less than 50 bytes means empty/corrupt JSON
                console.log(chalk.yellowBright.bold('\n  ⚠ [SYSTEM DETECTED] creds.json is corrupted (empty file)!'));
                console.log(chalk.dim('  🧹 Auto-clearing session...\n'));
                fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                ensureDirectories();
                return false;
            }
        } catch (e) {}
    }
    return true; // Valid session exists
}

// ────────────────────────────────────────────────────────────────
// POWERFUL UI COMPONENTS (DETAILED INSTRUCTIONS)
// ────────────────────────────────────────────────────────────────
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
  /  |/  (_)____/ /_____  __  / __/ /_  / __/ /_ v4.1
 / /|_/ / / __/  '_/ __ \\/ / / / _// / / / /_/ __ /
/_/  /_/_/\\__/_/\\_\\\\____/\\_ / /_/ /_/_/_/\\__/_/ /_/
                        /___/
        `));
        console.log(chalk.dim('       ⚡ Power Multi-Tasking & Auto-Healing Core Active ⚡\n'));
        console.log(chalk.green('  🛡️  Session Auto-Clear: ') + chalk.green('DISABLED ✓'));
        console.log(chalk.dim('  📌  Session Auto-Heals empty folders\n'));
    },

    // DETAILED PAIRING INSTRUCTIONS
    showPairingGuide: () => {
        console.log('\n' + chalk.cyan.bold('┌────────────────────────────────────────────────────────────────────┐'));
        console.log(chalk.cyan.bold('│') + chalk.bgCyan.black.bold('            📱 POWER PAIRING ASSISTANT (STEP-BY-STEP)            ') + chalk.cyan.bold('│'));
        console.log(chalk.cyan.bold('├────────────────────────────────────────────────────────────────────┤'));
        console.log(chalk.cyan.bold('│') + chalk.white.bold('   📌 HATUA ZA KUFUATA:') + chalk.cyan.bold('                                            │'));
        console.log(chalk.cyan.bold('│') + chalk.dim('   1. Fungua WhatsApp kwenye simu yako.') + chalk.cyan.bold('                           │'));
        console.log(chalk.cyan.bold('│') + chalk.dim('   2. Nenda kwenye:') + chalk.white.bold(' Settings ➜ Linked Devices ➜ Link a Device') + chalk.cyan.bold('   │'));
        console.log(chalk.cyan.bold('│') + chalk.dim('   3. Chagua:') + chalk.white.bold(' "Link with phone number instead"') + chalk.cyan.bold('                 │'));
        console.log(chalk.cyan.bold('│') + chalk.dim('   4. Katika terminal hapa chini,') + chalk.white.bold(' andika namba yako.') + chalk.cyan.bold('   │'));
        console.log(chalk.cyan.bold('├────────────────────────────────────────────────────────────────────┤'));
        console.log(chalk.cyan.bold('│') + chalk.yellow('   KUMBUKA: Tumia mfumo huu: 255712345678 (Mchanganyiko wa +255)') + chalk.cyan.bold('│'));
        console.log(chalk.cyan.bold('│') + chalk.yellow(`   CUSTOM PAIRING CODE: ${CUSTOM_PAIRING_CODE}`) + chalk.cyan.bold('│'));
        console.log(chalk.cyan.bold('│') + chalk.yellow('   Katika WhatsApp, chagua Link a Device na andika code hii.') + chalk.cyan.bold('│'));
        console.log(chalk.cyan.bold('└────────────────────────────────────────────────────────────────────┘'));
        console.log(chalk.dim('\n  💡 TIP: Bot inakaa hai hapa. Ikiwa hutaki kuandika, weka PAIRING_NUMBER kwenye ENV.\n'));
    }
};

// ────────────────────────────────────────────────────────────────
// NON-BLOCKING INPUT SYSTEM
// ────────────────────────────────────────────────────────────────
let isPairing = false;
let pairingAttempts = 0;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 30;

async function askPhoneNumber() {
    return new Promise((resolve, reject) => {
        if (process.env.PAIRING_NUMBER) {
            let num = process.env.PAIRING_NUMBER.trim().replace(/[^0-9]/g, '');
            if (!num.startsWith("255")) num = "255" + num;
            UI.success(`[ENV] Namba imepatikana: ${num}`);
            return resolve(num);
        }

        UI.showPairingGuide();

        const tempRl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        let dotCount = 0;
        const bgInterval = setInterval(() => {
            dotCount++;
            const dots = '.'.repeat(dotCount % 4);
            process.stdout.write(chalk.dim(`\r  ⏳ [ACTIVE] Bot inatafuta signal yako... ${dots.padEnd(4, ' ')}  `));
        }, 2000);

        const timeout = setTimeout(() => {
            clearInterval(bgInterval);
            tempRl.close();
            process.stdout.write('\n');
            console.log(chalk.yellow('\n⏰ [TIMEOUT] Hakuna namba iliyoingizwa. Inajipanga upya...'));
            reject(new Error('User timeout'));
        }, 60000);

        tempRl.question(chalk.cyan.bold(`\n\n  ⚡ Andika Namba yako HAPA (Mfano: 255612130873) ➜ `), (answer) => {
            clearTimeout(timeout);
            clearInterval(bgInterval);
            
            let num = answer.trim().replace(/[^0-9]/g, '');
            if (!num.startsWith("255")) num = "255" + num;
            
            tempRl.close();
            process.stdout.write('\n');
            
            if (num.length < 10) {
                UI.error(`Namba "${num}" inaonekana fupi sana. Jaribu tena.`);
                setTimeout(() => reject(new Error('Invalid number format')), 500);
            } else {
                UI.success(`Namba imethibitishwa: ${num}`);
                console.log(chalk.yellow(`  ⚡ Tumia pairing code: ${CUSTOM_PAIRING_CODE} kwenye WhatsApp if prompted.`));
                resolve(num);
            }
        });
    });
}

// ────────────────────────────────────────────────────────────────
// MAIN CONNECTION ENGINE
// ────────────────────────────────────────────────────────────────
let whatsappBot = null;
let isWhatsAppRunning = false;

async function startMickeyBot() {
    try {
        ensureDirectories();
        autoClean();

        if (process.argv.includes('--clear-session')) {
            if (fs.existsSync(SESSION_DIR)) fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            console.log(chalk.green('Session cleared. Restart bot.'));
            process.exit(0);
        }

        UI.banner();

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.cyan('  » Core Engine :'), chalk.green(`Baileys v${version.join('.')}`));

        // ★★★ FIX APPLIED HERE ★★★
        // Run the auto-healer before loading session
        const isSessionValid = validateAndRepairSessionPath();

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        
        // Check if credentials actually exist based on our auto-healer
        const hasSession = isSessionValid && Boolean(state.creds && Object.keys(state.creds).length > 0 && state.creds.registered);
        
        if (!isSessionValid) {
            console.log(chalk.cyan('  » Security auth:'), chalk.yellow('🔄 Empty session repaired. Pairing Required'));
        } else {
            console.log(chalk.cyan('  » Security auth:'), hasSession ? chalk.green('✅ Session Loaded ✓') : chalk.yellow('🔄 Pairing Required'));
        }

        const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: true,
            browser: ["Ubuntu", "Chrome", "120.0.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'silent' }))
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            getMessage: async (key) => {
                if (!key || !key.id) return undefined;
                const jid = key.remoteJid || key.participant || key.sender || '';
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || undefined;
            }
        });

        whatsappBot = Mickey;
        Mickey.ev.on("creds.update", saveCreds);
        store.bind(Mickey.ev);

        Mickey.ev.on("messages.upsert", async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message) return;
                if (mek.key?.remoteJid === "status@broadcast") {
                    if (handleStatus) await handleStatus(Mickey, chatUpdate);
                    return;
                }
                if (handleMessages) await handleMessages(Mickey, chatUpdate, true);
            } catch (err) {}
        });

        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                UI.info('🔐 Pairing QR/code generated. Scan it with WhatsApp.');
                UI.info(`👉 Custom pairing code: ${CUSTOM_PAIRING_CODE}`);
                UI.info('👉 If WhatsApp asks for a code, copy the exact custom code above.');
            }

            if (connection === "connecting") {
                UI.info('🔄 WhatsApp is connecting...');
                UI.info(`   Use phone number +255... and pairing code: ${CUSTOM_PAIRING_CODE}`);
            }

            if (connection === "open") {
                isWhatsAppRunning = true;
                console.log('\n' + chalk.bgGreen.black.bold("  🚀 POWER CORE ONLINE  ") + chalk.greenBright(" Connected to WhatsApp.\n"));
                console.log(chalk.cyan('  ┌─[ BOT METRICS ]'));
                console.log(chalk.cyan('  │ ') + chalk.white(`User-ID  : ${chalk.greenBright(Mickey.user.id.split(':')[0])}`));
                console.log(chalk.cyan('  └────────────────'));
                UI.divider();
            }

            if (connection === "close") {
                isWhatsAppRunning = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || 'Unknown';

                if (statusCode === DisconnectReason.loggedOut) {
                    UI.warning('🔴 Session logged out. Clear session manually.');
                    process.exit(1);
                }

                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    const delayTime = Math.min(2000 + (reconnectAttempts * 2000), 60000);
                    reconnectAttempts++;
                    console.log(chalk.cyan(`  🔄 [RECONNECT] Retry in ${(delayTime/1000).toFixed(1)}s... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`));
                    await delay(delayTime);
                    return startMickeyBot();
                }
            }
        });

        // ────────────────────────────────────────────────────────────────
        // PAIRING ENGINE (CUSTOM "MICKDADY")
        // ────────────────────────────────────────────────────────────────
        if (!hasSession && !isPairing) {
            isPairing = true;
            let phoneNumber = "";

            try {
                phoneNumber = await Promise.race([
                    askPhoneNumber(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Global Timeout')), 70000))
                ]);

                        if (typeof Mickey.requestPairingCode === 'function') {
                    UI.info(`🔐 Injecting custom pair signature "${CUSTOM_PAIRING_CODE}"...`);
                    await delay(2000);
                    await Mickey.requestPairingCode(phoneNumber, CUSTOM_PAIRING_CODE);
                } else {
                    UI.warning('⚠️ requestPairingCode() haipatikani kwenye toleo hili la Baileys.');
                    UI.info('👉 Tafadhali tumia WhatsApp Link a Device → Link with phone number instead.');
                    UI.info(`👉 Ikiwa WhatsApp inaomba code, tumia: ${CUSTOM_PAIRING_CODE}`);
                    await delay(2000);
                }

                console.log('\n' + chalk.magenta.bold('  ┌────────────────────────────────────────────────────────┐'));
                console.log(chalk.magenta.bold('  │') + chalk.bgMagenta.black.bold('              🔐 PAIRING CODE GENERATED               ') + chalk.magenta.bold('  │'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.greenBright.bold(`               👉    ${CUSTOM_PAIRING_CODE}    👈               `) + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  ├────────────────────────────────────────────────────────┤'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   NOTE: Enter this code in WhatsApp if prompted.') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  │') + chalk.white.bold('   Use Link a Device → Link with phone number instead') + chalk.magenta.bold('│'));
                console.log(chalk.magenta.bold('  └────────────────────────────────────────────────────────┘\n'));
                UI.info('⏳ Waiting for WhatsApp handshake...');

            } catch (err) {
                UI.error('❌ Pairing interrupted: ' + err.message);
                if (pairingAttempts < 5) {
                    pairingAttempts++;
                    isPairing = false;
                    UI.info('🔄 Retrying in 5 seconds...');
                    await delay(5000);
                    return startMickeyBot();
                } else {
                    UI.error('Max retries reached. Restart bot.');
                    process.exit(1);
                }
            }
        }
        return Mickey;

    } catch (err) {
        UI.error('Core Error: ' + err.message);
        await delay(5000);
        return startMickeyBot();
    }
}

// ────────────────────────────────────────────────────────────────
// BOOT SEQUENCE
// ────────────────────────────────────────────────────────────────
async function initializeBot() {
    ensureDirectories();
    UI.banner();

    setInterval(autoClean, CLEANUP_INTERVAL_MS);

    if (settings.telegram?.botToken && startTelegramBot) {
        try { await startTelegramBot(); } catch (err) {}
    }

    await startMickeyBot();

    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n  👋 Shutting down gracefully...'));
        if (whatsappBot) { try { await whatsappBot.end(); } catch(e) {} }
        process.exit(0);
    });
}

initializeBot().catch(err => {
    console.error(chalk.red('Fatal error:'), err.message);
    setTimeout(() => initializeBot(), 10000);
});