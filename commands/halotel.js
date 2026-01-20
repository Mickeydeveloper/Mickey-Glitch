const { sendButtons, getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const axios = require('axios');

// ────────────────────────────────────────────────
const PRICE_PER_GB = 1000; 
const MIN_GB = 10;
const SELLER_NUMBER = '255615944741';
const SELLER_JID = `${SELLER_NUMBER}@s.whatsapp.net`;
const SELLER_NAME = 'MICKDADI HAMZA SALIM';

const AD_BANNER_1 = 'https://files.catbox.moe/1mv2al.jpg';
const AD_BANNER_2 = 'https://files.catbox.moe/ljabyq.png';
const CONFIRMATION_AUDIO = 'https://files.catbox.moe/t80fnj.mp3';

// ────────────────────────────────────────────────

let orderCounter = 1000;

function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function generateOrderRef() {
    return `HALO-${Date.now().toString().slice(-4)}-${++orderCounter}`;
}

async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        // Group check - Polite redirection
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '👋 *Hello!* To protect your privacy and phone number, please use this command in our *Private Chat*.'
            }, { quoted: message });
        }

        const text = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const args = text.split(/\s+/).slice(1);

        // 1. HELP MENU (Cleaner Appearance)
        if (args.length === 0) {
            const menu = `✨ *HALOTEL BUNDLE SHOP* ✨
            
Order high-speed data bundles instantly!

📖 *Quick Guide:*
.halotel <GB> <Number>

💡 *Example:*
.halotel 20 255612130873

💰 *Rate:* TSh ${formatNumber(PRICE_PER_GB)} / GB
📦 *Minimum:* ${MIN_GB} GB`;

            return await sock.sendMessage(chatId, { text: menu }, { quoted: message });
        }

        // 2. PARSING (Smart Detection)
        let gbAmount = args.find(a => !isNaN(a) && parseInt(a) >= MIN_GB);
        let phoneNumber = args.find(a => a.length >= 9 && a.length <= 13 && !isNaN(a.replace('+', '')));
        let customerName = args.filter(a => a !== gbAmount && a !== phoneNumber).join(' ');

        // 3. FRIENDLY VALIDATION
        if (!gbAmount) {
            return await sock.sendMessage(chatId, { text: `😊 Kindly specify at least *${MIN_GB} GB*.` });
        }
        if (!phoneNumber) {
            return await sock.sendMessage(chatId, { text: `📱 Please provide the *recipient number* to continue.` });
        }

        const totalPrice = gbAmount * PRICE_PER_GB;
        const orderRef = generateOrderRef();

        // 4. THE COMPACT ORDER AD (Professional & Clean)
        const orderInfo = `✨ *ORDER SECURED* ✨
━━━━━━━━━━━━━━━━━━
🆔 *Ref:* ${orderRef}
📦 *Bundle:* ${gbAmount} GB
📱 *Recipient:* ${phoneNumber}
💰 *Total:* TSh ${formatNumber(totalPrice)}
━━━━━━━━━━━━━━━━━━

💳 *Payment to:*
Name: ${SELLER_NAME}
Number: ${SELLER_NUMBER}

*Instruction:* Kindly send the payment, then tap the button below to notify our team for instant activation.`;

        const buttons = [
            {
                urlButton: {
                    displayText: '✅ I Have Paid',
                    url: `https://wa.me/${SELLER_NUMBER}?text=${encodeURIComponent(`PAID: ${orderRef}\n${gbAmount}GB to ${phoneNumber}`)}`
                }
            }
        ];

        let banner = null;
        try { banner = await getBuffer(AD_BANNER_2); } catch (e) {}

        await sendButtons(sock, chatId, orderInfo, 'Thank you for choosing us!', buttons, message, {
            contextInfo: {
                externalAdReply: {
                    title: `Halotel ${gbAmount}GB Package`,
                    body: `TSh ${formatNumber(totalPrice)} | Fast Delivery`,
                    thumbnail: banner,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });

        // 5. SEAMLESS AUDIO (Optimized)
        setTimeout(async () => {
            try {
                const response = await axios.get(CONFIRMATION_AUDIO, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, {
                    audio: Buffer.from(response.data),
                    mimetype: 'audio/mpeg',
                    ptt: true // Sent as a voice note for a "human" touch
                });
            } catch (e) { /* Silent fail to keep flow clean */ }
        }, 2000);

        // 6. SELLER NOTIFICATION (Concise)
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *New Order:* ${orderRef}\n📦 ${gbAmount}GB -> ${phoneNumber}\n💰 TSh ${formatNumber(totalPrice)}\n👤 User: @${chatId.split('@')[0]}`
        });

    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { text: '🔄 System is a bit busy. Kindly try that again in a moment!' });
    }
}

module.exports = halotelCommand;
