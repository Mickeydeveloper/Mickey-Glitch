/**
 * MICKEY GLITCH - A WhatsApp Bot
 * Clean, Optimized & Auto-Skip Version
 * [LOW RESOURCE / PANEL OPTIMIZED VERSION - ENHANCED]
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

let whatsappBot = null;
let whatsappBootstrapPromise = null;
let lastPairingCode = null;
let reconnectAttempts = 0;
let lastReconnectTime = 0;
let isShuttingDown = false;

const SESSION_DIR = path.join(process.cwd(), 'session');
const CREDS_PATH = path.join(SESSION_DIR, 'creds.json');

// ────────────────────────────────────────────────
// CUSTOM LOGGER CONFIGURATION (Zimwa zote kuokoa CPU)
// ────────────────────────────────────────────────
const pinoLogger = pino({ level: 'silent' });

// --- Global Settings ---
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.themeemoji = '•';

// Initialize store (Imepunguzwa kuandika kwenye disk hadi sekunde 60 kuokoa disk I/O)
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 60000);

// --- Memory Management (Aggressive but Safe) ---
let memoryCheckInterval = setInterval(() => {
    if (global.gc) global.gc();
}, 60000); // Punguza frequency ya GC

let memoryAlertInterval = setInterval(() => {
    const usageMB = process.memoryUsage().rss / 1024 / 1024;
    // Ongeza threshold hadi 400MB kuepuka restarts zisizo za lazima
    if (usageMB > 400 && !isShuttingDown) {
        console.log(chalk.bgYellow.black("  ⚠️  MEMORY WARNING  ⚠️  "), chalk.yellow(`RAM > 400MB (${usageMB.toFixed(2)}MB) - Cleaning...`));
        if (global.gc) global.gc();
        
        // Ikiwa bado iko juu sana baada ya GC
        setTimeout(() => {
            const newUsage = process.memoryUsage().rss / 1024 / 1024;
            if (newUsage > 500 && !isShuttingDown) {
                console.log(chalk.bgRed.white("  🔄  MEMORY RESTART  🔄  "), chalk.red(`RAM > 500MB - Soft restart...`));
                softRestart();
            }
        }, 5000);
    }
}, 60000); // Angalia kila dakika moja badala ya sekunde 30

// Soft restart function (bila kuacha process kabisa)
async function softRestart() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(chalk.yellow("🔄 Performing soft restart..."));
    
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

// --- Interface for Pairing ---
const pairingCode = true; 
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber || "255615858685");
};

function normalizeWhatsappNumber(phoneNumber) {
    const cleaned = String(phoneNumber || '').replace(/\D/g, '');
    if (!cleaned) return '';
    return cleaned.startsWith('255') ? cleaned : `255${cleaned}`;
}

async function chooseStartupMode() {
    if (fs.existsSync(CREDS_PATH)) {
        return 'whatsapp';
    }

    const settingMode = settings.mode?.toLowerCase() === 'telegram' ? 'telegram' : 'whatsapp';
    if (!rl) return settingMode;

    console.log(chalk.bgBlue.white("\n  🚀  MICKEY GLITCH STARTUP MODE  🚀  \n"));
    console.log('Chagua mode ya bot:\n  1) WhatsApp\n  2) Telegram\n  3) Settings.js Mode');

    const answer = (await question('Chagua (1/2/3) [3]: ')).trim();
    if (answer === '1') return 'whatsapp';
    if (answer === '2') return 'telegram';
    return settingMode;
}

async function startMickeyBot(options = {}) {
    if (whatsappBot) return whatsappBot;
    if (whatsappBootstrapPromise) return whatsappBootstrapPromise;
    
    // Anti reconnect spam
    const now = Date.now();
    if (now - lastReconnectTime < 30000 && reconnectAttempts > 3) {
        console.log(chalk.red("⚠️ Too many reconnect attempts! Waiting 2 minutes..."));
        await delay(120000);
        reconnectAttempts = 0;
    }
    lastReconnectTime = now;

    whatsappBootstrapPromise = (async () => {
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState("./session");

            // Limit cache time (TTL) hadi sekunde 120 kuokoa RAM na kuongeza utulivu
            const msgRetryCounterCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

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
                cachedGroupMetadata: async (jid) => undefined,
                connectTimeoutMs: 60000, // Ongeza timeout
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000, // Punguza keep-alive frequency
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

            whatsappBot = Mickey;
            lastPairingCode = null;
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection

            Mickey.ev.on("creds.update", saveCreds);
            store.bind(Mickey.ev);

            Mickey.ev.on("messages.upsert", async chatUpdate => {
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
                        } catch (innerErr) {}
                    });

                } catch (err) {}
            });

            Mickey.ev.on("call", async (callData) => {
                try {
                    await handleAnticall(Mickey, { call: callData });
                } catch (err) {}
            });

            Mickey.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    console.log(chalk.green.bold('\n✅ Mickey Glitch Online!\n'));
                    reconnectAttempts = 0;
                    
                    const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                    const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                    const imageUrl = "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg";

                    const connectionText = `
*M* *I* *C* *K* *E* *Y*

✨ *MICKEY GLITCH BOT* ✨
🟢 *Status:* Online
💾 *RAM:* ${ramUsage} MB
🎯 *All Systems Operational*
`.trim();

                    try {
                        await Mickey.sendMessage(myNumber, { 
                            image: { url: imageUrl }, 
                            caption: connectionText 
                        });
                    } catch (e) {
                        try { await Mickey.sendMessage(myNumber, { text: connectionText }); } catch (txtErr) {}
                    }
                }

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    console.log(chalk.yellow(`\n⚠️ Connection closed. Status Code: ${statusCode}`));
                    
                    reconnectAttempts++;
                    console.log(chalk.cyan(`Reconnect attempt ${reconnectAttempts}/10`));
                    
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut && reconnectAttempts <= 10;

                    if (shouldReconnect && !isShuttingDown) {
                        whatsappBot = null;
                        whatsappBootstrapPromise = null;
                        
                        // Calculate backoff delay (exponential backoff)
                        const backoffDelay = Math.min(30000, 5000 * Math.pow(1.5, reconnectAttempts));
                        console.log(chalk.yellow(`Waiting ${backoffDelay/1000} seconds before reconnecting...`));
                        
                        await delay(backoffDelay);
                        
                        if (!isShuttingDown) {
                            startMickeyBot();
                        }
                    } else if (statusCode === DisconnectReason.loggedOut) {
                        console.log(chalk.bgRed.white("\n ❌ LOGGED OUT - Session invalid \n"));
                        if (fs.existsSync(CREDS_PATH)) {
                            fs.unlinkSync(CREDS_PATH);
                        }
                        if (!isShuttingDown) {
                            isShuttingDown = true;
                            process.exit(0);
                        }
                    } else {
                        console.log(chalk.bgRed.white("\n ❌ MAX RECONNECT ATTEMPTS REACHED - Manual restart needed \n"));
                        if (!isShuttingDown) {
                            isShuttingDown = true;
                            process.exit(1);
                        }
                    }
                }
            });

            if (pairingCode && !Mickey.authState.creds.registered) {
                const isTelegramTriggered = Boolean(options.useTelegramPairing);
                let num = isTelegramTriggered
                    ? normalizeWhatsappNumber(options.phoneNumber || settings.ownerNumber)
                    : await question(chalk.greenBright("📱 Enter phone number: "));

                if (!num) num = normalizeWhatsappNumber(settings.ownerNumber);
                num = String(num).replace(/[^0-9]/g, '');

                try {
                    const generatedCode = await Mickey.requestPairingCode(num, options.deviceName || settings.telegram?.pairCode || 'MICKDADY');
                    lastPairingCode = typeof generatedCode === 'string' ? generatedCode.trim() : 'MICKDADY';
                    console.log(chalk.white.bold("\n🔐 CODE: ") + chalk.green.bold(lastPairingCode) + "\n");
                } catch (e) {
                    throw e;
                }
            }

            return Mickey;
        } catch (err) {
            console.error(chalk.red("Startup error:"), err);
            whatsappBot = null;
            whatsappBootstrapPromise = null;
            
            reconnectAttempts++;
            
            if (reconnectAttempts <= 5 && !isShuttingDown) {
                await delay(10000);
                return startMickeyBot();
            } else if (!isShuttingDown) {
                isShuttingDown = true;
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
        deviceName: options.deviceName || settings.telegram?.pairCode || 'MICKDADY'
    });
    return { bot, pairingCode: lastPairingCode, registered: Boolean(bot?.authState?.creds?.registered) };
}

async function initializeBot() {
  const startupMode = await chooseStartupMode();
  if (startupMode === 'telegram') {
    const { startTelegramBot } = require("./telegram-bot");
    startTelegramBot();
  } else {
    startMickeyBot();
  }
}

// Cleanup on exit
process.on('SIGINT', () => {
    if (!isShuttingDown) {
        isShuttingDown = true;
        console.log(chalk.yellow('\n🛑 Shutting down gracefully...'));
        if (whatsappBot) {
            whatsappBot.end().catch(() => {});
        }
        setTimeout(() => process.exit(0), 2000);
    }
});

process.on('SIGTERM', () => {
    if (!isShuttingDown) {
        isShuttingDown = true;
        console.log(chalk.yellow('\n🛑 Terminating...'));
        if (whatsappBot) {
            whatsappBot.end().catch(() => {});
        }
        setTimeout(() => process.exit(0), 2000);
    }
});

if (!module.parent) initializeBot();

module.exports = { initializeBot, startMickeyBot, pairWhatsappAccount };