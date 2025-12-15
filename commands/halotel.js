const { sendButtons } = require('../lib/myfunc');
const settings = require('../settings');

function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        // Extract and parse arguments. Support:
        // .halotel gb10 255612130873 SellerName
        // .halotel 20 255612130873 SellerName
        const raw = (userMessage || (message.message?.conversation || message.message?.extendedTextMessage?.text || '')).trim();
        const parts = raw.split(/\s+/).slice(1); // drop command

        if (!parts.length) {
            await sock.sendMessage(chatId, { text: 'Usage: .halotel gb10 <phone> <name>\nExample: .halotel gb20 255612130873 Mickey' }, { quoted: message });
            return;
        }

        // Find GB token (first token like 'gb10' or a number)
        let gb = null;
        let phone = null;
        let name = '';

        // Identify gb token
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i].toLowerCase();
            if (p.startsWith('gb') && !gb) {
                gb = parseInt(p.replace(/^gb/, ''), 10);
                parts.splice(i,1); i--; continue;
            }
            if (!isNaN(parseInt(p,10)) && !gb) {
                // numeric token could be GB or phone; decide by value
                const num = parseInt(p,10);
                if (num >= 10 && num <= 10000) { gb = num; parts.splice(i,1); i--; continue; }
            }
        }

        // After removing GB token, next numeric token is phone
        for (let i = 0; i < parts.length; i++) {
            const onlyDigits = parts[i].replace(/[^0-9]/g,'');
            if (onlyDigits.length >= 7) { phone = onlyDigits; parts.splice(i,1); break; }
        }

        // Remaining parts are name
        if (parts.length) name = parts.join(' ').trim();

        if (!gb || isNaN(gb) || gb < 10) {
            await sock.sendMessage(chatId, { text: '❗ Minimum bundle is 10 GB. Example: .halotel gb10 2556xxxxxxx SellerName' }, { quoted: message });
            return;
        }

        if (!phone) {
            await sock.sendMessage(chatId, { text: '❗ Please include the seller phone number in the command.\nExample: .halotel gb10 255612130873 Mickey' }, { quoted: message });
            return;
        }

        const pricePerGB = 1000; // TSh per 1 GB
        const total = gb * pricePerGB;

        const firstText = `📦 *Halotel Bundle Calculator*\n\n*Bundle:* ${gb} GB\n*Price / GB:* TSh ${formatNumber(pricePerGB)}\n*Total:* TSh ${formatNumber(total)}\n\nThank you for choosing our service!`;

        // Send calculation first
        await sock.sendMessage(chatId, { text: firstText }, { quoted: message });

        // Small delay for a professional two-step flow
        await new Promise(r => setTimeout(r, 1200));

        // Prepare payment options: WhatsApp quick-pay link + contact button using provided phone & name
        const sellerNumber = phone;
        const sellerName = name || 'Seller';
        const waLink = `https://wa.me/${sellerNumber}?text=${encodeURIComponent(`Hello ${sellerName}, I want to buy ${gb}GB Halotel bundle (TSh ${formatNumber(total)})`)}`;

        const secondText = `🔐 *Payment Options*\n\n*Seller:* ${sellerName}\n*Phone:* +${sellerNumber}\n*Amount:* TSh ${formatNumber(total)}\n\n1) Tap *Pay via WhatsApp* to open a message pre-filled to the seller.\n2) Or press *Contact Seller* to get direct contact details.\n\nAfter payment, reply here with your transaction ID so we can process your bundle.`;

        const buttons = [
            { urlButton: { displayText: 'Pay via WhatsApp', url: waLink } },
            { quickReplyButton: { displayText: 'Contact Seller', id: `.contact ${sellerNumber} ${sellerName}` } }
        ];

        await sendButtons(sock, chatId, secondText, 'Payment', buttons, message);

    } catch (error) {
        console.error('Error in halotel command:', error);
        try { await sock.sendMessage(chatId, { text: '❌ Kosa limetokea. Tafadhali jaribu tena.' }, { quoted: message }); } catch (e) {}
    }
}

module.exports = halotelCommand;
