// index.js - MICKEY GLITCH BOT - Clean & Stable (Feb 2026)

require('./settings'); // keep if needed

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const chalk = require('chalk');
const readline = require("readline");
const fs = require('fs').promises;

const { handleMessages, handleStatusUpdate } = require('./main');

const SESSION_FOLDER = './session';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let phoneNumber = null;
let pairingRequested = false;

async function startBot(reconnectAttempts = 0) {
    try {
        console.clear();
        console.log(chalk.blue.bold("MICKEY GLITCH BOT - Starting..."));
        console.log(chalk.cyan(`Attempt #${reconnectAttempts + 1}`));

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.gray(`WA version: ${version.join('.')}`));

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'fatal' }), // ← NO MORE SPAM LOGS (change to 'error' if needed)
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '130.0.0.0'],
            auth: state,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            shouldSyncHistoryMessage: () => false,
            downloadHistory: false,
            fireInitQueries: false,
        });

        sock.ev.on('creds.update', saveCreds);

        // Ask number ONLY if not registered and not asked yet
        if (!state.creds.registered && !phoneNumber) {
            console.log(chalk.yellow.bold("\nNEW SESSION - PAIRING REQUIRED"));
            phoneNumber = await question(chalk.yellow("Enter phone number (e.g. 255715123456): "));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            if (phoneNumber.length < 9) {
                console.log(chalk.red("Number too short. Restart bot and try again."));
                process.exit(1);
            }
            if (!phoneNumber.startsWith('255')) phoneNumber = '255' + phoneNumber;

            console.log(chalk.cyan("Number received. Waiting for connection to request code..."));
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(chalk.yellow("[Fallback] QR generated - ignore if using pairing"));
            }

            if (connection === 'open') {
                console.log(chalk.green.bold('\n✅ MICKEY GLITCH BOT ONLINE'));

                try {
                    const me = jidNormalizedUser(sock.user?.id);
                    if (me) {
                        await sock.sendMessage(me, {
                            image: { url: 'https://files.catbox.moe/llc9v7.png' },
                            caption: `✨ *MICKEY GLITCH BOT* – FAST & RELIABLE ✨

🟢 Online 24/7
⚡ Super fast replies
💼 WhatsApp Business ready
🚀 Stable & lightweight
💬 Send *start* to begin

Let's grow your business! 🔥`
                        });
                    }
                } catch (err) {
                    console.error(chalk.red("[Welcome error]"), err.message);
                }

                pairingRequested = false;
                reconnectAttempts = 0;
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.yellow(`Disconnected - code: ${code || 'unknown'}`));

                if (code === DisconnectReason.loggedOut) {
                    console.log(chalk.red("Logged out → cleaning session"));
                    await fs.rm(SESSION_FOLDER, { recursive: true, force: true }).catch(() => {});
                    process.exit(1);
                }

                const delay = Math.min(5000 * (reconnectAttempts + 1), 60000);
                console.log(chalk.cyan(`Reconnect in ${delay/1000}s...`));
                setTimeout(() => startBot(reconnectAttempts + 1), delay);
            }

            // Request pairing code at correct timing
            if ((connection === 'connecting' || qr) && phoneNumber && !pairingRequested && !state.creds.registered) {
                pairingRequested = true;
                await new Promise(r => setTimeout(r, 4000)); // safety delay for slow hosts

                try {
                    console.log(chalk.cyan("Requesting pairing code..."));

                    // Try custom suffix "MICKDADY" (works in some forks/custom versions)
                    // If your Baileys version does NOT support second arg → remove ", 'MICKDADY'"
                    const code = await sock.requestPairingCode(phoneNumber, 'MICKDADY');

                    console.log(chalk.black.bgGreen("\n╔════════════════════════════╗"));
                    console.log(chalk.black.bgGreen("║     YOUR PAIRING CODE      ║"));
                    console.log(chalk.black.bgGreen(`║   ${code.match(/.{1,4}/g)?.join(' - ') || code}   ║`));
                    console.log(chalk.black.bgGreen("╚════════════════════════════╝"));

                    console.log(chalk.yellow("\n→ WhatsApp → Settings → Linked Devices → Link with phone number"));
                    console.log(chalk.yellow("→ Enter the code above (expires soon)"));
                    console.log(chalk.green("Custom suffix 'MICKDADY' used — if code invalid, remove the second arg in code."));
                } catch (err) {
                    console.error(chalk.red("[PAIRING ERROR]"), err.message || err);

                    // Fallback: try without custom suffix
                    try {
                        console.log(chalk.yellow("Trying standard pairing code..."));
                        const fallbackCode = await sock.requestPairingCode(phoneNumber);
                        console.log(chalk.black.bgGreen("\n╔════════════════════════════╗"));
                        console.log(chalk.black.bgGreen("║   STANDARD PAIRING CODE    ║"));
                        console.log(chalk.black.bgGreen(`║   ${fallbackCode.match(/.{1,4}/g)?.join(' - ') || fallbackCode}   ║`));
                        console.log(chalk.black.bgGreen("╚════════════════════════════╝"));
                    } catch (fbErr) {
                        console.error(chalk.red("[FALLBACK FAILED]"), fbErr.message);
                    }
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg?.message) return;

                if (msg.key.remoteJid === 'status@broadcast') {
                    await handleStatusUpdate?.(sock, msg);
                    return;
                }

                await handleMessages?.(sock, m);
            } catch (err) {
                console.error(chalk.red("[MSG ERROR]"), err.message);
            }
        });

        setInterval(() => sock?.sendPresenceUpdate('available').catch(() => {}), 45000);

    } catch (err) {
        console.error(chalk.red("[START ERROR]"), err.message || err);
        setTimeout(() => startBot(reconnectAttempts + 1), 10000);
    }
}

// Start
startBot();