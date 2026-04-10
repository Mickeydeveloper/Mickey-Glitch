const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741',
    BANNER: 'https://files.catbox.moe/ljabyq.png', // Picha kubwa ya tangazo
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
};

const PACKAGES = [
    { gb: 1, price: 1000, label: 'Starter Pack', id: 'h_pkg_1' },
    { gb: 5, price: 5000, label: 'Light Pack', id: 'h_pkg_5' },
    { gb: 10, price: 10000, label: 'Standard Pack', id: 'h_pkg_10' },
    { gb: 20, price: 20000, label: 'Premium Pack', id: 'h_pkg_20' },
    { gb: 50, price: 50000, label: 'Ultra Pack', id: 'h_pkg_50' }
];

// ────────────────────────────────────────────────
// HANDLER FOR PACKAGE SELECTION
// ────────────────────────────────────────────────
async function handlePackageSelection(sock, message, packageId, chatId) {
    try {
        console.log(`[HALOTEL] Package selected: ${packageId}`);
        
        // Extract GB amount from ID
        const gbMatch = packageId.match(/h_pkg_(\d+)/);
        if (!gbMatch) {
            await sock.sendMessage(chatId, { 
                text: '❌ Error: Invalid package ID',
                contextInfo: { quotedMessage: message.message }
            });
            return;
        }

        const gb = parseInt(gbMatch[1]);
        const pkg = PACKAGES.find(p => p.gb === gb);

        if (!pkg) {
            await sock.sendMessage(chatId, { 
                text: `❌ Error: Package not found for ${gb}GB`,
                contextInfo: { quotedMessage: message.message }
            });
            return;
        }

        const payMsg = `✅ *ULIYOCHAGUA:* GB ${pkg.gb}
💰 *KIASI CHA KULIPA:* TSh ${pkg.price.toLocaleString()}/=
📦 *PACKAGE:* ${pkg.label}
________________________________

*BONYEZA BUTTON CHINI KU-COPY NAMBA:*
_Copy namba kisha lipa na utume screenshot (ss) hapa._`;

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

        return await sendInteractiveMessage(sock, chatId, {
            text: payMsg,
            footer: CONFIG.FOOTER,
            interactiveButtons: paymentButtons
        }, { quoted: message });

    } catch (error) {
        console.error('[HALOTEL] Error in handlePackageSelection:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: `⚠️ Hitilafu imetokea! ${error.message}`,
                contextInfo: { quotedMessage: message.message }
            });
        } catch (e) {
            console.error('Could not send error message:', e);
        }
    }
}

// ────────────────────────────────────────────────
// HALOTEL COMMAND LOGIC
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        const jid = chatId;
        const budy = (userMessage || '').trim().toLowerCase().replace(/^\./, '');

        // ==================== 1. MAIN MENU (LIST PICKER) ====================
        if (budy === 'halotel' || budy === 'halotel_menu') {
            const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟
________________________________

✨ Premium High-Speed 4G Internet ✨
🔥 *SPECIAL OFFER:* GB 1 = TSh 1,000
⚡ 24/7 Instant Activation (Fasta)

*BONYEZA BUTTON CHINI KUCHAGUA:* 👇`;

            const rows = PACKAGES.map(pkg => ({
                header: `OFFER: ${pkg.gb}GB`,
                title: `${pkg.label}`,
                description: `Kiasi: TSh ${pkg.price.toLocaleString()}/=`,
                id: pkg.id
            }));

            return await sendInteractiveMessage(sock, jid, {
                image: { url: CONFIG.BANNER }, // Big Ad Header
                text: adText,
                footer: CONFIG.FOOTER,
                interactiveButtons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: '📦 CHAGUA KIFURUSHI',
                            sections: [
                                {
                                    title: 'VIFURUSHI VYA DATA (DATA PKGS)',
                                    rows: rows
                                }
                            ]
                        })
                    }
                ]
            }, { quoted: message });
        }

    } catch (e) {
        console.error('Halotel Error:', e);
    }
}

module.exports = { halotelCommand, CONFIG, PACKAGES, handlePackageSelection };

// Attach handler to main function
halotelCommand.handlePackageSelection = handlePackageSelection;
