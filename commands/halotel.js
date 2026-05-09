/**
 * halotel.js - Mickey Glitch Business AI (Self-Contained Interactive Version)
 * Kazi: AI anashughulikia bando na button clicks ndani ya function moja.
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741@s.whatsapp.net',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
};

const PACKAGES = [
    { gb: 10, price: 10000, label: 'Standard Pack',  id: 'h_pkg_10' },
    { gb: 15, price: 15000, label: 'Bronze Pack',    id: 'h_pkg_15' },
    { gb: 20, price: 20000, label: 'Premium Pack',   id: 'h_pkg_20' },
    { gb: 25, price: 25000, label: 'Gold Pack',      id: 'h_pkg_25' }
];

// ────────────────────────────────────────────────
// [BUSINESS AI CORE]
// ────────────────────────────────────────────────
async function askMickeyBiz(query, context = "") {
    const bizPrompt = `Wewe ni msaidizi wa Mickdadi, unaitwa Mickey Biz AI. 
    Unauza bando la Halotel (1GB = 1000).
    MALIPO: Halotel (0615944741) au AzamPesa (1615944741).
    MAAGIZO: Jibu kishkaji (Bongo Slang), mpongeze mteja akichagua bando, na sisitiza kutuma screenshot.
    ${context}`;

    const apis = [
        `https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`,
        `https://apiskeith.top/ai/copilot?q=${encodeURIComponent(bizPrompt + query)}`
    ];

    for (const url of apis) {
        try {
            const res = await axios.get(url, { timeout: 8000 });
            let reply = res.data.data || res.data.result || res.data.response;
            if (reply) return reply.replace(/ChatGPT|OpenAI|Microsoft/gi, "Mickey Biz AI");
        } catch (e) { continue; }
    }
    return "Oya mwanangu, nipo hapa! Lipia chap tuwashe bando, kisha tuma screenshot hapa.";
}

// ────────────────────────────────────────────────
// [MAIN COMMAND & BUTTON HANDLER]
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // TAFUTA INPUT: Angalia kama ni text, list selection, au button click
        let input = (
            body || 
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || 
            m.message?.buttonsResponseMessage?.selectedButtonId || 
            ''
        ).toLowerCase().trim();

        // 1. [BUTTON HANDLER] - Kushughulikia Package Selection
        if (input.includes('h_pkg_')) {
            const pkgId = input.replace('.', ''); // Toa nukta kama ipo
            const pkg = PACKAGES.find(p => p.id === pkgId);

            if (pkg) {
                await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });

                // Arifu muuzaji
                await sock.sendMessage(CONFIG.SELLER_NUMBER, { 
                    text: `🔔 *ODA MPYA:* @${userJid.split('@')[0]} amechagua ${pkg.gb}GB (${pkg.label}).`,
                    mentions: [userJid]
                });

                // AI Instruction
                const aiInstruction = await askMickeyBiz(
                    `Mteja ${userName} amechagua ${pkg.gb}GB kwa TSh ${pkg.price}. Mpe maelekezo ya malipo.`, 
                    `CONTEXT: Mteja kashachagua bando.`
                );

                const paymentButtons = [
                    { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Halotel No", copy_code: "0615944741" }) },
                    { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy AzamPesa No", copy_code: "1615944741" }) }
                ];

                return await sendInteractiveMessage(sock, chatId, {
                    text: `✨ *MICKEY BIZ ASSISTANT*\n\n${aiInstruction}`,
                    footer: CONFIG.FOOTER,
                    interactiveButtons: paymentButtons
                }, { quoted: m });
            }
        }

        // 2. [AI CONVERSATION] - Mteja akiuliza swali la kawaida
        if (input.length > 2 && !input.startsWith('.') && !input.includes('h_pkg_')) {
            await sock.sendMessage(chatId, { react: { text: '👨‍💼', key: m.key } });
            const response = await askMickeyBiz(input, `Mteja anaitwa ${userName}.`);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${response}` }, { quoted: m });
        }

        // 3. [MAIN MENU] - Ikianza na .halotel
        const menuText = `Hujambo *${userName}*! 👋\nNaitwa Mickey Biz AI. Chagua bando unalotaka hapa chini nikupe maelekezo ya malipo chap! 👇`;
        const rows = PACKAGES.map(pkg => ({
            header: `${pkg.gb}GB`,
            title: pkg.label,
            description: `TSh ${pkg.price.toLocaleString()}`,
            id: `h_pkg_${pkg.gb}` // Id bila nukta kuzuia mgongano na commands nyingine
        }));

        await sendInteractiveMessage(sock, chatId, {
            image: { url: CONFIG.BANNER },
            text: menuText,
            footer: CONFIG.FOOTER,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '🛒 CHAGUA BANDO',
                        sections: [{ title: 'HALOTEL PACKAGES', rows: rows }]
                    })
                }
            ]
        }, { quoted: m });

    } catch (e) { 
        console.error('Error in Halotel Command:', e); 
    }
}

module.exports = halotelCommand;
module.exports.name = 'halotel';
module.exports.category = 'BUSINESS';
module.exports.description = 'Biashara ya bando na AI Assistant interactive';
