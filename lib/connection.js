const { DisconnectReason, jidNormalizedUser } = require("@whiskeysockets/baileys");
const { Boom } = require('@hapi/boom');
const chalk = require('chalk');
const settings = require('../settings');

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
        
        const userJid = jidNormalizedUser(sock.user.id);

        // 1. Tuma ujumbe wa kuanza (Success Message)
        try {
            await sock.sendMessage(userJid, { 
                text: `🚀 *MICKEY GLITCH V3* ipo hewani!\n\nUser: @${userJid.split('@')[0]}`,
                mentions: [userJid]
            });
        } catch (e) { console.log("Error sending start msg"); }

        // 2. Auto-Follow Channel (Hapa weka ID ya channel yako)
        try {
            // Mfano: 120363293524944882@newsletter
            await sock.newsletterFollow("120363293524944882@newsletter"); 
            console.log(chalk.magenta("📢 Auto-followed the official channel!"));
        } catch (e) {
            console.log(chalk.red("❌ Auto-follow failed (Haina shida)"));
        }
    }

    if (connection === 'close') {
        let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut) {
            console.log(chalk.yellow(`🔄 Connection imekata. Inajirudia...`));
            restartBot(); // Inaita function ya kuwasha bot tena
        } else {
            console.log(chalk.red(`❌ Session imeisha. Futa folder la session uwashe upya.`));
        }
    }
}

module.exports = { handleConnection };
