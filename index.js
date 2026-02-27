// index.js - MICKEY GLITCH BOT - Fixed Flow 2026

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

let phoneAsked = false;

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
            logger: pino({ level: 'fatal' }), // silent - no spam
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

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (connection === 'connecting') {
                console.log(chalk.blue('Connecting to WhatsApp servers...'));
            }

            if (qr) {
                console.log(chalk.yellow('[Fallback] QR ready (ignore for pairing)'));
            }

            // Ask number when connecting/QR appears (better timing)
            if ((connection === 'connecting' || qr) && !state.creds.registered && !phoneAsked) {
                phoneAsked = true;
                console.log(chalk.yellow.bold("\nNEW SESSION - PAIRING REQUIRED"));
                const rawPhone = await question(chalk.yellow("Enter your phone number (e.g. 255715123456): "));
                let phone = rawPhone.replace(/[^0-9]/g, '');

                if (phone.length < 9) {
                    console.log(chalk.red("Invalid number. Restart bot and try again."));
                    process.exit(1);
                }
                if (!phone.startsWith('255')) phone = '255' + phone;

                console.log(chalk.cyan("Number OK. Requesting pairing code... (wait 5-15s)"));

                // Safety delay for slow hosts
                await new Promise(r => setTimeout(r, 4000));

                try {
                    const code = await sock.requestPairingCode(phone); // standard - no custom suffix

                    console.log(chalk.black.bgGreen("\n╔════════════════════════════╗"));
                    console.log(chalk.black.bgGreen("║     YOUR PAIRING CODE      ║"));
                    console.log(chalk.black.bgGreen(`║   ${code.match(/.{1,4}/g)?.join(' - ') || code}   ║`));
                    console.log(chalk.black.bgGreen("╚════════════════════════════╝"));

                    console.log(chalk.yellow("\n→ Open WhatsApp on phone"));
                    console.log(chalk.yellow("→ Settings → Linked Devices → Link with phone number"));
                    console.log(chalk.yellow("→ Paste code above (expires soon!)"));
                    console.log(chalk.green("Bot will connect automatically after pairing."));
                } catch (err) {
                    console.error(chalk.red("[PAIRING ERROR]"), err.message || err);
                    console.log(chalk.yellow("Tip: If 'Connection Closed' → restart bot or try later (host network slow)"));
                    phoneAsked = false; // allow retry
                }
            }

            if (connection === 'open') {
                console.log(chalk.green.bold('\n✅ MICKEY GLITCH BOT ONLINE'));

                try {
                    const me = jidNormalizedUser(sock.user?.id);
                    if (me) {
                        // Improved text-only ad formula (no image, copy-paste ready)
                        await sock.sendMessage(me, { 
                            text: `✨ *MICKEY GLITCH BOT* – YOUR BUSINESS BOOSTER ✨

🟢 Online 24/7 – No downtime
⚡ Ultra-fast replies – Zero delay
💼 WhatsApp Business optimized
🚀 Lightweight, stable & secure
💬 Just send *start* to activate

Grow your sales now! Reply *start* 🔥
https://wa.me/${sock.user.id.split(':')[0]}`
                        });
                    }
                } catch (err) {
                    console.error(chalk.red("[Ad message failed]"), err.message);
                }

                phoneAsked = false;
                reconnectAttempts = 0;
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.yellow(`Disconnected (code: ${code || 'unknown'})`));

                if (code === DisconnectReason.loggedOut) {
                    console.log(chalk.red("Logged out → cleaning session"));
                    await fs.rm(SESSION_FOLDER, { recursive: true, force: true }).catch(() => {});
                    process.exit(1);
                }

                const delay = Math.min(5000 * (reconnectAttempts + 1), 60000);
                console.log(chalk.cyan(`Reconnecting in ${delay/1000} seconds...`));
                setTimeout(() => startBot(reconnectAttempts + 1), delay);
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