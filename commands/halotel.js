/**
 * halotel.js - Mickey Glitch Business AI (Super Stable Version)
 * Kazi: Inatofautisha bando na Panel za Server zenye Specs (RAM, CPU, DISK) ukitumia gifted-btns.
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

// Vifurushi vya bando la kawaida
const PACKAGES = [
    { gb: 10, label: 'Standard Pack' },
    { gb: 15, label: 'Bronze Pack' },
    { gb: 20, label: 'Silver Pack' },
    { gb: 25, label: 'Gold Pack' },
    { gb: 50, label: 'Business Pack' }
];

// Orodha ya bidhaa za Panel zilizoboreshwa zenye CPU, RAM, na DISK
const PANEL_PACKAGES = [
    { 
        name: 'Panel 1GB', 
        price: 5000, 
        id: 'h_panel_1gb',
        specs: { ram: '1 GB', cpu: '100% (1 Core)', disk: '10 GB SSD' }
    },
    { 
        name: 'Number 1 Month', 
        price: 3000, 
        id: 'h_panel_num1m',
        specs: { ram: '512 MB', cpu: '50% (Shared)', disk: '5 GB SSD' }
    },
    { 
        name: 'Node/Bot Server', 
        price: 15000, 
        id: 'h_panel_node',
        specs: { ram: '4 GB', cpu: '200% (2 Cores)', disk: '40 GB NVMe' }
    }
];

async function askMickeyBiz(query, userName, context = "") {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando na panel za server zilizowekwa spesifikeshoni zake. Mteja ni ${userName}. Jibu kishkaji sana (Bongo Slang).`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia mwanangu tuwashe mitambo.";
    } catch (e) { return "Nipo hapa! Lipia chap nikuwashie mitambo."; }
}

async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // 1. TAMBUA INPUT
        let input = (
            m.message?.conversation || 
            m.message?.extendedTextMessage?.text || 
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).toLowerCase().trim();

        if (input === 'halotel') {
            input = '.halotel';
        }

        // ==========================================
        // [UPANDE WA PANEL / SERVER LOGIC]
        // ==========================================

        // A. Menu kuu ya Server (.halotel server)
        if (input === '.halotel server') {
            await sock.sendMessage(chatId, { react: { text: '🖥️', key: m.key } });

            const panelRows = PANEL_PACKAGES.map(p => ({
                header: p.name,
                title: `RAM: ${p.specs.ram} | CPU: ${p.specs.cpu}`,
                description: `💾 Disk: ${p.specs.disk} — TSh ${p.price.toLocaleString()}`,
                id: p.id 
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: `Inakuwaje *${userName}*! 👋\n\nKaribu kwenye *ZERO TR4SH STORE* 🖥️\nHapa kuna server zenye nguvu kwa ajili ya bot zako.\n\nChagua package yenye specs unazotaka hapa chini: 👇`,
                footer: CONFIG.FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🛒 CHAGUA SERVER SPECS",
                        sections: [{ title: "SERVER & PANELS", rows: panelRows }]
                    })
                }]
            }, { quoted: m });
        }

        // B. Kamata Oda ya Server iliyochaguliwa yenye Specs zake
        const selectedPanel = PANEL_PACKAGES.find(p => p.id === input);
        if (selectedPanel) {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });

            const aiInstruction = await askMickeyBiz(`Mteja kachagua ${selectedPanel.name} yenye RAM ${selectedPanel.specs.ram} na CPU ${selectedPanel.specs.cpu}. Mpe maelekezo ya malipo ya TSh ${selectedPanel.price}.`, userName);

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
                text: `✨ *ZERO STORE - INFO ZA SERVER*\n\n${aiInstruction}\n\n🖥️ *BIDHAA:* ${selectedPanel.name}\n⚙️ *SPECS:* \n   • 🧠 *RAM:* ${selectedPanel.specs.ram}\n   • 🏎️ *CPU:* ${selectedPanel.specs.cpu}\n   • 💾 *DISK:* ${selectedPanel.specs.disk}\n\n💰 *BEI:* TSh ${selectedPanel.price.toLocaleString()}\n📌 *HALI:* Inasubiri Malipo\n\nUkishalipa, tuma screenshot ya muamala hapa nikuwashe VPS yako! 🚀`,
                footer: CONFIG.FOOTER,
                interactiveButtons: paymentButtons
            }, { quoted: m });
        }


        // ==========================================
        // [UPANDE WA BANDO LA KAWAIDA LOGIC]
        // ==========================================

        // C. Direct Package Handler (.halotel 10gb)
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

        // D. Menu Kuu ya Bando (.halotel pekee)
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

        // AI Conversation
        if (input.length > 2 && !input.startsWith('.')) {
            const aiReply = await askMickeyBiz(input, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

    } catch (e) {
        console.error("Halotel Command Error:", e);
    }
}

module.exports = halotelCommand;
