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
const { getButtonId, isButtonResponse, autoDetectButtonCommand, isCommandId } = require("./lib/buttonLoader");
const store = require("./lib/lightweight_store");
const settings = require("./settings");

// ────────────────────────────────────────────────
// CUSTOM LOGGER CONFIGURATION
// ────────────────────────────────────────────────
const pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'warn', 
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{levelLabel} - {msg}'
        }
    }
});

const originalLog = console.log;
console.log = function(...args) {
    originalLog(...args);
};

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
const pairingCode = true; 
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber || "255615858685");
};

async function startMickeyBot() {
    try {
        console.log('\n' + chalk.bgBlue.white("  🚀  STARTING MICKEY GLITCH BOT  🚀  ") + '\n');

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.cyan('📦 Baileys Version:'), chalk.green(version.join('.')));

        const { state, saveCreds } = await useMultiFileAuthState("./session");
        console.log(chalk.cyan('📁 Session Status:'), chalk.green('Loaded'));

        const msgRetryCounterCache = new NodeCache();
        console.log(chalk.cyan('💾 Cache Status:'), chalk.green('Initialized'));

        const newsletterJid = "120363398106360290@newsletter";

        const Mickey = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'silent' }))
            },
            markOnlineOnConnect: true,
            // --- FIXES ADDED HERE ---
            syncFullHistory: false, 
            generateHighQualityLinkPreview: true,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                if (requiresPatch) {
                    message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...message } } };
                }
                return message;
            },
            // ------------------------
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

                // 🔘 Button & List Handler - Detect any button ID
                if (isButtonResponse(mek)) {
                    const buttonId = getButtonId(mek);
                    if (buttonId) {
                        console.log(chalk.cyan(`🔘 Button/List Response: ${buttonId}`));
                        
                        // Check if button is a command (starts with .)
                        if (isCommandId(buttonId)) {
                            // Auto-detect and convert to command for main handler
                            const command = autoDetectButtonCommand(mek);
                            if (command) {
                                // Inject command into message for handling
                                mek.message.conversation = command;
                                mek.message.extendedTextMessage = null;
                                await handleMessages(Mickey, chatUpdate, true);
                                return;
                            }
                        } else {
                            // Static button handlers (handle any ID dynamically)
                            console.log(chalk.green(`✅ Button handler triggered for ID: ${buttonId}`));
                            // Button handlers can be extended here for custom logic
                        }
                    }
                }

                // Status updates
                if (mek.key?.remoteJid === "status@broadcast") {
                    await handleStatus(Mickey, chatUpdate);
                    return;
                }
                
                await handleMessages(Mickey, chatUpdate, true);
            } catch (err) {
                if (!err.message?.includes("No session found") && 
                    !err.message?.includes("No matching sessions") &&
                    !err.message?.includes("timed out waiting")) {
                    console.log(chalk.bgRed.black("  ⚠️  MSG ERROR  ⚠️  "), chalk.red(err.message));
                }
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
                console.log('\n' + chalk.bgGreen.white("  ✨  CONNECTED  ✨  "));
                console.log(chalk.green.bold('✅ Mickey Glitch Online!\n'));

                const myNumber = Mickey.user.id.split(':')[0] + "@s.whatsapp.net";
                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                const welcomeMsg = `✨ *MICKEY GLITCH BOT* ✨\n🟢 *Status:* Online\n💾 *RAM:* ${ramUsage} MB\n🎯 All Systems Operational`.trim();

                try {
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
                    console.log(chalk.green('📨 Welcome message sent to bot number\n'));
                } catch (e) {
                    console.log(chalk.yellow('⚠️ Could not send welcome message\n'));
                }

                // Send startup notification to bot owner with newsletter reference
                try {
                    await Mickey.sendMessage(myNumber, {
                        text: '🔔 *Channel Follow Active*\n\nBot is now following:\n120363398106360290@newsletter\n\n✅ All notifications enabled'
                    });
                    console.log(chalk.green('📢 Newsletter follow notification sent\n'));
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Could not send newsletter notification: ${e.message}\n`));
                }

                console.log(chalk.bgGreen.black("  ✅  STARTUP COMPLETE  ✅  "));
                console.log(chalk.green('🤖 Bot is ready for tasks.\n'));
            }

            if (connection === "close") {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('\n' + chalk.bgYellow.black("  🔄  CONNECTION LOST - RECONNECTING...  🔄  ") + '\n');
                    await delay(3000);
                    startMickeyBot();
                } else {
                    console.log('\n' + chalk.bgRed.white("  ❌  LOGGED OUT - RESTART REQUIRED  ❌  ") + '\n');
                    process.exit(0);
                }
            }
        });

        // --- Custom Pairing Implementation (Unchanged) ---
        if (pairingCode && !Mickey.authState.creds.registered) {
            console.log('\n' + chalk.bgMagenta.white("  ⏳  PAIRING REQUIRED - SCAN DEVICE  ⏳  ") + '\n');

            let num = await question(chalk.bgBlack(chalk.greenBright("📱 Enter phone number (e.g., 255xxx): ")));
            num = num.replace(/[^0-9]/g, '');
            if (!num.startsWith("255")) num = "255" + num;

            console.log(chalk.yellow('⏳ Generating pairing code...\n'));

            setTimeout(async () => {
                try {
                    let code = await Mickey.requestPairingCode(num, "MICKDADY");

                    console.log(chalk.bgCyan.black("  🔐  YOUR CUSTOM PAIRING CODE  🔐  "));
                    console.log(chalk.white.bold("  CODE: ") + chalk.green.bold("MICKDADY"));
                    console.log(chalk.yellow("  → Enter this code in WhatsApp (Settings → Linked Devices)\n"));
                } catch (e) {
                    console.log(chalk.red('❌ Error generating pairing code: ' + e.message + '\n'));
                }
            }, 3000);
        }

        console.log(chalk.cyan('✅ Socket initialized successfully\n'));
        return Mickey;

    } catch (err) {
        console.log('\n' + chalk.bgRed.white("  ❌  CRITICAL ERROR  ❌  "));
        console.log(chalk.red('Error Message: ' + err.message));
        console.log(chalk.red('Stack: ' + err.stack));
        console.log(chalk.yellow('⏳ Restarting in 5 seconds...\n'));
        await delay(5000);
        startMickeyBot();
    }
}

console.log(chalk.bgBlue.white("  🚀  INITIALIZING MICKEY GLITCH  🚀  \n"));
console.log(chalk.bgBlue.white("\n  🚀  STARTING WHATSAPP CONNECTION  🚀  \n"));
startMickeyBot();
