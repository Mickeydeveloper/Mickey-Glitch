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

// INGIZA HIZI FUNCTION KWA USAHIHI
const Main = require('./main'); 
// Tunahakikisha tunazipata hata kama zime-export-iwa tofauti
const handleMessages = Main.handleMessages || Main.default || Main;
const handleStatusUpdate = Main.handleStatusUpdate;

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

    // PAIRING CODE
    if (!conn.authState.creds.registered) {
        let num = await question(chalk.yellow("\nIngiza namba (Mfano: 255615944741): "));
        num = num.replace(/[^0-9]/g, '');
        setTimeout(async () => {
            try {
                const code = await conn.requestPairingCode(num, "MICKDADY");
                console.log(chalk.black.bgGreen(` CODE YAKO: `), chalk.bold.white(code));
            } catch (err) { console.log(chalk.red("Error pairing.")); }
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    // MESSAGE & STATUS HANDLER
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;

            // STATUS HANDLER
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                if (typeof handleStatusUpdate === 'function') {
                    await handleStatusUpdate(conn, chatUpdate);
                } else {
                    console.log(chalk.red("[ ERROR ] handleStatusUpdate haijapatikana kwenye main.js"));
                }
                return;
            }

            // CHATBOT/COMMAND HANDLER
            if (typeof handleMessages === 'function') {
                await handleMessages(conn, chatUpdate);
            }
        } catch (err) {
            console.log(chalk.red("[ ERROR ] Upsert:"), err.message);
        }
    });

    // CONNECTION HANDLER (Ujumbe wa kuwaka)
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(chalk.green.bold('\n✅ MICKEY GLITCH V3: ONLINE & READY'));
            
            const botNum = jidNormalizedUser(conn.user.id);
            // Hapa ndipo ujumbe wa connection unatumwa
            await conn.sendMessage(botNum, {
                text: `✨ *MICKEY GLITCH V3 IMEWASHA* ✨\n\n🟢 *Status:* Online\n🚀 *Chatbot:* Active\n📸 *Auto Status:* Active`,
                contextInfo: {
                    externalAdReply: {
                        title: 'SYSTEM CONNECTED',
                        body: 'Mickey Glitch is now Operational',
                        thumbnailUrl: 'https://files.catbox.moe/llc9v7.png',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
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
