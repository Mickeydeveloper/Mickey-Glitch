require('./settings');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require('chalk');
const readline = require("readline");
const { rmSync } = require('fs');

// Import handlers from main.js
const { handleMessages, handleStatusUpdate } = require('./main');

const sessionPath = `./session`;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startMickeyBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"], 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        markOnlineOnConnect: true
    });

    // Pairing code
    if (!conn.authState.creds.registered) {
        let num = await question(chalk.yellow("\nEnter phone number (e.g., 255615944741): "));
        num = num.replace(/[^0-9]/g, '');
        setTimeout(async () => {
            try {
                const code = await conn.requestPairingCode(num, "MICKDADY");
                console.log(chalk.black.bgGreen(` PAIRING CODE: `), chalk.bold.white(code));
            } catch (err) { console.log(chalk.red("Error pairing."));
            }
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    // Message and status handler
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;

            // Status handler
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                if (typeof handleStatusUpdate === 'function') {
                    await handleStatusUpdate(conn, chatUpdate);
                } else {
                    console.log(chalk.red("[ ERROR ] handleStatusUpdate not found in main.js"));
                }
                return;
            }

            // Command and chatbot handler
            if (typeof handleMessages === 'function') {
                await handleMessages(conn, chatUpdate);
            }
        } catch (err) {
            console.log(chalk.red("[ ERROR ] Message handler:"), err.message);
        }
    });

    // Connection status handler
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(chalk.green.bold('\n✅ MICKEY GLITCH IS ONLINE'));
            
            const botNum = jidNormalizedUser(conn.user.id);
            await conn.sendMessage(botNum, {
                text: `✨ *MICKEY GLITCH BOT* ✨\n\n🟢 Status: Online\n🚀 Mode: Ultra Lightweight\n💾 RAM: 172.21 MB\n🎯 All Systems Operational\n\nConnect now — message "start"`
            });
        }
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                rmSync(sessionPath, { recursive: true, force: true });
                process.exit(1);
            } else { startMickeyBot(); }
        }
    });
}

startMickeyBot();
