/**
 * halotel.js - Mickey Glitch Business AI (Super Stable Version)
 * Kazi: Inatumia text-based commands kwa buttons ili kuhakikisha bot inajibu kila wakati.
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');

const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741@s.whatsapp.net',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
    PAYMENT_NO: '0615944741'
};

const PACKAGES = [
    { gb: 10, label: 'Standard Pack' },
    { gb: 15, label: 'Bronze Pack' },
    { gb: 20, label: 'Silver Pack' },
    { gb: 25, label: 'Gold Pack' },
    { gb: 50, label: 'Business Pack' }
];

async function askMickeyBiz(query, userName, context = "") {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando (1GB=1000). Mteja ni ${userName}. Jibu kishkaji sana (Bongo Slang).`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia bando mwanangu tuwashe mitambo.";
    } catch (e) { return "Nipo hapa! Lipia chap nikuwashie bando."; }
}

async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // 1. TAMBUA INPUT (Inasoma text au majibu ya buttons)
        let input = (
            m.message?.conversation || 
            m.message?.extendedTextMessage?.text || 
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).toLowerCase().trim();

        // 2. [DIRECT PACKAGE HANDLER] - Inakamata ".halotel 10gb" au "h_pkg_10"
        if (input.includes('gb') && (input.startsWith('.halotel') || input.includes('h_pkg'))) {
            // Extract namba ya GB (mfano 10, 20, 50)
            const gbValue = input.match(/\d+/)[0]; 
            const totalPrice = parseInt(gbValue) * CONFIG.PRICE_PER_GB;

            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });

            const aiInstruction = await askMickeyBiz(`Mteja kachagua ${gbValue}GB. Mpe maelekezo ya malipo ya TSh ${totalPrice}.`, userName);

            const paymentButtons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: `📋 Copy No: ${CONFIG.PAYMENT_NO}`,
                        copy_code: CONFIG.PAYMENT_NO
                    })
                }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                text: `✨ *MICKEY BIZ - ODA YAKO*\n\n${aiInstruction}\n\n📊 *DATA:* ${gbValue}GB\n💰 *BEI:* TSh ${totalPrice.toLocaleString()}\n📌 *MTANDAO:* Halotel\n\nUkishalipa, tuma screenshot hapa chap! 🚀`,
                footer: CONFIG.FOOTER,
                interactiveButtons: paymentButtons
            }, { quoted: m });
        }

        // 3. [MAIN MENU] - Ikipigwa ".halotel" pekee
        if (input === '.halotel') {
            await sock.sendMessage(chatId, { react: { text: '🛒', key: m.key } });

            const rows = PACKAGES.map(p => ({
                header: `${p.gb}GB`,
                title: p.label,
                description: `TSh ${(p.gb * CONFIG.PRICE_PER_GB).toLocaleString()}`,
                id: `.halotel ${p.gb}gb` // Hapa ndipo tunatumia command badala ya ID
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: `Mambo vipi *${userName}*! 👋\n\nChagua bando lako hapa chini nikupe namba ya malipo chap! 👇`,
                footer: CONFIG.FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🛒 ORODHA YA VIFURUSHI",
                        sections: [{ title: "HALOTEL BANDO", rows: rows }]
                    })
                }]
            }, { quoted: m });
        }

        // 4. [AI CONVERSATION]
        if (input.length > 2 && !input.startsWith('.')) {
            const aiReply = await askMickeyBiz(input, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

    } catch (e) {
        console.error("Halotel Command Error:", e);
    }
}

module.exports = halotelCommand;
