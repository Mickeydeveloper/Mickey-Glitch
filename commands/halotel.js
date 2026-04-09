const { sendButtons } = require('gifted-btns');
const settings = require('../settings');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741',
    SUPPORT_CALL: '255612130873',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
    CHANNEL_URL: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
};

const formatCurrency = (n) => `TSh ${n.toLocaleString()}`;

const PAYMENT_METHODS = [
    { name: '🏦 M-Pesa (Vodacom)', ussd: '*150*88#', code: 'mpesa_vodacom' },
    { name: '💳 Tigo Pesa', ussd: '*150*98#', code: 'tigo_pesa' },
    { name: '📱 Airtel Money', ussd: '*150*80#', code: 'airtel' },
    { name: '🔗 CRDB Bank Transfer', ussd: null, code: 'bank' },
    { name: '💰 TTCom Pesa', ussd: '*150*14#', code: 'ttcom' }
];

const PACKAGES = [
    { gb: 5, price: 5000, emoji: '📦', label: 'Light Pack' },
    { gb: 10, price: 10000, emoji: '📦', label: 'Standard' },
    { gb: 20, price: 20000, emoji: '🎁', label: 'Premium' },
    { gb: 50, price: 50000, emoji: '🔥', label: 'Ultra' },
    { gb: 100, price: 100000, emoji: '⚡', label: 'Mega' }
];

