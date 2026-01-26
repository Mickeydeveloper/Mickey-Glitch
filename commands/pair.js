const { sleep } = require('../lib/myfunc');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

async function pairCommand(sock, chatId, message, q) {
    try {
        console.log(chalk.blue(`[PAIR] Command received → query: ${q || '<empty>'}`));

        if (!q || q.trim() === '') {
            return await sock.sendMessage(chatId, { text: 
`*🔐 Internal Pairing System*

📝 *Usage:*
.pair <phone_number>   or   .pair 255715123456,255620987654

*Examples:*
.pair 6281376552730
.pair 255715123456

*Features:*
✅ Uses WhatsApp native pairing
✅ Sends code directly to the number
✅ Auto-sends session credentials after successful link
⚠️ Target number must be registered on WhatsApp
⚠️ Code expires in ~5 minutes
` });
        }

        const numbers = q.split(/[,;\s]+/)
            .map(v => v.replace(/[^0-9]/g, ''))
            .filter(v => v.length >= 9 && v.length <= 15);

        if (numbers.length === 0) {
            return await sock.sendMessage(chatId, { text: "❌ No valid phone numbers found.\nExample: .pair 255715123456" });
        }

        for (const rawNumber of numbers) {
            const number = rawNumber.startsWith('0') ? '255' + rawNumber.slice(1) : rawNumber;
            const whatsappID = number + '@s.whatsapp.net';

            console.log(chalk.blue(`[PAIR] Processing → ${number}`));

            // 1. Check if number exists on WhatsApp
            let exists = false;
            try {
                const check = await sock.onWhatsApp(whatsappID);
                exists = check?.[0]?.exists === true;
            } catch (err) {
                console.warn(chalk.yellow(`[PAIR] onWhatsApp failed for ${number}: ${err.message}`));
            }

            if (!exists) {
                await sock.sendMessage(chatId, { text: `❌ ${number} is not registered on WhatsApp.` });
                continue;
            }

            // 2. Notify user we're starting
            await sock.sendMessage(chatId, { text: `⏳ Generating pairing code for ${number}...` });

            // 3. Safety check: method exists?
            if (typeof sock.requestPairingCode !== 'function') {
                console.log(chalk.red(`[PAIR] sock.requestPairingCode is not available`));
                await sock.sendMessage(chatId, { text: 
`❌ Pairing feature not available in this bot version.

Try running the bot with:
node yourfile.js --pairing-code

Or update Baileys library:
npm install @whiskeysockets/baileys@latest` });
                continue;
            }

            // 4. Request code
            let code;
            try {
                code = await sock.requestPairingCode(number);
                if (!code || code.length < 6) throw new Error("Empty or invalid code received");
            } catch (err) {
                console.error(chalk.red(`[PAIR] requestPairingCode failed → ${err.message}`));
                let msg = "❌ Failed to generate pairing code.";
                if (err?.output?.statusCode === 429) msg += "\nRate limit — wait 10–30 minutes and try again.";
                if (err?.output?.statusCode === 405) msg += "\nServer rejected request — try QR pairing instead.";
                await sock.sendMessage(chatId, { text: msg });
                continue;
            }

            const formatted = code.match(/.{1,4}/g)?.join('-') || code;

            // 5. Send code to target number
            const pairingText = 
`🔐 *Mickey Glitch™ Pairing Code*

Your code: *${formatted}*

How to use:
1. Open WhatsApp → Settings → Linked Devices
2. Tap "Link with phone number"
3. Enter the code above

Code expires in ~5 minutes.
Keep it private!

After linking, your session file will be sent here automatically.`;

            await sock.sendMessage(whatsappID, { text: pairingText });

            // 6. Confirm to command sender
            await sock.sendMessage(chatId, { text: 
`✅ Pairing code sent to *${number}*

Code: ${formatted}

Waiting for device to link...
Credentials will be sent automatically once paired.` });

            // 7. Listen for creds update (one-time per number)
            let listenerAdded = false;

            const credsHandler = async () => {
                if (listenerAdded) return;
                listenerAdded = true;

                console.log(chalk.green(`[PAIR] creds.update fired → sending to ${number}`));

                try {
                    await sleep(2500); // give time for file write

                    const credsPath = path.join(process.cwd(), 'session', 'creds.json');

                    if (!fs.existsSync(credsPath)) {
                        console.warn(chalk.yellow(`[PAIR] creds.json not found at ${credsPath}`));
                        return;
                    }

                    const buffer = fs.readFileSync(credsPath);

                    await sock.sendMessage(whatsappID, {
                        document: buffer,
                        fileName: 'creds.json',
                        mimetype: 'application/json',
                        caption: `✅ *Pairing Successful!*\n\nYour session credentials file.\n\n⚠️ Keep this file PRIVATE!\nNever share it.\nStore it safely.`
                    });

                    await sock.sendMessage(chatId, { text: `🎉 Pairing completed!\nCredentials sent to ${number}.` });

                } catch (err) {
                    console.error(chalk.red(`[PAIR] Error sending creds → ${err.message}`));
                }
            };

            sock.ev.on('creds.update', credsHandler);

            // Auto-remove listener after timeout
            setTimeout(() => {
                sock.ev.removeListener('creds.update', credsHandler);
                console.log(chalk.dim(`[PAIR] Listener removed for ${number} (timeout)`));
            }, 6 * 60 * 1000); // 6 minutes
        }

    } catch (err) {
        console.error(chalk.red(`[PAIR] Fatal error: ${err.message}`), err);
        await sock.sendMessage(chatId, { text: `❌ Unexpected error: ${err.message || 'Unknown'}` });
    }
}

module.exports = pairCommand;