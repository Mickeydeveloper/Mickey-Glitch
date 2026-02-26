require('./settings'); // keep if needed

const {
    default: makeWASocket,
    useSingleFileAuthState,   // ← CHANGED: much better for disk usage
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const chalk = require('chalk');
const readline = require("readline");
const fs = require('fs').promises; // better than sync methods
const path = require('path');

// Import handlers
const { handleMessages, handleStatusUpdate } = require('./main');

const AUTH_FILE = './auth_info_single.json'; // single file → low disk usage
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startMickeyBot(reconnectAttempts = 0) {
    try {
        const { version } = await fetchLatestBaileysVersion();

        // Use single file auth → solves disk explosion
        const { state, saveCreds } = useSingleFileAuthState(AUTH_FILE);

        const conn = makeWASocket({
            version,
            logger: pino({ level: 'fatal' }), // almost silent → better performance
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0"], // updated version looks more legit
            auth: state,
            markOnlineOnConnect: true,
            syncFullHistory: false,          // ← disable if not needed → faster connect
            shouldSyncHistoryMessage: () => false,
            downloadHistory: false,
            fireInitQueries: false,          // reduce initial load
            generateHighQualityLinkPreview: false, // optional: less resource
        });

        // Pairing code (only first time)
        if (!state.creds.registered) {
            console.log(chalk.yellow("\nNo session found. Pairing new device..."));
            let num = await question(chalk.yellow("Enter phone number (e.g., 255615944741): "));
            num = num.replace(/[^0-9]/g, '');

            if (!num.startsWith('255')) num = '255' + num;

            try {
                const code = await conn.requestPairingCode(num);
                console.log(chalk.black.bgGreen(`\nPAIRING CODE → ${code}`));
                console.log(chalk.yellow("Enter this code in WhatsApp → Link with Phone Number"));
            } catch (err) {
                console.log(chalk.red("Pairing failed:"), err.message);
                process.exit(1);
            }
        }

        conn.ev.on('creds.update', saveCreds);

        // Message handler
        conn.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;

                // Status view handler
                if (mek.key?.remoteJid === 'status@broadcast') {
                    if (typeof handleStatusUpdate === 'function') {
                        await handleStatusUpdate(conn, mek);
                    }
                    return;
                }

                // Main message/command handler
                if (typeof handleMessages === 'function') {
                    await handleMessages(conn, chatUpdate);
                }
            } catch (err) {
                console.log(chalk.red("[MSG ERROR]"), err.message);
            }
        });

        // Connection updates
        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, receivedPendingNotifications } = update;

            if (connection === 'open') {
                console.log(chalk.green.bold('✅ MICKEY GLITCH BOT → ONLINE'));

                const botJid = jidNormalizedUser(conn.user.id);

                // Improved ad-style message (better for WhatsApp Business ad)
                await conn.sendMessage(botJid, {
                    image: { url: 'https://files.catbox.moe/llc9v7.png' },
                    caption: `✨ *MICKEY GLITCH BOT* – FAST & RELIABLE ✨

🟢 Online & Ready 24/7
⚡ Ultra-fast replies – No delay
💼 WhatsApp Business Ready
🚀 Lightweight – Zero lag
💬 Just send *start* to begin

Reply now & let's grow your business! 🔥`
                });

                reconnectAttempts = 0; // reset counter
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;

                console.log(chalk.yellow(`Connection closed. Reason: ${statusCode || 'unknown'}`));

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(chalk.red("Logged out → deleting session..."));
                    await fs.unlink(AUTH_FILE).catch(() => {});
                    process.exit(1);
                }

                // Reconnect with backoff (prevents spam)
                const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000); // max 30s
                console.log(chalk.cyan(`Reconnecting in ${delay/1000}s...`));

                setTimeout(() => {
                    startMickeyBot(reconnectAttempts + 1);
                }, delay);
            }
        });

        // Optional: keep alive ping (helps on some hosts)
        setInterval(() => {
            conn?.sendPresenceUpdate('available').catch(() => {});
        }, 60000);

    } catch (err) {
        console.log(chalk.red("[FATAL START ERROR]"), err.message);
        setTimeout(() => startMickeyBot(reconnectAttempts + 1), 10000);
    }
}

// Start the bot
startMickeyBot();