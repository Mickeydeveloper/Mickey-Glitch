/**
 * halotel.js - Mickey Glitch Business AI (Super Stable Version)
 * Kazi: Inatofautisha bando za kawaida na kuuza Panel za Server ukitumia gifted-btns.
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

// Orodha ya vifurushi vya bando la kawaida
const PACKAGES = [
    { gb: 10, label: 'Standard Pack' },
    { gb: 15, label: 'Bronze Pack' },
    { gb: 20, label: 'Silver Pack' },
    { gb: 25, label: 'Gold Pack' },
    { gb: 50, label: 'Business Pack' }
];

// Orodha ya bidhaa za Panel (Kama zilivyo kwenye picha yako)
const PANEL_PACKAGES = [
    { name: 'Panel 1GB', price: 5000, id: 'h_panel_1gb' },
    { name: 'Number 1 Month', price: 3000, id: 'h_panel_num1m' },
    { name: 'Node/Bot Server', price: 15000, id: 'h_panel_node' }
];

async function askMickeyBiz(query, userName, context = "") {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando na panel za server. Mteja ni ${userName}. Jibu kishkaji sana (Bongo Slang).`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia mwanangu tuwashe mitambo.";
    } catch (e) { return "Nipo hapa! Lipia chap nikuwashie mitambo."; }
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

        // Kama mteja kaandika 'halotel' bila doti, iweke doti ili isomeke kwenye menu ya kawaida
        if (input === 'halotel') {
            input = '.halotel';
        }

        // ==========================================
        // [UPANDE WA PANEL / SERVER LOGIC]
        // ==========================================

        // A. Kama mteja amepiga command ya ".halotel server"
        if (input === '.halotel server') {
            await sock.sendMessage(chatId, { react: { text: '🖥️', key: m.key } });

            const panelRows = PANEL_PACKAGES.map(p => ({
                header: p.name,
                title: `Chagua ${p.name}`,
                description: `TSh ${p.price.toLocaleString()}`,
                id: p.id // Hii inatumiwa kukamata oda chini
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: `Inakuwaje *${userName}*! 👋\n\nKaribu kwenye *ZERO TR4SH STORE* 🖥️\nHapa unaweza kujipatia Panel na Bot Server za uhakika.\n\nChagua unachohitaji hapa chini nikupe utaratibu wa kulipia chap! 👇`,
                footer: CONFIG.FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🛒 ORODHA YA PANEL",
                        sections: [{ title: "SERVER & PANELS", rows: panelRows }]
                    })
                }]
            }, { quoted: m });
        }

        // B. Kamata Oda ya Panel iliyochaguliwa (Mfano: h_panel_1gb)
        const selectedPanel = PANEL_PACKAGES.find(p => p.id === input);
        if (selectedPanel) {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });

            const aiInstruction = await askMickeyBiz(`Mteja kachagua ${selectedPanel.name}. Mpe maelekezo ya malipo ya TSh ${selectedPanel.price}.`, userName);

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
                text: `✨ *ZERO STORE - ODA YA SERVER*\n\n${aiInstruction}\n\n🖥️ *BIDHAA:* ${selectedPanel.name}\n💰 *BEI:* TSh ${selectedPanel.price.toLocaleString()}\n📌 *HALI:* Inasubiri Malipo\n\nUkishalipa, tuma screenshot ya muamala hapa, kisha bot itatengeneza vitu vyako papo hapo! 🚀`,
                footer: CONFIG.FOOTER,
                interactiveButtons: paymentButtons
            }, { quoted: m });
        }


        // ==========================================
        // [UPANDE WA BANDO LA KAWAIDA LOGIC]
        // ==========================================

        // C. [DIRECT PACKAGE HANDLER] - Inakamata ".halotel 10gb" au "h_pkg_10"
        if (input.includes('gb') && (input.startsWith('.halotel') || input.includes('h_pkg'))) {
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

        // D. [MAIN MENU] - Ikipigwa ".halotel" pekee (Au "halotel" ya kawaida)
        if (input === '.halotel') {
            await sock.sendMessage(chatId, { react: { text: '🛒', key: m.key } });

            const rows = PACKAGES.map(p => ({
                header: `${p.gb}GB`,
                title: p.label,
                description: `TSh ${(p.gb * CONFIG.PRICE_PER_GB).toLocaleString()}`,
                id: `.halotel ${p.gb}gb`
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: `Mambo vipi *${userName}*! 👋\n\nChagua bando lako la *Halotel* hapa chini nikupe namba ya malipo chap! 👇\n\n_(Kama unataka Panel za Server, andika *.halotel server*)_`,
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