// ────────────────────────────────────────────────
// HALOTEL COMMAND (All logic inside here)
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const fullText = (userMessage || '').trim().toLowerCase().replace(/^\./, ''); // Remove dot if any

        // ==================== MAIN MENU ====================
        if (fullText === 'halotel' || fullText === 'halotel_menu') {
            const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✨ *Premium High-Speed 4G Internet* ✨\n🔥 *SPECIAL OFFER: GB 1 = TSh 1,000*\n⚡ *24/7 Instant Activation*\n\n*CHOOSE YOUR PACKAGE BELOW:* 👇`;

            const buttons = [
                { id: 'halotel_packages', text: '📦 VIEW PACKAGES' },
                { id: 'halotel_payment', text: '💳 PAYMENT METHODS' },
                { id: 'halotel_support', text: '📞 SUPPORT' },
                { id: 'halotel_terms', text: '📋 TERMS & CONDITIONS' }
            ];

            return await sendButtons(sock, chatId, {
                title: '📶 MICKEY GLITCH DATA STORE',
                text: adText,
                footer: CONFIG.FOOTER,
                image: { url: CONFIG.BANNER },
                buttons: buttons
            }, { quoted: message });
        }

        // ==================== VIEW PACKAGES ====================
        if (fullText === 'halotel_packages') {
            let packageText = `💎 *AVAILABLE DATA PACKAGES*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n*Super Fast 4G LTE Speed*\n*Valid for 30 Days*\n\n`;

            PACKAGES.forEach(pkg => {
                packageText += `\( {pkg.emoji} * \){pkg.label}:* ${pkg.gb}GB = ${formatCurrency(pkg.price)}\n`;
            });

            const packageButtons = PACKAGES.map(pkg => ({
                id: `halotel_select_${pkg.gb}`,
                text: `${pkg.emoji} ${pkg.gb}GB - ${formatCurrency(pkg.price)}`
            }));

            packageButtons.push({ id: 'halotel_custom_amount', text: '🎯 CUSTOM AMOUNT' });
            packageButtons.push({ id: 'halotel_menu', text: '⬅️ BACK TO MENU' });

            return await sendButtons(sock, chatId, {
                title: '📱 CHOOSE YOUR DATA PLAN',
                text: packageText,
                footer: CONFIG.FOOTER,
                buttons: packageButtons
            }, { quoted: message });
        }

        // ==================== SELECT PACKAGE ====================
        if (fullText.startsWith('halotel_select_')) {
            const selectedGB = parseInt(fullText.split('_')[2]);
            const pkg = PACKAGES.find(p => p.gb === selectedGB);
            if (!pkg) return;

            const orderText = `✅ *PACKAGE SELECTED*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📦 *Package:* \( {pkg.label} ( \){selectedGB}GB)\n💰 *Price:* ${formatCurrency(pkg.price)}\n⏳ *Validity:* 30 Days\n🚀 *Speed:* 4G LTE\n\n*Chagua njia ya kulipa:* 👇`;

            const paymentButtons = PAYMENT_METHODS.map(method => ({
                id: `halotel_pay_\( {method.code}_ \){selectedGB}`,
                text: method.name
            }));

            paymentButtons.push({ id: 'halotel_packages', text: '⬅️ BACK' });

            return await sendButtons(sock, chatId, {
                title: '💳 SELECT PAYMENT METHOD',
                text: orderText,
                footer: CONFIG.FOOTER,
                buttons: paymentButtons
            }, { quoted: message });
        }

        // ==================== PAYMENT SECTION ====================
        if (fullText.startsWith('halotel_pay_')) {
            const parts = fullText.split('_');
            const paymentCode = parts[2];
            const gb = parseInt(parts[3]);

            const method = PAYMENT_METHODS.find(m => m.code === paymentCode);
            const pkg = PACKAGES.find(p => p.gb === gb);
            if (!method || !pkg) return;

            const ref = Math.random().toString(36).toUpperCase().substring(2, 8);

            const paymentText = `💳 *PAYMENT CONFIRMATION*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎫 *Reference:* #${ref}\n📦 *Plan:* \( {pkg.label} ( \){gb}GB)\n💰 *Amount:* ${formatCurrency(pkg.price)}\n📱 *Method:* ${method.name}\n\n1️⃣ Bonyeza kitufe cha chini\n2️⃣ Fanya malipo\n3️⃣ Baada ya malipo bonyeza "I HAVE PAID"`;

            const confirmButtons = [];

            if (method.ussd) {
                confirmButtons.push({
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: `💸 ${method.name}`,
                        url: `tel:${method.ussd}`,
                        merchant_url: ""
                    })
                });
            } else {
                confirmButtons.push({ id: 'halotel_bank_details', text: '🏦 SHOW BANK DETAILS' });
            }

            confirmButtons.push(
                { id: `halotel_confirm_${ref}`, text: '✅ I HAVE PAID' },
                { id: 'halotel_packages', text: '❌ CANCEL' }
            );

            return await sendButtons(sock, chatId, {
                title: '💸 COMPLETE PAYMENT',
                text: paymentText,
                footer: CONFIG.FOOTER,
                buttons: confirmButtons
            }, { quoted: message });
        }

        // ==================== CONFIRMATION ====================
        if (fullText.startsWith('halotel_confirm_')) {
            const ref = fullText.split('_')[2];
            return await sock.sendMessage(chatId, {
                text: `✅ *PAYMENT RECEIVED SUCCESSFULLY!*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📸 *Reference:* #${ref}\n\nTafadhali tuma screenshot ya malipo sasa hivi.\nSupport itathibitisha na kukuamilisha data ndani ya dakika chache.`
            }, { quoted: message });
        }

        // ==================== OTHER SECTIONS ====================
        if (fullText === 'halotel_payment') {
            // ... (unaweza kuongeza kama unataka)
        }

        if (fullText === 'halotel_support') {
            // Support code yako ya zamani
        }

        if (fullText === 'halotel_terms') {
            // Terms code yako ya zamani
        }

        if (fullText === 'halotel_custom_amount' || fullText === 'halotel_bank_details') {
            // Unaweza kuongeza logic hapa
        }

        // Custom GB amount (kama user atuma namba moja kwa moja)
        const gbMatch = fullText.match(/^(\d+)$/);
        if (gbMatch) {
            const gb = parseInt(gbMatch[1]);
            if (gb >= 1 && gb <= 500) {
                const price = gb * CONFIG.PRICE_PER_GB;
                await sock.sendMessage(chatId, {
                    text: `✅ *Custom Order*\n\n${gb}GB = ${formatCurrency(price)}\n\nBonyeza .halotel ili uendelee na malipo.`
                }, { quoted: message });
            }
        }

    } catch (e) {
        console.error('Halotel Error:', e);
        await sock.sendMessage(chatId, { text: '❌ Kuna tatizo kidogo. Jaribu tena kwa .halotel' }, { quoted: message });
    }
}

module.exports = { halotelCommand, CONFIG, PACKAGES, PAYMENT_METHODS };