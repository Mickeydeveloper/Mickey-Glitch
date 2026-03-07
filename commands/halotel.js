const { sendButtons, getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ────────────────────────────────────────────────
// CONFIGURATION (Global)
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    MIN_GB: 10,
    SELLER_NUMBER: '255615944741',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    AUDIO: 'https://files.catbox.moe/t80fnj.mp3',
    FOOTER: 'Mickey Glitch Technology © 2026'
};

const SELLER_JID = `${CONFIG.SELLER_NUMBER}@s.whatsapp.net`;

// ────────────────────────────────────────────────
// STABLE FFMPEG UTILITY
// ────────────────────────────────────────────────
async function toPTT(buffer, ext) {
    return new Promise(async (resolve, reject) => {
        try {
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const tmp = path.join(tempDir, `${Date.now()}.${ext}`);
            const out = `${tmp}.opus`;

            await fs.promises.writeFile(tmp, buffer);

            const ff = spawn('ffmpeg', [
                '-y', '-i', tmp,
                '-vn', '-c:a', 'libopus', '-b:a', '128k',
                '-vbr', 'on', '-compression_level', '10',
                out
            ]);

            ff.on('error', reject);
            ff.on('close', async (code) => {
                try {
                    await fs.promises.unlink(tmp);
                    if (code !== 0) return reject(new Error(`FFmpeg exited with code ${code}`));
                    const data = await fs.promises.readFile(out);
                    await fs.promises.unlink(out);
                    resolve(data);
                } catch (e) { reject(e); }
            });
        } catch (e) { reject(e); }
    });
}

// ────────────────────────────────────────────────
// MAIN COMMAND FLOW
// ────────────────────────────────────────────────
function formatTSh(n) {
    return new Intl.NumberFormat('en-US').format(n);
}

async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        // 1. Private Chat Enforcement
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '👋 *Hello!* Kwa usalama zaidi, tafadhali nitumie ujumbe huu DM (Please message me privately).'
            }, { quoted: message });
        }

        const text = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const args = text.split(/\s+/).slice(1);

        // 2. Main Menu / Help
        if (args.length < 2) {
            const menu = `🚀 *HALOTEL DATA SHOP* 🇹🇿\n\n` +
                `*Rate:* TSh ${formatTSh(CONFIG.PRICE_PER_GB)} / 1GB\n` +
                `*Min Order:* ${CONFIG.MIN_GB} GB\n\n` +
                `💡 *How to Order:*\n` +
                `\`.halotel <GB> <Number>\`\n\n` +
                `✅ *Example:* \`.halotel 20 255612130873\`\n\n` +
                `_Fast & Secure automated delivery_`;

            return await sock.sendMessage(chatId, { text: menu }, { quoted: message });
        }

        // 3. Smart Detection
        let gbAmount = parseFloat(args[0]);
        let phoneNumber = args[1].replace(/[^0-9]/g, '');

        if (!gbAmount || gbAmount < CONFIG.MIN_GB) {
            return await sock.sendMessage(chatId, { text: `⚠️ *Error:* Minimum order is *${CONFIG.MIN_GB} GB*.` });
        }
        if (phoneNumber.length < 9) {
            return await sock.sendMessage(chatId, { text: `⚠️ *Error:* Please provide a valid Halotel number.` });
        }

        const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
        const orderRef = `HTL-${Math.random().toString(36).toUpperCase().substring(2, 7)}`;

        // 4. International-Style Order Layout
        const orderInfo = `✨ *INVOICE SECURED* ✨\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📦 *Product:* Halotel Data Bundle\n` +
            `📊 *Volume:* ${gbAmount} GB\n` +
            `💵 *Total:* TSh ${formatTSh(totalCost)}\n` +
            `📱 *Target:* ${phoneNumber}\n` +
            `🆔 *Ref ID:* #${orderRef}\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `*PAYMENT INSTRUCTIONS:*\n` +
            `Lipa kiasi cha *TSh ${formatTSh(totalCost)}* kwenda:\n` +
            `👤 *Name:* ${CONFIG.SELLER_NAME}\n` +
            `📞 *Number:* ${CONFIG.SELLER_NUMBER}\n\n` +
            `_Click the button below to confirm payment:_`;

        const buttons = [{
            urlButton: {
                displayText: '💳 Confirm Payment',
                url: `https://wa.me/${CONFIG.SELLER_NUMBER}?text=Nime lipa+${orderRef}+kiasi cha+${totalCost}+kwa+${gbAmount}GB+kwenda+${phoneNumber}`
            }
        }];

        // Get Banner Buffer safely
        let banner;
        try { banner = await getBuffer(CONFIG.BANNER); } catch (e) { banner = null; }

        // 5. Send Professional Button Message
        await sendButtons(sock, chatId, orderInfo, CONFIG.FOOTER, buttons, message, {
            contextInfo: {
                externalAdReply: {
                    title: `ORDER: ${gbAmount}GB | #${orderRef}`,
                    body: `Total: TSh ${formatTSh(totalCost)}`,
                    thumbnail: banner,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });

        // 6. Handle Confirmation Audio (Async background)
        setImmediate(async () => {
            try {
                const response = await axios.get(CONFIG.AUDIO, { responseType: 'arraybuffer' });
                const opusBuffer = await toPTT(Buffer.from(response.data), 'mp3');
                await sock.sendMessage(chatId, {
                    audio: opusBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true 
                }, { quoted: message });
            } catch (e) {
                console.error('Audio Error:', e.message);
            }
        });

        // 7. Seller Notification
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *NEW ORDER DETECTED*\n\n` +
                `🆔 *Ref:* ${orderRef}\n` +
                `📦 *Bundle:* ${gbAmount}GB\n` +
                `💰 *Value:* TSh ${formatTSh(totalCost)}\n` +
                `📱 *Target:* ${phoneNumber}`
        });

    } catch (error) {
        console.error('Main Error:', error);
        await sock.sendMessage(chatId, { text: '❌ System error. Please try again or contact support.' });
    }
}

module.exports = halotelCommand;
