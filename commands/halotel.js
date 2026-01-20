const { sendButtons, getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const axios = require('axios');

// ────────────────────────────────────────────────
const PRICE_PER_GB = 1000; 
const MIN_GB = 10;
const SELLER_NUMBER = '255615944741';
const SELLER_JID = `${SELLER_NUMBER}@s.whatsapp.net`;
const SELLER_NAME = 'MICKDADI HAMZA SALIM';

const AD_BANNER_2 = 'https://files.catbox.moe/ljabyq.png';
const CONFIRMATION_AUDIO = 'https://files.catbox.moe/t80fnj.mp3';

// ────────────────────────────────────────────────

let orderCounter = 1000;

function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function generateOrderRef() {
    return `HTL-${Date.now().toString().slice(-4)}`;
}

async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '👋 *Hello!* Please message me privately to buy bundles securely.'
            }, { quoted: message });
        }

        const text = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const args = text.split(/\s+/).slice(1);

        if (args.length === 0) {
            const menu = `🚀 *HALOTEL DATA SHOP*

Buy cheap bundles in seconds.

*Rate:* TSh ${formatNumber(PRICE_PER_GB)} / GB
*Min:* ${MIN_GB} GB

*Format:* .halotel <GB> <Number>
*Example:* .halotel 20 255612130873`;

            return await sock.sendMessage(chatId, { text: menu }, { quoted: message });
        }

        let gbAmount = args.find(a => !isNaN(a) && parseInt(a) >= MIN_GB);
        let phoneNumber = args.find(a => a.length >= 9 && a.length <= 13 && !isNaN(a.replace('+', '')));

        if (!gbAmount || !phoneNumber) {
            return await sock.sendMessage(chatId, { text: '💡 *Quick Tip:* Mention both GB and Phone Number.\nExample: `.halotel 10 255615000000`' });
        }

        const totalPrice = gbAmount * PRICE_PER_GB;
        const orderRef = generateOrderRef();

        const orderInfo = `✨ *ORDER SUMMARY*
━━━━━━━━━━━━━━━━━━
📦 *Bundle:* ${gbAmount} GB
📱 *Number:* ${phoneNumber}
💰 *Amount:* TSh ${formatNumber(totalPrice)}
🆔 *Ref:* ${orderRef}
━━━━━━━━━━━━━━━━━━

*Payment Details:*
Account: ${SELLER_NAME}
Number: ${SELLER_NUMBER}

_Once paid, click the button below:_`;

        const buttons = [
            {
                urlButton: {
                    displayText: '💳 Confirm Payment',
                    url: `https://wa.me/${SELLER_NUMBER}?text=Paid+Ref:${orderRef}+${gbAmount}GB`
                }
            }
        ];

        let banner = null;
        try { banner = await getBuffer(AD_BANNER_2); } catch (e) {}

        await sendButtons(sock, chatId, orderInfo, 'Safe & Fast Delivery', buttons, message, {
            contextInfo: {
                externalAdReply: {
                    title: `Halotel Bundle Order`,
                    body: `Ref: ${orderRef}`,
                    thumbnail: banner,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });

        // ─── OLDER AUDIO FORMAT LOGIC ───
        setTimeout(async () => {
            try {
                const response = await axios.get(CONFIRMATION_AUDIO, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, {
                    audio: Buffer.from(response.data),
                    /* Using 'audio/mp4' with ptt: true is the most stable 
                       "older" way to ensure the voice note plays correctly 
                       across all versions of WhatsApp.
                    */
                    mimetype: 'audio/mp4', 
                    ptt: true 
                });
            } catch (e) { /* Error ignored for smooth UI */ }
        }, 1500);

        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *New Halotel:* ${orderRef}\n📦 ${gbAmount}GB\n📱 ${phoneNumber}\n💰 TSh ${formatNumber(totalPrice)}`
        });

    } catch (error) {
        await sock.sendMessage(chatId, { text: '🔄 Just a moment, let\'s try that again!' });
    }
}

module.exports = halotelCommand;
