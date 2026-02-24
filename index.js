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
const { rmSync, existsSync } = require('fs');

// HAKIKISHA HII PATH NI SAHIHI
const { handleMessages } = require('./main'); 

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
        // Maboresho ya spidi ya command
        generateHighQualityLinkPreview: true,
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => { return { noCondition: true } }
    });

    // --- PAIRING CODE LOGIC ---
    if (!conn.authState.creds.registered) {
        console.clear();
        console.log(chalk.bold.cyan("╔════════════════════════════════════╗"));
        console.log(chalk.bold.cyan("║     MICKEY GLITCH CUSTOM PAIR      ║"));
        console.log(chalk.bold.cyan("╚════════════════════════════════════╝\n"));

        let num = await question(chalk.yellow("Ingiza namba (Mfano: 255615944741): "));
        num = num.replace(/[^0-9]/g, '');

        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
            const code = await conn.requestPairingCode(num, "MICKDADY");
            console.log(chalk.black.bgGreen(` CODE YAKO: `), chalk.bold.white(code));
        } catch (err) {
            console.log(chalk.red("❌ Error kwenye kuomba code."));
        }
    }

    conn.ev.on('creds.update', saveCreds);

    // --- CONNECTION HANDLER ---
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(chalk.green.bold('\n[ SYSTEM ] Bot Imeunganishwa Kikamilifu!'));
            
            const botNum = jidNormalizedUser(conn.user.id);
            await conn.sendMessage(botNum, {
                text: `✨ *MICKEY GLITCH V3 ACTIVE* ✨`,
                contextInfo: {
                    externalAdReply: {
                        title: 'MICKEY GLITCH ONLINE',
                        body: 'Command Zote Zipo Tayari',
                        thumbnailUrl: 'https://files.catbox.moe/llc9v7.png',
                        sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A',
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

    // --- MESSAGE HANDLER (HAPA NDIPO COMMAND ZINAPOKELEWA) ---
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            
            // Log kwenye console ili uone meseji zinapoingia
            console.log(chalk.blueBright(`[ MSG ] Meseji imeingia kutoka: ${mek.pushName || 'Mtumiaji'}`));

            // HAKIKISHA handleMessages inaitwa vizuri
            await handleMessages(conn, chatUpdate);
            
        } catch (err) {
            console.log(chalk.red("[ ERROR ] Hitilafu kwenye messages.upsert:"), err);
        }
    });

    return conn;
}

startMickeyBot();
