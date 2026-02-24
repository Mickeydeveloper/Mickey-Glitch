require('./settings');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    delay
} = require("@whiskeysockets/baileys");
const fs = require('fs');
const pino = require("pino");
const chalk = require('chalk');
const readline = require("readline");
const { rmSync, existsSync } = require('fs');

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
        browser: ["Ubuntu", "Chrome", "20.0.04"], // Required for custom pairing
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
    });

    // --- 1. CUSTOM PAIRING CODE LOGIC (MICKDADY) ---
    if (!conn.authState.creds.registered) {
        console.clear();
        console.log(chalk.cyan.bold("╭─────────────────────────────────────╮"));
        console.log(chalk.cyan.bold("│      MICKEY GLITCH V3 PAIRING       │"));
        console.log(chalk.cyan.bold("╰─────────────────────────────────────╯\n"));

        let num = await question(chalk.yellow("Enter WhatsApp Number (e.g. 255712345678): "));
        num = num.replace(/[^0-9]/g, '');

        if (!num) {
            console.log(chalk.red("❌ Phone number is required."));
            process.exit(0);
        }

        setTimeout(async () => {
            try {
                // Official pairing with custom 8-char code
                let code = await conn.requestPairingCode(num, "MICKDADY");
                console.log(chalk.black.bgGreen(` YOUR PAIRING CODE: `), chalk.bold.white(code));
            } catch (err) {
                console.log(chalk.red("❌ Pairing failed. Check if number is correct."));
            }
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    // --- 2. CONNECTION & AUTO-FOLLOW & BANNER ---
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        const channelJid = '120363398106360290@newsletter';
        const adImageUrl = 'https://files.catbox.moe/llc9v7.png';

        if (connection === 'open') {
            console.log(chalk.green.bold('\n✅ MICKEY GLITCH CONNECTED SUCCESSFULLY'));
            
            const botNum = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            // Send BIG BANNER (Gallery-safe: image is metadata, not a file)
            await conn.sendMessage(botNum, {
                text: `✨ *MICKEY GLITCH V3 ACTIVE* ✨\n\n🟢 *Status:* Online\n🎯 *Channel:* Auto-Followed\n\n_System fully operational._`,
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: channelJid,
                        newsletterName: '🅼🅸🅺🅴𝚈 🚀',
                        serverMessageId: 1
                    },
                    externalAdReply: {
                        title: 'MICKEY GLITCH - SYSTEM ONLINE',
                        body: 'Fast • Reliable • Powerful',
                        thumbnailUrl: adImageUrl,
                        sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A',
                        mediaType: 1,
                        renderLargerThumbnail: true, // Forces BIG image
                        showAdAttribution: true
                    }
                }
            });
            
            // Auto-follow logic
            try {
                await conn.newsletterFollow(channelJid);
                console.log(chalk.blue('📢 Auto-followed official channel.'));
            } catch (e) {
                console.log(chalk.red('⚠️ Auto-follow failed.'));
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red(`Connection Closed: ${reason}`));

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.bgRed.white(' Session Logged Out. Clearing session folder... '));
                rmSync(sessionPath, { recursive: true, force: true });
                process.exit(1);
            } else {
                startMickeyBot(); // Reconnect automatically
            }
        }
    });

    return conn;
}



startMickeyBot().catch(e => console.error("Fatal Error:", e));
