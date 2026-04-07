const { sendButtons } = require('gifted-btns');
const settings = require('../settings');
const path = require('path');

// ────────────────────────────────────────────────
// CONFIGURATION (ADVANCED)
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

// Payment methods with USSD codes
const PAYMENT_METHODS = [
    { name: '🏦 M-Pesa (Vodacom)', ussd: '*150*88%23', code: 'mpesa_vodacom' },
    { name: '💳 Tigo Pesa', ussd: '*150*98%23', code: 'tigo_pesa' },
    { name: '📱 Airtel Money', ussd: '*150*80%23', code: 'airtel' },
    { name: '🔗 CRDB Bank Transfer', ussd: 'bank_transfer', code: 'bank' },
    { name: '💰 TTCom Pesa', ussd: '*150*14%23', code: 'ttcom' }
];

// Data packages
const PACKAGES = [
    { gb: 5, price: 5000, emoji: '📦', label: 'Light Pack' },
    { gb: 10, price: 10000, emoji: '📦', label: 'Standard' },
    { gb: 20, price: 20000, emoji: '🎁', label: 'Premium' },
    { gb: 50, price: 50000, emoji: '🔥', label: 'Ultra' },
    { gb: 100, price: 100000, emoji: '⚡', label: 'Mega' }
];

// ────────────────────────────────────────────────
// MAIN COMMAND - BUTTON-BASED MENU
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const fullText = (userMessage || '').trim().toLowerCase();
        const sender = message.key.participant || message.key.remoteJid;

        // --- 1. MAIN MENU (BUTTON-BASED WELCOME) ---
        if (fullText === '.halotel' || fullText === 'halotel_menu') {
            const adText = `
🌟 *HALOTEL INTERNET MANAGER* 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ *Premium High-Speed 4G Internet* ✨
🔥 *SPECIAL OFFER: GB 1 = TSh 1,000*
⚡ *24/7 Instant Activation*

*CHAGUA KIFURUSHI CHAKO HAPA CHINI:* 👇`;

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

        // --- 2. VIEW ALL DATA PACKAGES ---
        if (fullText === 'halotel_packages') {
            let packageText = `
💎 *AVAILABLE DATA PACKAGES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Super Fast 4G LTE Speed*
*Valid for 30 Days*

`;
            const packageButtons = PACKAGES.map(pkg => ({
                id: `halotel_select_${pkg.gb}`,
                text: `${pkg.emoji} ${pkg.gb}GB - ${formatCurrency(pkg.price)}`
            }));

            packageButtons.push({ id: 'halotel_custom_amount', text: '🎯 CUSTOM AMOUNT' });
            packageButtons.push({ id: 'halotel_menu', text: '⬅️ BACK' });

            PACKAGES.forEach(pkg => {
                packageText += `${pkg.emoji} *${pkg.label}:* ${pkg.gb}GB = ${formatCurrency(pkg.price)}\n`;
            });

            packageText += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Bonyeza button ili kuamua:* `;

            return await sendButtons(sock, chatId, {
                title: '📱 CHOOSE YOUR DATA PLAN',
                text: packageText,
                footer: CONFIG.FOOTER,
                buttons: packageButtons
            }, { quoted: message });
        }

        // --- 3. SELECT SPECIFIC PACKAGE ---
        const pkgMatch = fullText.match(/halotel_select_(\d+)/);
        if (pkgMatch) {
            const selectedGB = parseInt(pkgMatch[1]);
            const pkg = PACKAGES.find(p => p.gb === selectedGB);
            if (!pkg) return;

            const orderText = `
✅ *PACKAGE SELECTED*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *Package:* ${pkg.label} (${selectedGB}GB)
💰 *Price:* ${formatCurrency(pkg.price)}
⏳ *Validity:* 30 Days
🚀 *Speed:* 4G LTE

*NEXT STEP: Choose Payment Method* 👇`;

            const paymentButtons = PAYMENT_METHODS.map(method => ({
                id: `halotel_pay_${method.code}_${selectedGB}`,
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

        // --- 4. PAYMENT PROCESSING ---
        const payMatch = fullText.match(/halotel_pay_(\w+)_(\d+)/);
        if (payMatch) {
            const [, paymentCode, gb] = payMatch;
            const method = PAYMENT_METHODS.find(m => m.code === paymentCode);
            const pkg = PACKAGES.find(p => p.gb === parseInt(gb));

            if (!method || !pkg) return;

            const ref = Math.random().toString(36).toUpperCase().substring(2, 7);
            const paymentText = `
💳 *PAYMENT CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 *Reference:* #${ref}
📦 *Data Plan:* ${pkg.label} (${gb}GB)
💰 *Amount:* ${formatCurrency(pkg.price)}
📱 *Method:* ${method.name}

*INSTRUCTIONS:*
1️⃣ Click the payment button below
2️⃣ Enter amount: ${formatCurrency(pkg.price)}
3️⃣ Complete the transaction
4️⃣ Your data activates instantly!

⏳ *Processing Time:* 30 seconds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            const confirmButtons = [];

            // Add proper USSD button if applicable
            if (method.ussd !== 'bank_transfer') {
                confirmButtons.push({
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: `📞 ${method.name}`,
                        url: `tel:${method.ussd}`
                    })
                });
            } else {
                confirmButtons.push({
                    id: 'halotel_bank_details',
                    text: '🏦 SHOW BANK DETAILS'
                });
            }

            confirmButtons.push({
                id: `halotel_confirm_${ref}`,
                text: '✅ I HAVE PAID'
            });
            confirmButtons.push({
                id: 'halotel_packages',
                text: '❌ CANCEL'
            });

            return await sendButtons(sock, chatId, {
                title: '💸 COMPLETE PAYMENT',
                text: paymentText,
                footer: CONFIG.FOOTER,
                buttons: confirmButtons
            }, { quoted: message });
        }

        // --- 5. CONFIRMATION MESSAGE ---
        const confirmMatch = fullText.match(/halotel_confirm_(\w+)/);
        if (confirmMatch) {
            const ref = confirmMatch[1];
            return await sock.sendMessage(chatId, {
                text: `✅ *PAYMENT RECEIVED!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 *Reference:* #${ref}

*Please send screenshot of transaction:*
📤 Send proof of payment in the next message.

💬 Our support team will verify within 2-5 minutes.

If you have issues, click support button.`
            }, { quoted: message });
        }

        // --- 6. PAYMENT METHODS VIEW ---
        if (fullText === 'halotel_payment') {
            let methodText = `
💳 *PAYMENT METHODS AVAILABLE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            PAYMENT_METHODS.forEach((m, idx) => {
                methodText += `${idx + 1}. ${m.name}\n`;
            });

            methodText += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*All payments are instant & secure!*`;

            const methodButtons = [
                { id: 'halotel_packages', text: '🛒 BUY DATA' },
                { id: 'halotel_menu', text: '⬅️ MAIN MENU' }
            ];

            return await sendButtons(sock, chatId, {
                title: '💰 PAYMENT OPTIONS',
                text: methodText,
                footer: CONFIG.FOOTER,
                buttons: methodButtons
            }, { quoted: message });
        }

        // --- 7. SUPPORT & FAQ ---
        if (fullText === 'halotel_support') {
            const supportText = `
📞 *24/7 CUSTOMER SUPPORT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ *Working Hours:* 24/7 OPEN
📱 *Call:* ${CONFIG.SUPPORT_CALL}
👤 *Support Agent:* ${CONFIG.SELLER_NAME}

*Common Issues:*
❓ Data not activated? → Check network settings
❓ Payment failed? → Try another payment method
❓ Account issues? → Call support directly

📞 *Click button to call support now:*`;

            const supportButtons = [
                {
                    name: "cta_call",
                    buttonParamsJson: JSON.stringify({
                        display_text: `📞 CALL SUPPORT`,
                        phoneNumber: CONFIG.SUPPORT_CALL
                    })
                },
                { id: 'halotel_menu', text: '⬅️ BACK' }
            ];

            return await sendButtons(sock, chatId, {
                title: '🆘 SUPPORT & HELP',
                text: supportText,
                footer: CONFIG.FOOTER,
                buttons: supportButtons
            }, { quoted: message });
        }

        // --- 8. TERMS & CONDITIONS ---
        if (fullText === 'halotel_terms') {
            const termsText = `
📋 *TERMS & CONDITIONS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All data packages are valid for 30 days
✅ Unused data expires after 30 days
✅ Activation takes max 2-5 minutes
✅ No hidden charges
✅ 24/7 customer support
✅ Secure & verified transactions

*Privacy:*
🔒 Your data is secure
🔒 No data sharing with third parties
🔒 Transaction history available

*Refunds:*
❌ No refunds on consumed data
✅ Refunds for payment errors (within 24 hours)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*By proceeding, you agree to our terms.*`;

            const termsButtons = [
                { id: 'halotel_packages', text: '✅ I AGREE - BUY DATA' },
                { id: 'halotel_menu', text: '⬅️ BACK' }
            ];

            return await sendButtons(sock, chatId, {
                title: '📜 TERMS',
                text: termsText,
                footer: CONFIG.FOOTER,
                buttons: termsButtons
            }, { quoted: message });
        }

        // --- 9. CUSTOM AMOUNT ORDER ---
        if (fullText === 'halotel_custom_amount') {
            return await sock.sendMessage(chatId, {
                text: `📝 *CUSTOM DATA ORDER*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please reply with the exact amount you want:

*Example:*
💬 Send: .halotel 35`
            }, { quoted: message });
        }

        // --- 10. BANK DETAILS ---
        if (fullText === 'halotel_bank_details') {
            return await sock.sendMessage(chatId, {
                text: `🏦 *BANK TRANSFER DETAILS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Account Name:** ${CONFIG.SELLER_NAME}
**Bank:** CRDB Bank
**Account Type:** Business Checking
**Swift Code:** CRDBTZTZ

*IMPORTANT:*
☝️ Use your reference number as transaction memo
⏳ Confirmation within 15-30 minutes

📞 Contact support for account details.`
            }, { quoted: message });
        }

        // --- FALLBACK: CUSTOM GB AMOUNT ---
        const matches = fullText.match(/\d+/g);
        if (matches && matches.length >= 1) {
            let gb = parseInt(matches[0]);
            if (gb < 1 || gb > 500) {
                return await sock.sendMessage(chatId, {
                    text: `⚠️ *Invalid amount!*
Please enter GB between 1-500.`
                }, { quoted: message });
            }

            const customCost = gb * CONFIG.PRICE_PER_GB;
            const customPkg = { gb, price: customCost, emoji: '🎯', label: 'Custom' };

            return await sock.sendMessage(chatId, {
                text: `✅ *CUSTOM ORDER READY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *Package:* ${gb}GB
💰 *Total Price:* ${formatCurrency(customCost)}

Reply: .halotel to view payment options`
            }, { quoted: message });
        }

    } catch (e) {
        console.error('Halotel Error:', e);
        await sock.sendMessage(chatId, {
            text: `❌ *Error occurred. Please try again.*\n\nCommand: .halotel`
        }, { quoted: message });
    }
}

module.exports = { halotelCommand, CONFIG, PACKAGES, PAYMENT_METHODS };
