const { DisconnectReason, jidNormalizedUser } = require("@whiskeysockets/baileys");
const { Boom } = require('@hapi/boom');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds

// Auto-cleanup old session/tmp/temp folders
async function cleanupOldFolders() {
    try {
        const foldersToClean = [
            { name: 'session', path: path.join(process.cwd(), 'session') },
            { name: 'tmp', path: path.join(process.cwd(), 'tmp') },
            { name: 'temp', path: path.join(process.cwd(), 'temp') }
        ];

        for (const folder of foldersToClean) {
            if (!fs.existsSync(folder.path)) continue;

            try {
                const files = fs.readdirSync(folder.path);
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours

                for (const file of files) {
                    const filePath = path.join(folder.path, file);
                    const stat = fs.statSync(filePath);
                    const age = now - stat.mtimeMs;

                    // Delete files older than 24 hours (but keep current session)
                    if (age > maxAge && !file.includes('creds')) {
                        try {
                            if (stat.isDirectory()) {
                                fs.rmSync(filePath, { recursive: true, force: true });
                            } else {
                                fs.unlinkSync(filePath);
                            }
                            console.log(chalk.gray(`🗑️  Deleted old file: ${folder.name}/${file}`));
                        } catch (err) {
                            // Silent fail on individual file deletion
                        }
                    }
                }
            } catch (err) {
                // Silent fail on folder processing
            }
        }
    } catch (err) {
        // Silently skip cleanup on error
    }
}

/**
 * Inashughulikia connection updates na autofollow
 */
async function handleConnection(sock, update, restartBot) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) console.log(chalk.yellow(`📱 SCAN QR CODE (Kama pairing imefeli)`));
    
    if (connection === "connecting") {
        console.log(chalk.blue(`⏳ Inatafuta mawasiliano... (Connecting)`));
    }

    if (connection === "open") {
        console.log(chalk.green(`\n✅ ${settings.botName} IMEWAKA TAYARI!\n`));
        reconnectAttempts = 0; // Reset counter on successful connection
        
        const userJid = jidNormalizedUser(sock.user.id);

        // 1. Auto-cleanup old files/folders
        try {
            await cleanupOldFolders();
        } catch (e) {
            // Silent cleanup fail
        }

        // 2. Reload commands on reconnection
        try {
            const mainModule = require('../main');
            if (mainModule.reloadCommands && typeof mainModule.reloadCommands === 'function') {
                mainModule.reloadCommands();
            }
        } catch (e) {
            console.log(chalk.yellow("⚠️  Command reload skipped (will be available on next cycle)"));
        }

        // 3. Tuma ujumbe wa kuanza (Success Message)
        try {
            await sock.sendMessage(userJid, { 
                text: `🚀 *MICKEY GLITCH V3* ipo hewani!\n\nUser: @${userJid.split('@')[0]}`,
                mentions: [userJid]
            });
        } catch (e) { console.log("Error sending start msg"); }

        // 4. Auto-Follow Channel (Hapa weka ID ya channel yako)
        try {
            // Mfano: 120363293524944882@newsletter
            await sock.newsletterFollow("120363398106360290@newsletter"); 
            console.log(chalk.magenta("📢 Auto-followed the official channel!"));
        } catch (e) {
            console.log(chalk.red("❌ Auto-follow failed (Haina shida)"));
        }
    }

    if (connection === 'close') {
        let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        console.log(chalk.yellow(`📊 Disconnect reason code: ${reason}`));
        
        if (reason !== DisconnectReason.loggedOut) {
            reconnectAttempts++;
            if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
                console.log(chalk.yellow(`🔄 Connection imekata. Jaribu #${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}. Inajirudia baada ya ${RECONNECT_DELAY/1000}s...`));
                // Add delay before restarting to prevent infinite loop
                await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
                try {
                    restartBot(); // Inaita function ya kuwasha bot tena
                } catch (e) {
                    console.log(chalk.red("Error during restart:", e.message));
                }
            } else {
                console.log(chalk.red(`❌ Jaribu nyingi za kuunganisha zimeshindwa. Tafadhali angalia session.`));
                process.exit(1); // Exit gracefully after max retries
            }
        } else {
            console.log(chalk.red(`❌ Session imeisha. Futa folder la session uwashe upya.`));
            process.exit(0); // Clean exit
        }
    }
}

module.exports = { handleConnection, cleanupOldFolders };
