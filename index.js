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
    });

    // --- 1. CUSTOM PAIRING CODE: MICKDADY ---
    if (!conn.authState.creds.registered) {
        console.clear();
        console.log(chalk.cyan.bold("╔════════════════════════════════════╗"));
        console.log(chalk.cyan.bold("║      MICKEY GLITCH V3 PAIRING      ║"));
        console.log(chalk.cyan.bold("╚════════════════════════════════════╝\n"));

        let num = await question(chalk.yellow("Enter Number (e.g. 255712345678): "));
        num = num.replace(/[^0-9]/g, '');

        setTimeout(async () => {
            try {
                // Requesting official pairing with custom 8-char code
                let code = await conn.requestPairingCode(num, "MICKDADY");
                console.log(chalk.black.bgGreen(` YOUR PAIRING CODE: `), chalk.bold.white(code));
            } catch (err) {
                console.log(chalk.red("❌ Pairing failed: "), err);
            }
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    // --- 2. CONNECTION & AUTO-FOLLOW LOGIC ---
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        const channelJid = '120363398106360290@newsletter';

        if (connection === 'open') {
            console.log(chalk.green.bold('\n✅ MICKEY GLITCH CONNECTED'));
            
            const adImageUrl = 'https://files.catbox.moe/llc9v7.png';
            const botNum = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            // --- BIG AD BANNER PAYLOAD ---
            const adMessage = {
                image: { url: adImageUrl },
                caption: `✨ *MICKEY GLITCH V3 ACTIVE* ✨\n\n🟢 *Status:* Online\n🎯 *Channel:* Auto-Followed\n\n_Fast • Reliable • Powerful_`,
                footer: '© MICKEY GLITCH',
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: channelJid,
                        newsletterName: '🅼🅸🅲🅺🅴𝚈 🚀',
                        serverMessageId: 1
                    },
                    externalAdReply: {
                        title: 'SYSTEM OPERATIONAL',
                        body: 'Mickey Glitch is now Online',
                        thumbnailUrl: adImageUrl,
                        sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A',
                        mediaType: 1,
                        renderLargerThumbnail: true // Makes the ad banner BIG
                    }
                }
            };

            // Send to yourself and attempt Auto-Follow via metadata
            await conn.sendMessage(botNum, adMessage);
            
            try {
                // Newsletter "Follow" is handled by interacting with the newsletter metadata
                await conn.newsletterFollow(channelJid);
                console.log(chalk.blue('📢 Auto-followed Channel: ' + channelJid));
            } catch (e) {
                console.log(chalk.red('⚠️ Auto-follow failed (Channel might be private or JID wrong)'));
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                rmSync(sessionPath, { recursive: true, force: true });
                process.exit(1);
            } else {
                startMickeyBot();
            }
        }
    });

    return conn;
}

startMickeyBot();
