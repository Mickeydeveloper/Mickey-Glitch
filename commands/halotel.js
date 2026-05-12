/**
 * halotel.js - Mickey Glitch Business AI (Version 3.1.0 - 2026)
 * Kazi: Inajibu .halotel kwa Flow Form, inashughulikia oda, na ina AI ya biashara.
 */

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
    { gb: 10, price: 10000, label: 'Standard Pack', id: 'h_pkg_10' },
    { gb: 15, price: 15000, label: 'Bronze Pack',   id: 'h_pkg_15' },
    { gb: 25, price: 25000, label: 'Gold Pack',     id: 'h_pkg_25' }
];

// ────────────────────────────────────────────────
// [BUSINESS AI CORE]
// ────────────────────────────────────────────────
async function askMickeyBiz(query, userName) {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI, msaidizi wa Mickdadi. Unauza bando (1GB=1000). Mteja anaitwa ${userName}. Jibu kishkaji, mpe maelekezo ya malipo (Halotel: 0615944741).`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Oya! Lipia bando chap, tuma screenshot nikuwashie.";
    } catch (e) {
        return "Nipo hapa mwanangu! Andika .halotel uone vifurushi vyetu vipya.";
    }
}

// ────────────────────────────────────────────────
// [MAIN COMMAND HANDLER]
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // 1. TAMBUA INPUT (Text, Button, au Flow Response)
        const textMsg = (m.message?.conversation || m.message?.extendedTextMessage?.text || body || '').toLowerCase().trim();
        const flowResponse = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
        const btnResponse = m.message?.buttonsResponseMessage?.selectedButtonId || m.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

        const input = flowResponse || btnResponse || textMsg;

        // 2. [FLOW/BUTTON RESPONSE] - Mteja akichagua bando
        if (input.includes('pkg_') || (flowResponse && input.includes('id'))) {
            let selectedId = input;
            if (flowResponse) {
                const data = JSON.parse(input);
                selectedId = data.package_id || data.slot_id;
            }

            const pkg = PACKAGES.find(p => selectedId.includes(p.gb.toString()));
            const amount = pkg ? pkg.price : "10,000";
            
            await sock.sendMessage(chatId, { react: { text: '💳', key: m.key } });
            
            // Arifu Seller
            await sock.sendMessage(CONFIG.SELLER_NUMBER, { 
                text: `🔔 *ODA MPYA:* @${userJid.split('@')[0]} anataka bando la ${selectedId}.`,
                mentions: [userJid]
            });

            return await sock.sendMessage(chatId, {
                text: `✨ *MICKEY BIZ ODA*\n\nSafi *${userName}*! Umepiga oda ya ${selectedId}.\n\n💰 *KIASI:* TSh ${amount.toLocaleString()}\n📌 *NAMBA:* 0615944741 (Halotel)\n\nLipa kisha tuma screenshot hapa chap! 🚀`
            }, { quoted: m });
        }

        // 3. [MAIN MENU] - Inaitwa na .halotel
        if (textMsg.startsWith('.halotel')) {
            await sock.sendMessage(chatId, { react: { text: '🛒', key: m.key } });

            // Jenga message ya Native Flow (Form)
            const flowMsg = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: `Mickey Biz - Halotel`,
                                hasMediaAttachment: true,
                                imageMessage: (await sock.prepareWAMessageMedia({ image: { url: CONFIG.BANNER } }, { upload: sock.waUploadToServer })).imageMessage
                            },
                            body: { text: `Habari *${userName}*! Karibu Mickey Infor Tech. Chagua bando lako hapa chini kwenye fomu yetu ya kisasa.` },
                            footer: { text: CONFIG.FOOTER },
                            nativeFlowMessage: {
                                buttons: [{
                                    name: "flow",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "🛒 AGIZA BANDO",
                                        flow_id: "615944741", // Replace na Flow ID yako halisi ikihitajika
                                        flow_action: "navigate",
                                        flow_token: "mickey_v3_flow",
                                        flow_cta: "Fungua Fomu",
                                        flow_action_payload: {
                                            screen: "SELECT_PACKAGE",
                                            data: { 
                                                title: "Vifurushi vya Halotel",
                                                items: PACKAGES.map(p => ({ id: p.id, title: p.label, description: `TSh ${p.price}` }))
                                            }
                                        }
                                    })
                                }]
                            }
                        }
                    }
                }
            };

            return await sock.relayMessage(chatId, flowMsg, { messageId: m.key.id });
        }

        // 4. [AI CONVERSATION] - Kama mteja anauliza swali la kawaida
        if (textMsg.length > 2 && !textMsg.startsWith('.')) {
            const aiReply = await askMickeyBiz(textMsg, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

    } catch (e) {
        console.error("Halotel Command Error:", e);
    }
}

module.exports = halotelCommand;
