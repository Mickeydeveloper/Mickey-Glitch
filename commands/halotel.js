const { sendButtons } = require('gifted-btns');
const { getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const { setPendingHalotelOrder, clearPendingHalotelOrder } = require('../lib/halotelSession');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    MIN_GB: 10,
    SELLER_NUMBER: '255615944741',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    AUDIO: 'https://files.catbox.moe/t80fnj.mp3',
    FOOTER: 'Mickey Glitch Technology © 2026',
    TEMP_DIR: path.join(__dirname, '../temp'),
    CHANNEL_URL: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
};

if (!fs.existsSync(CONFIG.TEMP_DIR)) fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
const SELLER_JID = `${CONFIG.SELLER_NUMBER}@s.whatsapp.net`;

// ────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────
const formatCurrency = (n) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(n);

function normalizeNumber(num) {
    if (!num) return '';
    let cleaned = num.replace(/\D/g, ''); 
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.slice(1);
    else if (cleaned.length === 9) cleaned = '255' + cleaned;
    return cleaned;
}

async function toPTT(buffer, ext) {
    const tmp = path.join(CONFIG.TEMP_DIR, `\( {Date.now()}_in. \){ext}`);
    const out = path.join(CONFIG.TEMP_DIR, `${Date.now()}_out.opus`);
    try {
        await fs.promises.writeFile(tmp, buffer);
        await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', ['-y', '-i', tmp, '-vn', '-acodec', 'libopus', '-ab', '128k', out]);
            ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg error')));
            ff.on('error', reject);
        });
        return await fs.promises.readFile(out);
    } finally {
        [tmp, out].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    }
}

// ────────────────────────────────────────────────
// MAIN COMMAND (UPDATED WITH "PAY NOW" STYLE)
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const fullText = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();

        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '🔒 *SECURE SHOPPING*\n\nPlease order data bundles via *Private Message (DM)* for security.'
            }, { quoted: message });
        }

        const matches = fullText.match(/\d+/g); 

        if (!matches || matches.length < 2) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *ERROR:* Usage: \`.halotel <GB> <NUMBER>\`\n\n💡 *Example:* \`.halotel 10 0615123456\`` 
            }, { quoted: message });
        }

        let gbAmount = parseInt(matches[0]);
        let phoneNumber = normalizeNumber(matches[1]);

        if (gbAmount < CONFIG.MIN_GB) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *ERROR:* Minimum order is *${CONFIG.MIN_GB}GB*.` 
            }, { quoted: message });
        }

        if (phoneNumber.length !== 12) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *ERROR:* Invalid number. Provide a valid Halotel number.` 
            }, { quoted: message });
        }

        const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
        const orderRef = `HTL-${Math.random().toString(36).toUpperCase().substring(2, 7)}`;
        setPendingHalotelOrder(chatId, orderRef);

        const receiptText = `
╭━━━〔 *PAYMENT DUE* 〕━━━┈⊷
┃ 🎫 *Order ID:* #${orderRef}
┃ 📦 *Product:* Halotel ${gbAmount}GB
┃ 📱 *Target Number:* ${phoneNumber}
┃ 💰 *Amount Due:* ${formatCurrency(totalCost)}
┃ 📅 *Due Date:* ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
╰━━━━━━━━━━━━━━━━━━┈⊷

Bofya button hapo chini kulipia mara moja:`;

        // 🔘 BUTTONS - STYLE KAMA "PAYMENT DUE" ULIVYOONYESHA KWENYE PICHA
        // Tumia CTA URL buttons + moja Quick Reply kwa "Pay Now" ili ifanane na real button 
        await sendButtons(sock, chatId, {
            title: '💳 PAYMENT DUE - HALOTEL DATA',
            text: receiptText,
            footer: CONFIG.FOOTER,
            image: { url: CONFIG.BANNER },
            buttons: [
                // PAY NOW - Quick Reply Button (Inafanana na "Pay now" kwenye picha)
                { 
                    id: `pay_now_${orderRef}`, 
                    text: '✅ Pay Now' 
                },

                // Halopesa USSD
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🏦 Halopesa",
                        url: "tel:*150*88# ",
                    })
                },

                // M-Pesa USSD
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📱 M-Pesa",
                        url: "tel:*150*00# ",
                    })
                },

                // Channel
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📢 Jiunge na Channel",
                        url: "https://whatsapp.com/channel/0029VbBDVEEHLHQdjvSGpU1q",
                    })
                }
            ],
            contextInfo: {
                externalAdReply: {
                    title: `HALOTEL ${gbAmount}GB - TSH ${totalCost}`,
                    body: `Order #${orderRef} | Due: ${formatCurrency(totalCost)}`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: CONFIG.BANNER,
                    sourceUrl: CONFIG.CHANNEL_URL
                }
            }
        }, { quoted: message });

        // Audio confirmation
        setTimeout(async () => {
            try {
                const { data } = await axios.get(CONFIG.AUDIO, { responseType: 'arraybuffer' });
                const ptt = await toPTT(Buffer.from(data), 'mp3');
                await sock.sendMessage(chatId, { audio: ptt, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
            } catch (e) {}
        }, 1500);

        // Notify Seller
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *NEW HALOTEL ORDER*\nOrder ID: #${orderRef}\nAmount: ${formatCurrency(totalCost)}\nTarget: ${phoneNumber}\nCustomer: ${chatId.split('@')[0]}`
        });

    } catch (error) {
        console.error('Core Error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ *System Error:* Try again later.' });
    }
}

module.exports = {
    halotelCommand,
    CONFIG
};