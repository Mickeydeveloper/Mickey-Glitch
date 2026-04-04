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
    SELLER_NUMBER: '255615944741',
    SUPPORT_CALL: '255612130873',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    AUDIO: 'https://files.catbox.moe/t80fnj.mp3',
    FOOTER: 'Mickey Glitch Technology © 2026',
    TEMP_DIR: path.join(__dirname, '../temp'),
    CHANNEL_URL: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
};

const formatCurrency = (n) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(n);

// ────────────────────────────────────────────────
// MAIN COMMAND & DYNAMIC HANDLER
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const fullText = (userMessage || '').trim().toLowerCase();
        const sender = message.key.participant || message.key.remoteJid;

        // --- 1. HATUA YA KWANZA: .halotel (MAELIZO NA KUCHAGUA GB) ---
        if (fullText === '.halotel' || fullText === 'halotel_menu') {
            const welcomeText = `
👋 *HABARI, KARIBU MICKEY GLITCH SHOP!*

Tunauza Bando za Halotel kwa bei nafuu zaidi:
💰 *Bei:* TSh 1,000 tu kwa @1GB
🚀 *Kasi:* 4G High Speed
⏳ *Muda:* Masaa 24/7

Chagua kiasi unachotaka hapa chini:`;

            return await sendButtons(sock, chatId, {
                title: '📶 HALOTEL DATA MENU',
                text: welcomeText,
                footer: CONFIG.FOOTER,
                image: { url: CONFIG.BANNER },
                buttons: [
                    { id: '.halotel 10', text: '📦 GB 10' },
                    { id: '.halotel 20', text: '📦 GB 20' },
                    { id: 'halotel_custom', text: '➕ ZAIDI YA GB 20' }
                ]
            }, { quoted: message });
        }

        // --- 2. HATUA YA PILI: ZAIDI YA GB 20 ---
        if (fullText === 'halotel_custom') {
            const customText = `
💡 *MSAADA WA ORDER KUBWA:*
Kama unataka zaidi ya GB 20, tafadhali tumia command hii:

👉 \`.halotel <GB> <NAMBA>\`
Mfano: \`.halotel 30 ${CONFIG.SELLER_NUMBER}\`

Bofya button hapa chini kupata msaada wa haraka:`;

            return await sendButtons(sock, chatId, {
                title: '➕ ORDER NYINGINE',
                text: customText,
                footer: CONFIG.FOOTER,
                buttons: [
                    { name: "cta_call", buttonParamsJson: JSON.stringify({ display_text: "📞 Piga Simu Sasa", phoneNumber: CONFIG.SUPPORT_CALL }) },
                    { id: 'halotel_menu', text: '⬅️ Rudi Nyuma' }
                ]
            }, { quoted: message });
        }

        // --- 3. HATUA YA TATU: KULIPIA (PAY NOW RESPONSES) ---
        if (fullText.startsWith('pay_now_')) {
            const [_, orderId, amount] = fullText.split('_').slice(1);
            
            // Futa ujumbe uliopita (Ule wa Payment Due) ili kuleta njia za malipo
            if (message.message?.extendedTextMessage?.contextInfo?.stanzaId) {
                await sock.sendMessage(chatId, { delete: message.key });
            }

            const payMenuText = `
💳 *CHAGUA NJIA YA MALIPO:*
Order ID: #${orderId}
Kiasi: ${formatCurrency(amount)}

Bofya button ya mtandao unaotumia kulipia:`;

            return await sendButtons(sock, chatId, {
                title: '💸 SELECT PAYMENT METHOD',
                text: payMenuText,
                footer: CONFIG.FOOTER,
                buttons: [
                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🏦 Halopesa", url: "tel:*150*88#" }) },
                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📱 Mixx by Yas", url: "tel:*150*98#" }) },
                    { id: 'confirm_payment', text: '✅ Nimeshalipia' }
                ]
            }, { quoted: message });
        }

        if (fullText === 'confirm_payment') {
            return await sock.sendMessage(chatId, { text: '🙏 *ASANTE:* Tafadhali tuma *Screenshot* ya muamala hapa ili mhudumu athibitishe na kukuwekea bando sasa hivi.' }, { quoted: message });
        }

        // --- 4. HATUA YA NNE: PROCESS ORDER (Kama .halotel 10 061...) ---
        const matches = fullText.match(/\d+/g);
        if (matches && matches.length >= 1) {
            let gbAmount = parseInt(matches[0]);
            let phoneNumber = matches[1] || ''; // Inaweza kuwa tupu kama amebonyeza button ya GB 10 tu

            // Kama hana namba, muulize namba
            if (!phoneNumber) {
                return await sock.sendMessage(chatId, { text: `⚠️ Tafadhali rudia kwa kuweka namba.\n\nMfano: \`.halotel ${gbAmount} 0615xxxxxx\`` }, { quoted: message });
            }

            const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
            const orderRef = Math.random().toString(36).toUpperCase().substring(2, 7);

            const receiptText = `
╭━━━〔 *PAYMENT DUE* 〕━━━┈⊷
┃ 🎫 *Ref:* #${orderRef}
┃ 📦 *Item:* Halotel ${gbAmount}GB
┃ 📱 *Target:* ${phoneNumber}
┃ 💰 *Price:* ${formatCurrency(totalCost)}
╰━━━━━━━━━━━━━━━━━━┈⊷`;

            await sendButtons(sock, chatId, {
                title: '🛒 ORDER SUMMARY',
                text: receiptText,
                footer: CONFIG.FOOTER,
                image: { url: CONFIG.BANNER },
                buttons: [
                    { id: `pay_now_${orderRef}_${totalCost}`, text: '✅ Pay Now' },
                    { id: 'halotel_menu', text: '❌ Cancel' }
                ]
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Halotel Error:', error);
    }
}

module.exports = { halotelCommand, CONFIG };
