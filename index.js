/**
 * MICKEY GLITCH - A WhatsApp Bot
 * Clean & Optimized Version
 */

require("dotenv").config();
require("./settings");
const fs = require('fs');
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

// --- Global Settings ---
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑™";
global.themeemoji = '•';

// Initialize store
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

// --- Memory Management ---
setInterval(() => {
    if (global.gc) global.gc();
}, 60000);

setInterval(() => {
    const usageMB = process.memoryUsage().rss / 1024 / 1024;
    if (usageMB > 450) {
        console.log(chalk.bgRed.white("  ⚠️  MEMORY ALERT  ⚠️  "), chalk.red(`RAM > 450MB (${usageMB.toFixed(2)}MB) → Restarting...`));
        process.exit(1);
    }
}, 30000);

// --- Interface for Pairing ---
const pairingCode = true; // Force pairing code mode
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber || "255615858685");
};

async function startMickeyBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState("./session");
        const msgRetryCounterCache = new NodeCache();

        const Mickey = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
            },
            markOnlineOnConnect: true,
            getMessage: async (key) => {
                let jid = state.creds.me?.id ? state.creds.me.id.split(':')[0] + "@s.whatsapp.net" : "";
                let msg = await store.loadMessage(jid, key.id);
                return msg?.message || undefined;
            },
            msgRetryCounterCache
        });

        Mickey.ev.on("creds.update", saveCreds);
        store.bind(Mickey.ev);

        // --- Event Handlers ---
        Mickey.ev.on("messages.upsert", async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message) return;
                
                if (mek.key?.remoteJid === "status@broadcast") {
                    await handleStatus(Mickey, chatUpdate);
                    return;
                }
                await handleMessages(Mickey, chatUpdate, true);
            } catch (err) {
                console.log(chalk.bgRed.black("  ⚠️  MSG ERROR  ⚠️  "), chalk.red(err.message));
            }
        });

        Mickey.ev.on("call", async (callData) => {
            try {
                await handleAnticall(Mickey, { call: callData });
            } catch (err) {
                console.log(chalk.bgRed.black("  ⚠️  CALL ERROR  ⚠️  "), chalk.red(err.message));
            }
        });

        Mickey.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "open") {
                console.log(chalk.bgGreen.black("  ✨  CONNECTED  ✨  "), chalk.green("Mickey Glitch Online!"));
                
                const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                const welcomeMsg = `✨ *MICKEY GLITCH BOT* ✨\n🟢 *Status:* Online\n💾 *RAM:* ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB\n🎯 All Systems Operational`.trim();
                
                await Mickey.sendMessage(myNumber, {
                    text: welcomeMsg,
                    contextInfo: {
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363398106360290@newsletter",
                            newsletterName: "🅼🅸🅲🅺🅴🆈",
                            serverMessageId: 100
                        }
                    }
                });
                
                console.log(chalk.bgGreen.black("  ✅  STARTUP  ✅  "), chalk.green("Bot is ready for tasks."));
            }

            if (connection === "close") {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log(chalk.bgYellow.black("  🔄  RECONNECTING  🔄  "));
                    startMickeyBot();
                }
            }
        });

        // --- Custom Pairing Implementation ---
        if (pairingCode && !Mickey.authState.creds.registered) {
            console.log(chalk.bgMagenta.white("  ⏳  PAIRING REQUIRED  ⏳  "));
            
            let num = await question(chalk.bgBlack(chalk.greenBright("Weka namba ya simu (mfano: 255xxx): ")));
            num = num.replace(/[^0-9]/g, '');
            if (!num.startsWith("255")) num = "255" + num;

            setTimeout(async () => {
                try {
                    // HAPA NDIPO TUNAPOWEKA CUSTOM CODE
                    let code = await Mickey.requestPairingCode(num, "MICKDADY");
                    
                    console.log('');
                    console.log(chalk.bgCyan.black("  🔐  YOUR CUSTOM PAIRING CODE  🔐  "));
                    console.log(chalk.white.bold("  CODE: ") + chalk.green.bold("MICKDADY"));
                    console.log(chalk.yellow("→ Ingiza code hii kwenye WhatsApp yako (Linked Devices)"));
                    console.log('');
                } catch (e) {
                    console.log(chalk.red("Error generating pairing code: " + e.message));
                }
            }, 3000);
        }

        return Mickey;

    } catch (err) {
        console.log(chalk.bgRed.white("  ❌  CRITICAL ERROR  ❌  "), chalk.red(err.message));
        await delay(8000);
        startMickeyBot();
    }
}

startMickeyBot();
