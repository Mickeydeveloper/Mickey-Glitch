/**
 * halotel.js - Halotel Internet Packages
 * Imeboreshwa ili ichukuliwe vizuri na auto command registration
 */

const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741@s.whatsapp.net', // Full JID
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
};

// Packages
const PACKAGES = [
    { gb: 10, price: 10000, label: 'Standard Pack',  id: 'h_pkg_10' },
    { gb: 15, price: 15000, label: 'Bronze Pack',    id: 'h_pkg_15' },
    { gb: 20, price: 20000, label: 'Premium Pack',   id: 'h_pkg_20' },
    { gb: 25, price: 25000, label: 'Gold Pack',      id: 'h_pkg_25' }
];

// ────────────────────────────────────────────────
// HANDLE PACKAGE SELECTION
// ────────────────────────────────────────────────
async function handlePackageSelection(sock, chatId, m, packageId) {
    try {
        const cleanId = packageId.replace('.', '');
        const pkg = PACKAGES.find(p => p.id === cleanId);
        if (!pkg) return;

        const payMsg = `✅ *UMECHAGUA PACKAGE*\n\n` +
                      `📦 *Package:* ${pkg.label}\n` +
                      `💾 *GB:* ${pkg.gb} GB\n` +
                      `💰 *Bei:* TSh ${pkg.price.toLocaleString()}/=\n\n` +
                      `*JINSI YA KULIPIA:*\n` +
                      `• Lipa kwenye namba zilizotolewa hapa chini\n` +
                      `• Tuma Screenshot ya muamala kwa @${CONFIG.SELLER_NUMBER.split('@')[0]}\n\n` +
                      `Asante kwa kuchagua Mickey Glitch!`;

        const paymentButtons = [
            { 
                name: "cta_copy", 
                buttonParamsJson: JSON.stringify({ 
                    display_text: "📋 HALOTEL - 0615944741", 
                    copy_code: "0615944741" 
                }) 
            },
            { 
                name: "cta_copy", 
                buttonParamsJson: JSON.stringify({ 
                    display_text: "📋 AZAMPESA - 1615944741", 
                    copy_code: "1615944741" 
                }) 
            },
            { 
                name: "cta_call", 
                buttonParamsJson: JSON.stringify({ 
                    display_text: "📞 Piga Halotel", 
                    phone_number: "0615944741" 
                }) 
            }
        ];

        await sendInteractiveMessage(sock, chatId, {
            text: payMsg,
            interactiveButtons: paymentButtons,
            footer: CONFIG.FOOTER,
            contextInfo: { 
                mentionedJid: [CONFIG.SELLER_NUMBER] 
            }
        }, { quoted: m });

    } catch (error) {
        console.error('[HALOTEL Selection Error]', error);
    }
}

// ────────────────────────────────────────────────
// MAIN COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const input = (body || '').toLowerCase().trim();

        // Handle package selection
        if (input.includes('h_pkg_')) {
            return await handlePackageSelection(sock, chatId, m, input);
        }

        // Main Menu
        const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟\n\n` +
                      `✨ Premium High-Speed Internet\n` +
                      `🔥 Bei Nafuu: GB 1 = TSh ${CONFIG.PRICE_PER_GB}/=\n` +
                      `⚡ Instant Activation baada ya kulipa\n\n` +
                      `Chagua package unayotaka hapa chini 👇`;

        const rows = PACKAGES.map(pkg => ({
            header: `${pkg.gb}GB`,
            title: pkg.label,
            description: `TSh ${pkg.price.toLocaleString()}/=`,
            id: `.${pkg.id}`
        }));

        await sendInteractiveMessage(sock, chatId, {
            image: { url: CONFIG.BANNER },
            text: adText,
            footer: CONFIG.FOOTER,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📦 CHAGUA PACKAGE',
                        sections: [{
                            title: 'VIFURUSHI VYA HALOTEL',
                            rows: rows
                        }]
                    })
                }
            ]
        }, { quoted: m });

    } catch (error) {
        console.error('[HALOTEL Command Error]', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Kuna tatizo katika kuonyesha Halotel packages.' 
        }, { quoted: m });
    }
}

// ────────────────────────────────────────────────
// EXPORT - Auto Registration
// ────────────────────────────────────────────────
module.exports = {
    name: 'halotel',
    alias: ['h_pkg_10', 'h_pkg_15', 'h_pkg_20', 'h_pkg_25', 'halopackage', 'halotelpackages'],
    category: 'tools',
    description: 'Halotel data bundles menu and instant selection',
    execute: halotelCommand
};