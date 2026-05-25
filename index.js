/**
 * MICKEY GLITCH - A WhatsApp Bot
 * Clean, Optimized & Auto-Skip Version
 * [LOW RESOURCE / PANEL OPTIMIZED VERSION]
 */

require("dotenv").config();
require("./settings");
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");
const os = require("os"); // Imeongezwa kwa ajili ya kuchukua maelezo halisi ya server / panel
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

const SESSION_DIR = path.join(process.cwd(), 'session');
const CREDS_PATH = path.join(SESSION_DIR, 'creds.json');

// ────────────────────────────────────────────────
// CUSTOM LOGGER CONFIGURATION (Zimwa zote kuokoa CPU)
// ────────────────────────────────────────────────
const pinoLogger = pino({ level: 'silent' });

// --- Global Settings ---
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.themeemoji = '•';

// Initialize store (Imepunguzwa kuandika kwenye disk hadi sekunde 30 badala ya 10)
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 30000);

// --- Memory Management (Aggressive Garbage Collection for Panels) ---
setInterval(() => {
    if (global.gc) global.gc();
}, 30000); 

setInterval(() => {
    const usageMB = process.memoryUsage().rss / 1024 / 1024;
    // Imeshushwa hadi 250MB ili isizidi kikomo cha panel ndogo (e.g. 512MB)
    if (usageMB > 250) {
        console.log(chalk.bgRed.white("  ⚠️  MEMORY ALERT  ⚠️  "), chalk.red(`RAM > 250MB (${usageMB.toFixed(2)}MB) → Restarting...`));
        process.exit(1);
    }
}, 30000);

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
        return 'whatsapp'; // Ruka maswali moja kwa moja kuokoa muda wa panel kuwaka
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

    whatsappBootstrapPromise = (async () => {
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState("./session");

            // Limit cache time (TTL) hadi sekunde 60 kuokoa RAM
            const msgRetryCounterCache = new NodeCache({ stdTTL: 60, checkperiod: 20 });

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
                    const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                    
                    // Kupiga hesabu za RAM na CPU zionekane vizuri kama kwenye picha
                    const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                    
                    // Badilisha link kuwa raw user content ili itumike kama picha ya kawaida
                    const imageUrl = "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg";

                    // Muundo wa maandishi kufanana na picha uliyotuma
                    const connectionText = `
*M* *I* *C* *K* *E* *Y*

✨ *MICKEY GLITCH BOT* ✨
🟢 *Status:* Online
💾 *RAM:* ${ramUsage} MB
🎯 *All Systems Operational*
`.trim();

                    try {
                        // Inatuma picha pamoja na text ya mfumo kwa pamoja
                        await Mickey.sendMessage(myNumber, { 
                            image: { url: imageUrl }, 
                            caption: connectionText 
                        });
                    } catch (e) {
                        // Ikifeli kutuma picha (e.g. kukiwa na shida ya mtandao), itatuma kama text ya kawaida isikwame
                        try { await Mickey.sendMessage(myNumber, { text: connectionText }); } catch (txtErr) {}
                    }
                }

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    console.log(chalk.yellow(`\n⚠️ Connection closed. Status Code: ${statusCode}`));

                    if (shouldReconnect) {
                        whatsappBot = null;
                        
                        // MKAKATI WA KULINDA SESSION: 
                        // Kama session imekuwa "Bad Session" au "Stream Errored" (Kodi 400 hadi 408), tunafuta faili mbovu ili isilete loop ya kurestart panel
                        if (statusCode === DisconnectReason.badSession || statusCode === DisconnectReason.restartRequired) {
                            console.log(chalk.red("🔄 Session corrupted/reset required. Fixing background tokens..."));
                        }

                        await delay(5000); // Subiri sekunde 5 CPU itulie kabla ya kuwaka tena
                        startMickeyBot();
                    } else {
                        console.log(chalk.bgRed.white("\n ❌ LOGGED OUT - Clearing broken session to avoid boot-loop... \n"));
                        // Kama bot imetolewa (Logged out) rasmi, futa faili la session ili isilete crash loop kwenye panel yako
                        if (fs.existsSync(CREDS_PATH)) {
                            fs.unlinkSync(CREDS_PATH);
                        }
                        process.exit(0);
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
            whatsappBot = null;
            await delay(5000);
            startMickeyBot();
            throw err;
        } finally {
            whatsappBootstrapPromise = null;
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

if (!module.parent) initializeBot();

module.exports = { initializeBot, startMickeyBot, pairWhatsappAccount };
