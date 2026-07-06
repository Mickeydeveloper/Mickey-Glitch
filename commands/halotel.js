/**
 * halotel.js - Mickey Glitch Business AI with Booking/Flow Message System
 * KAZI: Inauza bando na server specs kwa kutumia muundo wa Interactive Booking/List Flows
 */

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// CONFIGURATION
const CONFIG = {
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
    BANNER: 'https://github.com/Mickeymozy/Mickey-Vip/blob/main/chatbot.png?raw=true',
    PAYMENT_NO: '0615944741'
};

// Server Packages
const SERVER_PACKAGES = [
    { name: 'SMALL', price: 15000, id: 'pkg_small', specs: 'RAM: 1GB | CPU: 50% | DISK: 10GB' },
    { name: 'MEDIUM', price: 35000, id: 'pkg_medium', specs: 'RAM: 2GB | CPU: 100% | DISK: 25GB' },
    { name: 'LARGE', price: 65000, id: 'pkg_large', specs: 'RAM: 4GB | CPU: 200% | DISK: 50GB' },
    { name: 'PRO', price: 120000, id: 'pkg_pro', specs: 'RAM: 8GB | CPU: 400% | DISK: 100GB' }
];

// Data Packages
const DATA_PACKAGES = [
    { gb: 10, label: 'Standard Pack', price: 10000 },
    { gb: 15, label: 'Bronze Pack', price: 15000 },
    { gb: 20, label: 'Silver Pack', price: 20000 },
    { gb: 25, label: 'Gold Pack', price: 25000 },
    { gb: 50, label: 'Business Pack', price: 50000 }
];

async function askMickeyBiz(query, userName) {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando na panel. Jibu kwa kifupi.`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia mwanangu tuwashe mitambo.";
    } catch (e) { 
        return "Nipo hapa! Lipia chap nikuwashie mitambo."; 
    }
}

async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const safeM = m || {};

        let input = (
            safeM.message?.conversation || 
            safeM.message?.extendedTextMessage?.text || 
            safeM.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            safeM.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).toLowerCase().trim();

        if (input === 'halotel') input = '.halotel';

        // ============= MAIN MENU (BOOKING / SELECTION FLOW) =============
        if (input === '.halotel') {
            await sock.sendMessage(chatId, { react: { text: '🏪', key: safeM.key } });

            const textBody = `🏪 *MICKEY GLITCH STORE — INTERACTIVE BOOKING*\n\nMambo vipi *${userName}*! 👋\n\nKaribu kwenye mfumo wa kuagiza na ku-book huduma kidijitali. Bonyeza *"📅 OPEN BOOKING SYSTEM"* hapo chini kuchagua bando au seva unayotaka papo hapo.`;

            // Muundo wa Sections kwa ajili ya Booking Flow
            const sections = [
                {
                    title: "🖥️ SERVER HOSTING PACKS",
                    rows: SERVER_PACKAGES.map(pkg => ({
                        rowId: `server_${pkg.id}`,
                        title: `🖥️ Seva: ${pkg.name}`,
                        description: `💰 TSh ${pkg.price.toLocaleString()} — ${pkg.specs}`
                    }))
                },
                {
                    title: "📱 HALOTEL DATA BUNDLES",
                    rows: DATA_PACKAGES.map(p => ({
                        rowId: `data_${p.gb}`,
                        title: `📱 Halotel ${p.gb}GB`,
                        description: `💰 TSh ${p.price.toLocaleString()} — ${p.label}`
                    }))
                }
            ];

            await sendBookingFlowMessage(sock, chatId, safeM, textBody, CONFIG.FOOTER, "📅 OPEN BOOKING SYSTEM", sections);
            return;
        }

        // ============= HANDLE SERVER SELECTION =============
        if (input.startsWith('server_')) {
            const packageId = input.replace('server_', '');
            const selectedPackage = SERVER_PACKAGES.find(pkg => pkg.id === packageId);
            if (selectedPackage) {
                const textDetail = `✨ *ORDER CONFIRMED — SERVER HOSTING*\n\n📦 *Package:* ${selectedPackage.name}\n💰 *Price:* TSh ${selectedPackage.price.toLocaleString()}\n⚙️ *Specs:* ${selectedPackage.specs}\n\n*PAYMENT DETAILS:*\n💳 *M-Pesa/Tigo/Airtel:* \`${CONFIG.PAYMENT_NO}\`\n\n_Baada ya kulipia, tuma screenshot hapa ili kuwasha mitambo yako ya seva chap!_`;
                await sock.sendMessage(chatId, { text: textDetail }, { quoted: safeM });
            }
            return;
        }

        // ============= HANDLE DATA SELECTION =============
        if (input.startsWith('data_')) {
            const gbValue = parseInt(input.replace('data_', ''));
            const selectedData = DATA_PACKAGES.find(d => d.gb === gbValue);
            if (selectedData) {
                const textData = `✨ *ORDER CONFIRMED — DATA BUNDLE*\n\n📊 *Bando:* ${selectedData.gb}GB (${selectedData.label})\n💰 *Price:* TSh ${selectedData.price.toLocaleString()}\n📌 *Network:* Halotel\n\n*PAYMENT DETAILS:*\n💳 *Namba ya Malipo:* \`${CONFIG.PAYMENT_NO}\`\n\n_Tuma screenshot ya muamala hapa ili bando liingizwe kwenye namba yako mara moja._`;
                await sock.sendMessage(chatId, { text: textData }, { quoted: safeM });
            }
            return;
        }

        // ============= AI CHAT =============
        if (input.length > 2 && !input.startsWith('.') && !input.startsWith('data_') && !input.startsWith('server_')) {
            const aiReply = await askMickeyBiz(input, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: safeM });
        }

    } catch (e) {
        console.error("Halotel Flow Error:", e);
    }
}

// Mfumo halisi wa kuunda Booking/List Flow Message yenye Beji ya AI na picha ya Banner juu
async function sendBookingFlowMessage(sock, chatId, message, textBody, footerText, buttonTitle, sectionsList) {
    try {
        const fetchBuffer = async (url) => {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            return Buffer.from(res.data);
        };

        let thumbnailBuffer = null;
        if (CONFIG.BANNER) {
            try {
                const sharp = require('sharp');
                const buf = await fetchBuffer(CONFIG.BANNER);
                thumbnailBuffer = await sharp(buf).resize(300, 300, { fit: 'cover' }).toBuffer();
            } catch (e) {
                console.error('Thumbnail error:', e.message);
            }
        }

        const msg = generateWAMessageFromContent(chatId, {
            listMessage: {
                title: "🏪 MICKEY BIZ TECH",
                description: textBody,
                buttonText: buttonTitle, // Hii inatengeneza ile fomu/drawer ya booking
                listType: 1,
                sections: sectionsList,
                footerText: footerText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    // Kumalizia muonekano kamili wa location header juu ya list
                    headerType: 6,
                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        name: "📅 HUDUMA YA MIADI & PACKAGES",
                        address: "Mickey Glitch Automated Server",
                        jpegThumbnail: thumbnailBuffer
                    }
                }
            }
        }, { userJid: sock.user.id, quoted: message });

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error('Booking Flow Error:', err);
        await sock.sendMessage(chatId, { text: textBody }, { quoted: message });
    }
}

module.exports = {
    halotelCommand
};
