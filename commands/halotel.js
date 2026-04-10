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
async function handlePackageSelection(sock, message, packageId, chatId) {
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
            { 
                name: 'cta_copy', 
                buttonParamsJson: JSON.stringify({ 
                    display_text: '📋 HALOTEL - 0615944741', 
                    copy_code: '0615944741' 
                }) 
            },
            { 
                name: 'cta_copy', 
                buttonParamsJson: JSON.stringify({ 
                    display_text: '📋 YAS - 0711765335', 
                    copy_code: '0711765335' 
                }) 
            },
            { 
                name: 'cta_copy', 
                buttonParamsJson: JSON.stringify({ 
                    display_text: '📋 AZAMPESA - 1615944741', 
                    copy_code: '1615944741' 
                }) 
            },
            { 
                name: 'cta_call', 
                buttonParamsJson: JSON.stringify({ 
                    display_text: '📞 Piga Halotel', 
                    phone_number: '0615944741' 
                }) 
            }
        ];

        await sendInteractiveMessage(sock, chatId, {
            text: payMsg,
            interactiveButtons: paymentButtons,
            footer: CONFIG.FOOTER
        }, { quoted: message });

    } catch (error) {
        console.error('[HALOTEL] Package Selection Error:', error);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu imetokea!' }, { quoted: message });
    }
}

// ────────────────────────────────────────────────
// MAIN HALOTEL COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message) {
    try {
        const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟

✨ Premium High-Speed 4G/5G Internet
🔥 Bei Nafuu: GB 1 = TSh 1,000 tu
⚡ Instant Activation baada ya kulipa

Chagua package unayotaka hapa chini 👇`;

        const rows = PACKAGES.map(pkg => ({
            header: `${pkg.gb}GB`,
            title: pkg.label,
            description: `TSh ${pkg.price.toLocaleString()}/=`,
            id: pkg.id
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
                        sections: [
                            {
                                title: 'VIFURUSHI VYA HALOTEL',
                                rows: rows
                            }
                        ]
                    })
                }
            ]
        }, { quoted: message });

    } catch (error) {
        console.error('Halotel Command Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Hitilafu imetokea wakati wa kufungua menu ya Halotel.'
        }, { quoted: message });
    }
}

// Attach handler
halotelCommand.handlePackageSelection = handlePackageSelection;

module.exports = halotelCommand;