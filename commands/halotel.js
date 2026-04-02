const { sendButtons } = require('gifted-btns');
const { getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const { setPendingHalotelOrder, clearPendingHalotelOrder } = require('../lib/halotelSession');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ────────────────────────────────────────────────
// CONFIGURATION (ENGLISH OPTIMIZED)
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    MIN_GB: 10,
    SELLER_NUMBER: '255615944741',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    AUDIO: 'https://files.catbox.moe/t80fnj.mp3',
    FOOTER: 'Mickey Glitch Technology © 2026',
    TEMP_DIR: path.join(__dirname, '../temp')
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
    const tmp = path.join(CONFIG.TEMP_DIR, `${Date.now()}_in.${ext}`);
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
// MAIN COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const payload = (userMessage || '').toString().trim();

        // 1. PAYMENT CALLBACK HANDLING
        if (payload.startsWith('pay_')) {
            const parts = payload.split('_');
            const network = parts[1] || '';
            const orderRef = parts.slice(2).join('_') || 'unknown';
            
            const methods = {
                halo: `*Halopesa:* Send money to *${CONFIG.SELLER_NUMBER}*.\nReference: HALO ${orderRef}`,
                voda: `*M-Pesa:* Send money to *07xxxxxxx*.\nReference: VODA ${orderRef}`,
                tigo: `*Tigo Pesa:* Send money to *06xxxxxxx*.\nReference: TIGO ${orderRef}`
            };

            const methodText = methods[network] || 'Please select a valid payment method.';

            await sock.sendMessage(chatId, {
                text: `✅ *PAYMENT INSTRUCTIONS*\n\n*Order:* #${orderRef}\n*Method:* ${network.toUpperCase()}\n\n${methodText}\n\nAfter payment, please send a screenshot to the owner for instant activation.`
            }, { quoted: message });

            clearPendingHalotelOrder(chatId);
            return;
        }

        // 2. SECURITY CHECK (GROUP BLOCK)
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '🔒 *SECURE SHOPPING*\n\nFor privacy and security, please order data bundles via *Private Message (DM)*.'
            }, { quoted: message });
        }

        const fullText = (userMessage || '').trim();
        const matches = fullText.match(/\d+/g); 

        // 3. INITIAL SHOP MENU
        if (!matches || matches.length < 2) {
            const menu = `🌐 *HALOTEL DATA STORE* 🇹🇿
━━━━━━━━━━━━━━━━━━━━

💰 *Rate:* ${formatCurrency(CONFIG.PRICE_PER_GB)} / 1GB
📉 *Minimum:* ${CONFIG.MIN_GB} GB
⚡ *Instant Delivery:* Personal & Business

📝 *HOW TO ORDER:*
1. Select a bundle below
2. Or Type: \`.halotel <GB> <NUMBER>\`
3. Follow payment steps

💡 *Example:* \`.halotel 10 0615xxxxxx\`

━━━━━━━━━━━━━━━━━━━━
*Powered by Mickey Glitch Tech*`;

            return await sendButtons(sock, chatId, {
                title: '🌐 HALOTEL DATA SHOP',
                text: menu,
                footer: CONFIG.FOOTER,
                image: { url: CONFIG.BANNER },
                buttons: [
                    { id: '.halotel 10 0615xxxxxx', text: '⚡ Buy 10GB' },
                    { id: '.halotel 20 0615xxxxxx', text: '🔥 Buy 20GB' },
                    { type: 'call', text: '📞 Contact Support', id: `tel:${CONFIG.SELLER_NUMBER}` }
                ]
            }, { quoted: message });
        }

        // 4. DATA PROCESSING
        let gbAmount = parseInt(matches[0]);
        let phoneNumber = normalizeNumber(matches[1]);

        if (gbAmount < CONFIG.MIN_GB) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *ERROR:* Minimum order is *${CONFIG.MIN_GB}GB*.\nPlease increase your amount.` 
            }, { quoted: message });
        }

        if (phoneNumber.length !== 12) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *ERROR:* Invalid phone number (${matches[1]}). Use a valid Halotel number.` 
            }, { quoted: message });
        }

        const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
        const orderRef = `HTL-${Math.random().toString(36).toUpperCase().substring(2, 7)}`;
        setPendingHalotelOrder(chatId, orderRef);

        // 5. SEND INVOICE
        const invoice = `💳 *ORDER INVOICE: #${orderRef}*
━━━━━━━━━━━━━━━━━━━━
📦 *Service:* Halotel Data
📊 *Amount:* ${gbAmount} GB
💵 *Total Cost:* ${formatCurrency(totalCost)}
📱 *Target:* ${phoneNumber}
━━━━━━━━━━━━━━━━━━━━

🚨 *ACTION:* Please select your preferred payment network below to get the account details.`;

        let bannerBuf = await getBuffer(CONFIG.BANNER).catch(() => null);

        await sock.sendMessage(chatId, {
            text: invoice,
            contextInfo: {
                externalAdReply: {
                    title: `ORDER: ${gbAmount}GB | #${orderRef}`,
                    body: `Total: ${formatCurrency(totalCost)}`,
                    thumbnail: bannerBuf,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // 6. PAYMENT METHOD LIST
        const sections = [
            {
                title: "SELECT PAYMENT GATEWAY",
                rows: [
                    { title: "Halopesa", rowId: `pay_halo_${orderRef}`, description: `Pay ${formatCurrency(totalCost)} via Halotel` },
                    { title: "M-Pesa", rowId: `pay_voda_${orderRef}`, description: `Pay ${formatCurrency(totalCost)} via Vodacom` },
                    { title: "Tigo Pesa", rowId: `pay_tigo_${orderRef}`, description: `Pay ${formatCurrency(totalCost)} via Tigo` }
                ]
            }
        ];

        await sock.sendMessage(chatId, {
            text: "👇 *TAP BUTTON BELOW TO PAY:*",
            footer: CONFIG.FOOTER,
            title: "💳 PAYMENT OPTIONS",
            buttonText: "CHOOSE NETWORK",
            sections
        }, { quoted: message });

        // 7. AUDIO GREETING
        setTimeout(async () => {
            try {
                const { data } = await axios.get(CONFIG.AUDIO, { responseType: 'arraybuffer' });
                const ptt = await toPTT(Buffer.from(data), 'mp3');
                await sock.sendMessage(chatId, { audio: ptt, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
            } catch (e) {}
        }, 1500);

        // Notify Seller
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *NEW ORDER RECEIVED!*\n\nRef: #${orderRef}\nQuantity: ${gbAmount}GB\nTarget: ${phoneNumber}\nValue: ${formatCurrency(totalCost)}`
        });

    } catch (error) {
        console.error('System Error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ *System Error:* Please try again later.' });
    }
}

module.exports = halotelCommand;
