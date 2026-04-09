const { sendInteractiveMessage } = require('gifted-btns'); // Hakikisha unatumia export sahihi
const settings = require('../settings');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
};

const formatCurrency = (n) => `TSh ${n.toLocaleString()}`;

const PACKAGES = [
    { gb: 1, price: 1000, emoji: '⭐', label: 'Starter' },
    { gb: 5, price: 5000, emoji: '🚀', label: 'Light Pack' },
    { gb: 10, price: 10000, emoji: '💎', label: 'Standard' },
    { gb: 20, price: 20000, emoji: '👑', label: 'Premium' }
];

// ────────────────────────────────────────────────
// HALOTEL COMMAND (Fully Optimized)
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const jid = chatId;
        const fullText = (userMessage || '').trim().toLowerCase().replace(/^\./, '');

        // ==================== MAIN MENU (BIG AD STYLE) ====================
        if (fullText === 'halotel' || fullText === 'halotel_menu') {
            const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟
________________________________

✨ Premium High-Speed 4G Internet ✨
🔥 *SPECIAL OFFER:* GB 1 = TSh 1,000
⚡ 24/7 Instant Activation (Fasta)

*CHAGUA KIFURUSHI CHAKO (CHOOSE PKG):* 👇`;

            const buttons = PACKAGES.map(pkg => ({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: `${pkg.emoji} ${pkg.gb}GB - ${formatCurrency(pkg.price)}`,
                    url: `https://wa.me/${CONFIG.SELLER_NUMBER}?text=Nahitaji_GB_${pkg.gb}_Kiasi_${pkg.price}`
                })
            }));

            // Big Ad Image Support
            return await sendInteractiveMessage(sock, jid, {
                image: { url: CONFIG.BANNER },
                text: adText,
                footer: CONFIG.FOOTER,
                interactiveButtons: buttons
            }, { quoted: message });
        }

        // ==================== PAYMENT LOGIC (AUTO-COPY) ====================
        if (fullText.includes('nahitaji_gb')) {
            const kiasi = fullText.split('_kiasi_')[1];
            const gb = fullText.split('_')[2];
            
            const payMsg = `✅ *ULIYOCHAGUA:* GB ${gb}
💰 *KIASI CHA KULIPA:* TSh ${kiasi}/=
________________________________

*BONYEZA BUTTON CHINI KU-COPY NAMBA:*
_Copy namba kisha lipa na utume screenshot (ss)._`;

            const paymentButtons = [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💳 HALOTEL (0615944741)',
                        copy_code: '0615944741'
                    })
                },
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💳 YAS (0711765335)',
                        copy_code: '0711765335'
                    })
                },
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💳 AZAMPESA (1615944741)',
                        copy_code: '1615944741'
                    })
                }
            ];

            return await sendInteractiveMessage(sock, jid, {
                text: payMsg,
                footer: CONFIG.FOOTER,
                interactiveButtons: paymentButtons
            }, { quoted: message });
        }

    } catch (e) {
        console.error('Halotel Error:', e);
    }
}

module.exports = { halotelCommand, CONFIG, PACKAGES };
