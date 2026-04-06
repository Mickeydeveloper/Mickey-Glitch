const { sendButtons } = require('gifted-btns');
const settings = require('../settings');
const path = require('path');

// ────────────────────────────────────────────────
// CONFIGURATION (MAREKEBISHO YA RERI %23 YAWEKWA)
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741',
    SUPPORT_CALL: '255612130873',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    // Picha ya Ad yenye muonekano wa kitaalamu
    BANNER: 'https://files.catbox.moe/ljabyq.png', 
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
    CHANNEL_URL: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
};

const formatCurrency = (n) => `TSh ${n.toLocaleString()}`;

// ────────────────────────────────────────────────
// MAIN COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const fullText = (userMessage || '').trim().toLowerCase();
        const sender = message.key.participant || message.key.remoteJid;

        // --- 1. MAIN MENU (AD FORMAT) ---
        if (fullText === '.halotel' || fullText === 'halotel_menu') {
            const adText = `
🌟 *HALOTEL SPECIAL DATA OFFER* 🌟
━━━━━━━━━━━━━━━━━━━━━━
🔥 *PATA GB 1 KWA TSH 1,000 TU!*
🚀 *INTERNET YENYE KASI YA AJABU (4G)*
⏳ *HUDUMA NI SAA 24/7 (INSTANT)*

✨ *CHAGUA KIFURUSHI CHAKO:*
• 📦 GB 10 — TSh 10,000
• 📦 GB 20 — TSh 20,000
• ➕ Zaidi ya GB 20 (Custom Order)

👇 *Bofya button hapa chini kuanza:*`;

            return await sendButtons(sock, chatId, {
                title: '📶 MICKEY GLITCH DATA STORE',
                text: adText,
                footer: CONFIG.FOOTER,
                image: { url: CONFIG.BANNER },
                buttons: [
                    { id: '.halotel 10', text: '🎁 GB 10 - LIPA' },
                    { id: '.halotel 20', text: '🎁 GB 20 - LIPA' },
                    { id: 'halotel_custom', text: '🚀 ORDER NYINGINE' }
                ]
            }, { quoted: message });
        }

        // --- 2. PAYMENT METHODS (FIX YA RERI #) ---
        if (fullText.startsWith('pay_now_')) {
            const [_, orderId, amount] = fullText.split('_').slice(1);

            const payMenuText = `
💳 *HATUA ZA KULIPIA (PAYMENT)*
━━━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* #${orderId}
💰 *Kiasi:* ${formatCurrency(parseInt(amount))}

*MAELEKEZO:*
1. Bofya button ya mtandao wako hapa chini.
2. Itafungua dialer ya simu ikiwa na namba tayari.
3. Weka kiasi na namba ya muamala.

⚠️ *RERI (#) ITAONEKANA KWENYE DUALER YAKO!*`;

            return await sendButtons(sock, chatId, {
                title: '💸 CHAGUA NJIA YA MALIPO',
                text: payMenuText,
                footer: CONFIG.FOOTER,
                buttons: [
                    // USSD FIX: Tumia %23 badala ya #
                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🏦 Halopesa (*150*88#)", url: "tel:*150*88%23" }) },
                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📱 Mixx by Yas (*150*98#)", url: "tel:*150*98%23" }) },
                    { id: 'confirm_payment', text: '✅ NIMESHALIPIA' }
                ]
            }, { quoted: message });
        }

        // --- 3. CONFIRMATION ---
        if (fullText === 'confirm_payment') {
            return await sock.sendMessage(chatId, { 
                text: '📸 *ASANTE:* Tafadhali tuma *Screenshot* ya muamala hapa. \n\nMhudumu atakagua na kukuwekea bando lako ndani ya dakika 2-5. 🚀' 
            }, { quoted: message });
        }

        // --- 4. CUSTOM ORDER / HELP ---
        if (fullText === 'halotel_custom') {
            return await sendButtons(sock, chatId, {
                title: '📞 MSAADA WA HARAKA',
                text: `Unataka GB nyingi zaidi au unahitaji msaada? \n\nTupigie sasa hivi au bonyeza button ya call hapa chini.`,
                footer: CONFIG.FOOTER,
                buttons: [
                    { name: "cta_call", buttonParamsJson: JSON.stringify({ display_text: "📞 Piga Simu", phoneNumber: CONFIG.SUPPORT_CALL }) },
                    { id: 'halotel_menu', text: '⬅️ Rudi Mwanzo' }
                ]
            }, { quoted: message });
        }

        // --- 5. PROCESS DYNAMIC ORDER ---
        const matches = fullText.match(/\d+/g);
        if (matches && matches.length >= 1) {
            let gb = parseInt(matches[0]);
            let phone = matches[1] || '';

            if (!phone) {
                return await sock.sendMessage(chatId, { text: `⚠️ *KOSA:* Tafadhali weka namba ya simu.\n\nMfano: \`.halotel ${gb} 0615XXXXXX\`` }, { quoted: message });
            }

            const cost = gb * CONFIG.PRICE_PER_GB;
            const ref = Math.random().toString(36).toUpperCase().substring(2, 7);

            const receipt = `
🛒 *MUHTASARI WA ORDER*
━━━━━━━━━━━━━━━━━━━━━━
🎫 *Ref:* #${ref}
📦 *Huduma:* Halotel ${gb}GB
📱 *Namba:* ${phone}
💰 *Jumla:* ${formatCurrency(cost)}
━━━━━━━━━━━━━━━━━━━━━━
*Bofya 'Pay Now' kuanza malipo:*`;

            await sendButtons(sock, chatId, {
                title: '✅ ORDER IMETENGENEZWA',
                text: receipt,
                footer: CONFIG.FOOTER,
                image: { url: CONFIG.BANNER },
                buttons: [
                    { id: `pay_now_${ref}_${cost}`, text: '💳 PAY NOW' },
                    { id: 'halotel_menu', text: '❌ CANCEL' }
                ]
            }, { quoted: message });
        }

    } catch (e) {
        console.error('Halotel Error:', e);
    }
}

module.exports = { halotelCommand, CONFIG };
