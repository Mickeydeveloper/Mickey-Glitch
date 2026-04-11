const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741',
    BANNER: 'https://files.catbox.moe/ljabyq.png', 
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
};

const PACKAGES = [
    { gb: 1,  price: 1000,  label: 'Starter Pack',   id: 'h_pkg_1' },
    { gb: 5,  price: 5000,  label: 'Light Pack',     id: 'h_pkg_5' },
    { gb: 10, price: 10000, label: 'Standard Pack',  id: 'h_pkg_10' },
    { gb: 20, price: 20000, label: 'Premium Pack',   id: 'h_pkg_20' },
    { gb: 50, price: 50000, label: 'Ultra Pack',     id: 'h_pkg_50' }
];

// ────────────────────────────────────────────────
// HANDLE PACKAGE SELECTION + PAYMENT
// ────────────────────────────────────────────────
async function handlePackageSelection(sock, chatId, m, packageId) {
    try {
        const gbMatch = packageId.match(/h_pkg_(\d+)/);
        if (!gbMatch) return;

        const gb = parseInt(gbMatch[1]);
        const pkg = PACKAGES.find(p => p.gb === gb);
        if (!pkg) return;

        const payMsg = `✅ *UMECHAGUA PACKAGE*\n\n` +
                      `📦 *Package:* ${pkg.label}\n` +
                      `💾 *GB:* ${pkg.gb} GB\n` +
                      `💰 *Bei:* TSh ${pkg.price.toLocaleString()}/=\n\n` +
                      `Lipa kupitia mtandao wowote kisha tuma Screenshot hapa.`;

        const paymentButtons = [
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 HALOTEL - 0615944741', copy_code: '0615944741' }) },
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 YAS - 0711765335', copy_code: '0711765335' }) },
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 AZAMPESA - 1615944741', copy_code: '1615944741' }) },
            { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: '📞 Piga Halotel', phone_number: '0615944741' }) }
        ];

        return await sendInteractiveMessage(sock, chatId, {
            text: payMsg,
            interactiveButtons: paymentButtons,
            footer: CONFIG.FOOTER
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
        // Angalia kama user amebonyeza package (ID inaanza na h_pkg_)
        if (body.includes('h_pkg_')) {
            const cleanId = body.replace('.', ''); // Toa nukta kama ipo
            return await handlePackageSelection(sock, chatId, m, cleanId);
        }

        // Ikiwa ni mara ya kwanza kufungua menu
        const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟\n\n✨ Premium High-Speed 4G/5G Internet\n🔥 Bei Nafuu: GB 1 = TSh 1,000 tu\n⚡ Instant Activation baada ya kulipa\n\nChagua package unayotaka hapa chini 👇`;

        const rows = PACKAGES.map(pkg => ({
            header: `${pkg.gb}GB`,
            title: pkg.label,
            description: `TSh ${pkg.price.toLocaleString()}/=`,
            id: `.${pkg.id}` // Ongeza nukta mwanzo ili main.js iisome kama command
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
        await sock.sendMessage(chatId, { text: '❌ Hitilafu kwenye menu ya Halotel.' });
    }
}

// ────────────────────────────────────────────────
// EXPORT KWA AJILI YA AUTO-SYNC
// ────────────────────────────────────────────────
module.exports = {
    name: 'halotel',
    alias: ['h_pkg'], // Ongeza alias ili buttons za packages zipite hapa hapa
    category: 'tools',
    description: 'Halotel data bundles menu',
    execute: halotelCommand
};
