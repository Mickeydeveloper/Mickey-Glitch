const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000, // Unaweza kubadili bei hapa
    SELLER_NUMBER: '255615944741',
    BANNER: 'https://files.catbox.moe/ljabyq.png', 
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
};

// Zimebadilishwa kuwa GB 10, 15, 20, na 25 pekee
const PACKAGES = [
    { gb: 10, price: 10000, label: 'Standard Pack',  id: 'h_pkg_10' },
    { gb: 15, price: 15000, label: 'Bronze Pack',    id: 'h_pkg_15' },
    { gb: 20, price: 20000, label: 'Premium Pack',   id: 'h_pkg_20' },
    { gb: 25, price: 25000, label: 'Gold Pack',      id: 'h_pkg_25' }
];

// ────────────────────────────────────────────────
// HANDLE PACKAGE SELECTION + PAYMENT
// ────────────────────────────────────────────────
async function handlePackageSelection(sock, chatId, m, packageId) {
    try {
        const cleanId = packageId.startsWith('.') ? packageId.slice(1) : packageId;
        const gbMatch = cleanId.match(/h_pkg_(\d+)/);
        if (!gbMatch) return;

        const gb = parseInt(gbMatch[1]);
        const pkg = PACKAGES.find(p => p.gb === gb);
        if (!pkg) return;

        const payMsg = `✅ *UMECHAGUA PACKAGE*\n\n` +
                      `📦 *Package:* ${pkg.label}\n` +
                      `💾 *GB:* ${pkg.gb} GB\n` +
                      `💰 *Bei:* TSh ${pkg.price.toLocaleString()}/=\n\n` +
                      `*JINSI YA KULIPIA:*\n` +
                      `Lipa kupitia namba hapa chini kisha tuma Screenshot ya muamala hapa kumpata @${CONFIG.SELLER_NUMBER.split('@')[0]}.`;

        const paymentButtons = [
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 HALOTEL - 0615944741', copy_code: '0615944741' }) },
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 AZAMPESA - 1615944741', copy_code: '1615944741' }) },
            { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: '📞 Piga Halotel', phone_number: '0615944741' }) }
        ];

        return await sendInteractiveMessage(sock, chatId, {
            text: payMsg,
            interactiveButtons: paymentButtons,
            footer: CONFIG.FOOTER,
            contextInfo: { mentionedJid: [CONFIG.SELLER_NUMBER + '@s.whatsapp.net'] }
        }, { quoted: m });

    } catch (error) {
        console.error('[HALOTEL] Selection Error:', error);
    }
}

// ────────────────────────────────────────────────
// MAIN EXECUTION LOGIC
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, m, body) {
    try {
        const input = (body || '').toLowerCase().trim();

        if (input.includes('h_pkg_')) {
            return await handlePackageSelection(sock, chatId, m, input);
        }

        const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟\n\n✨ Premium High-Speed 4G/5G Internet\n🔥 Bei Nafuu: GB 1 = TSh 1,000 tu\n⚡ Instant Activation baada ya kulipa\n\nChagua package unayotaka hapa chini 👇`;

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
                        sections: [{ title: 'VIFURUSHI VYA HALOTEL', rows: rows }]
                    })
                }
            ]
        }, { quoted: m });

    } catch (error) {
        console.error('Halotel Command Error:', error);
    }
}

// ────────────────────────────────────────────────
// EXPORT KWA AJILI YA AUTO-SYNC
// ────────────────────────────────────────────────
module.exports = {
    name: 'halotel',
    // Alias zimebadilishwa kulingana na GB mpya
    alias: ['h_pkg_10', 'h_pkg_15', 'h_pkg_20', 'h_pkg_25'],
    category: 'tools',
    description: 'Halotel data bundles menu and selection',
    execute: halotelCommand
};
