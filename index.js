/**
 * MICKEY GLITCH BOT - MAIN INDEX
 * WhatsApp Bot with Baileys Library
 */

require('./settings');

// Suppress deprecation warnings and internal errors
process.noDeprecation = true;
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

let showOutput = false;

// Override console methods to filter output
console.error = (...args) => {
    const msg = args.join(' ');
    if (showOutput && !msg.includes('Session') && !msg.includes('decrypt') && !msg.includes('Key used')) {
        originalError(...args);
    }
};

console.warn = (...args) => {
    const msg = args.join(' ');
    if (showOutput && !msg.includes('deprecat') && !msg.includes('DEPRECATED')) {
        originalWarn(...args);
    }
};

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
const fsSync = require('fs');
const path = require('path');

const { handleMessages, handleStatusUpdate } = require('./main');

const SESSION_FOLDER = './session';
const TEMP_DIR = path.join(process.cwd(), 'temp');
const TMP_DIR = path.join(process.cwd(), 'tmp');

// Create readline interface for input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let phoneAsked = false;

// ─────────────────────────────────────────────
// TEMP FOLDER CLEANUP (Every 2 minutes)
// ─────────────────────────────────────────────
function cleanupTempFolders() {
    const folders = [TEMP_DIR, TMP_DIR];
    
    setInterval(() => {
        folders.forEach(folder => {
            if (!fsSync.existsSync(folder)) return;
            
            fsSync.readdir(folder, (err, files) => {
                if (err) return;
                
                files.forEach(file => {
                    const filePath = path.join(folder, file);
                    fsSync.stat(filePath, (err, stats) => {
                        if (!err) {
                            fsSync.unlink(filePath, () => {});
                        }
                    });
                });
            });
        });
    }, 2 * 60 * 1000); // 2 minutes
}

cleanupTempFolders();

async function startBot(reconnectAttempts = 0) {
    try {
        console.clear();
        
        const { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }), // Silent - no logs
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

            // Phone number input - fresh session
            if ((connection === 'connecting' || qr) && !state.creds.registered && !phoneAsked) {
                phoneAsked = true;
                console.log(chalk.yellow.bold("\n🔐 NEW SESSION - PAIRING REQUIRED\n"));
                
                const rawPhone = await question(chalk.cyan("📱 Phone (e.g. 255715123456): "));
                
                let phone = rawPhone.trim().replace(/[^0-9]/g, '');

                if (phone.length < 9) {
                    console.log(chalk.red("\n❌ Invalid number\n"));
                    process.exit(1);
                }

                if (!phone.startsWith('255')) {
                    phone = '255' + phone;
                }

                console.log(chalk.green(`✅ +${phone}`));
                console.log(chalk.cyan("⏳ Getting pairing code...\n"));

                await new Promise(r => setTimeout(r, 4000));

                try {
                    const code = await sock.requestPairingCode(phone);

                    console.log(chalk.black.bgGreen("╔════════════════════════════════╗"));
                    console.log(chalk.black.bgGreen("║   🔑 YOUR PAIRING CODE 🔑       ║"));
                    console.log(chalk.black.bgGreen("╠════════════════════════════════╣"));
                    console.log(chalk.black.bgGreen(`║ ${code.match(/.{1,4}/g)?.join(' - ') || code} │`));
                    console.log(chalk.black.bgGreen("╚════════════════════════════════╝\n"));

                    console.log(chalk.yellow("📱 WhatsApp → Settings → Linked Devices → Link Device"));
                    console.log(chalk.yellow("⏰ Code expires in 30 seconds!\n"));

                } catch (err) {
                    phoneAsked = false;
                    process.exit(1);
                }
            }

            if (connection === 'open') {
                showOutput = true;
                const botNum = jidNormalizedUser(sock.user?.id)?.split('@')[0];
                
                try {
                    const me = jidNormalizedUser(sock.user?.id);
                    if (me) {
                        // Send big ad image with styled caption
                        const adCaption = `*━━━━━━━━━━━━━━━━━━━━━━━━━━*
*✨ ＭＩＣＫＥＹ ＧＬＩＴＣＨ ✨*
*━━━━━━━━━━━━━━━━━━━━━━━━━━*

┌─〔 *BOT FEATURES* 〕──
┃ 🟢 Online 24/7
┃ ⚡ Ultra-Fast Response
┃ 🚀 Stable & Secure
┃ 🎯 50+ Commands
└───────────────────


📱 *Bot Number:* \`+${botNum}\`
⏰ *Status:* \`Active\`
🌍 *Network:* \`Connected\`

_Powered by Mickey Glitch Development_`;

                        await sock.sendMessage(me, {
                            image: { url: 'https://files.catbox.moe/llc9v7.png' },
                            caption: adCaption
                        });
                    }
                } catch (err) {
                    // Silent
                }

                    // Only send a single WhatsApp ad image when the session opens.
                    const botNum = jidNormalizedUser(sock.user?.id)?.split('@')[0] || '';
                    try {
                        const me = jidNormalizedUser(sock.user?.id);
                        if (me) {
                            const adCaption = `*MICKEY GLITCH™*\n\n📱 Bot: +${botNum}\n⚡ Ultra-fast responses\n🟢 24/7 Online\n\nSend *start* to begin.`;
                            await sock.sendMessage(me, {
                                image: { url: 'https://files.catbox.moe/llc9v7.png' },
                                caption: adCaption
                            });
                        }
                    } catch (err) {
                        // keep silent - do not print internal errors
                    }

                    // keep normal reconnect flow but do not print other console ads
                phoneAsked = false;
                reconnectAttempts = 0;
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;

                if (code === DisconnectReason.loggedOut) {
                    await fs.rm(SESSION_FOLDER, { recursive: true, force: true }).catch(() => {});
                    process.exit(1);
                }

                const delay = Math.min(5000 * (reconnectAttempts + 1), 60000);
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

                // Fast async processing - don't await
                handleMessages?.(sock, m).catch(err => {});
            } catch (err) {
                // Silent
            }
        });

        // Keep alive
        setInterval(() => sock?.sendPresenceUpdate('available').catch(() => {}), 45000);

    } catch (err) {
        const delay = Math.min(10000 * (reconnectAttempts + 1), 60000);
        setTimeout(() => startBot(reconnectAttempts + 1), delay);
    }
}

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
startBot();