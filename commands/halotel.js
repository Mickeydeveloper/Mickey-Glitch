/**
 * halotel.js - Mickey Glitch Business AI with Buttons & Payment-Only Server Flow
 * KAZI: Inauza bando, server specs, na data bundles kwa buttons
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');
const settings = require('./settings');

const CONFIG = settings.CONFIG;

const SAFE_CONFIG = CONFIG || {
    PRICE_PER_GB: 1000,
    PAYMENT_NO: '0615944741',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech'
};

// Server Packages (Updated)
const SERVER_PACKAGES = [
    { 
        name: 'SMALL', 
        price: 15000, 
        id: 'pkg_small',
        specs: { ram: '1', cpu: '50', disk: '10' },
        databases: 1,
        backups: 1,
        emoji: '🚀'
    },
    { 
        name: 'MEDIUM', 
        price: 35000, 
        id: 'pkg_medium',
        specs: { ram: '2', cpu: '100', disk: '25' },
        databases: 2,
        backups: 2,
        emoji: '⚡'
    },
    { 
        name: 'LARGE', 
        price: 65000, 
        id: 'pkg_large',
        specs: { ram: '4', cpu: '200', disk: '50' },
        databases: 3,
        backups: 3,
        emoji: '💪'
    },
    { 
        name: 'PRO', 
        price: 120000, 
        id: 'pkg_pro',
        specs: { ram: '8', cpu: '400', disk: '100' },
        databases: 5,
        backups: 5,
        emoji: '🔥'
    }
];

// Data Packages
const DATA_PACKAGES = [
    { gb: 10, label: 'Standard Pack', price: 10000 },
    { gb: 15, label: 'Bronze Pack', price: 15000 },
    { gb: 20, label: 'Silver Pack', price: 20000 },
    { gb: 25, label: 'Gold Pack', price: 25000 },
    { gb: 50, label: 'Business Pack', price: 50000 }
];



// Generate random password
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}



function sendServerPaymentDetails(sock, chatId, selectedPackage, quotedMsg) {
    const paymentButtons = [
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: `📋 Copy Number: ${SAFE_CONFIG.PAYMENT_NO}`,
                copy_code: SAFE_CONFIG.PAYMENT_NO
            })
        }
    ];

    return sendInteractiveMessage(sock, chatId, {
        text: `✨ *MICKEY BIZ - SERVER ORDER*\n\n📦 *Package:* ${selectedPackage.name}\n💰 *Amount:* TSh ${selectedPackage.price.toLocaleString()}\n\n*SPECIFICATIONS:*\n• 🧠 RAM: ${selectedPackage.specs.ram}GB\n• 🏎️ CPU: ${selectedPackage.specs.cpu}%\n• 💾 DISK: ${selectedPackage.specs.disk}GB\n• 🗄️ Databases: ${selectedPackage.databases}\n• 💾 Backups: ${selectedPackage.backups}\n\n*PAYMENT DETAILS:*\n💳 *Number:* ${SAFE_CONFIG.PAYMENT_NO}\n💵 *Amount:* TSh ${selectedPackage.price.toLocaleString()}\n\n*Baada ya malipo:*\n1. Tuma screenshot ya malipo hapa.\n2. Admin atawasiliana nawe kwa muendelezo.\n3. Hii ni huduma ya server specifications pekee, bila uundaji wa moja kwa moja.\n\n🚀 Powered by Mickey Glitch Tech`,
        footer: SAFE_CONFIG.FOOTER,
        interactiveButtons: paymentButtons
    }, { quoted: quotedMsg });
}

async function askMickeyBiz(query, userName) {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando na panel. Mteja ni ${userName}. Jibu kwa mfumo wa biashara.`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia mwanangu tuwashe mitambo.";
    } catch (e) { 
        return "Nipo hapa! Lipia chap nikuwashie mitambo."; 
    }
}

async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

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


        // ============= SERVER PACKAGE SELECTION (BUTTONS) =============
        if (input === '.halotel server') {
            await sock.sendMessage(chatId, { react: { text: '🖥️', key: m.key } });

            const serverButtons = SERVER_PACKAGES.map(pkg => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: `${pkg.emoji} ${pkg.name} - TSh ${pkg.price.toLocaleString()}`,
                    id: `server_${pkg.id}`
                })
            }));

            const text = `🤖 *${userName} - SERVER HOSTING*\n\nKaribu kwenye huduma yetu ya server hosting. Chagua package ya server specification hapa chini.\n\n*PACKAGES ZINAZOPATIKANA:*\n\n${SERVER_PACKAGES.map(pkg => 
                `${pkg.emoji} *${pkg.name}*\n` +
                `   💰 TSh ${pkg.price.toLocaleString()}\n` +
                `   💾 RAM: ${pkg.specs.ram}GB | CPU: ${pkg.specs.cpu}% | DISK: ${pkg.specs.disk}GB\n` +
                `   📊 Databases: ${pkg.databases} | Backups: ${pkg.backups}\n`
            ).join('\n')}\n\n*✏️ BONYEZA PACKAGE ULIYOIPENDA KUENDELEA NA MALIPO.*\n\n🚀 Powered by Mickey Glitch Tech`;

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: text,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: serverButtons
            }, { quoted: m });
        }

        // ============= HANDLE SERVER PACKAGE SELECTION =============
        if (input.startsWith('server_')) {
            const packageId = input.replace('server_', '');
            const selectedPackage = SERVER_PACKAGES.find(pkg => pkg.id === packageId);
            if (selectedPackage) {
                return await sendServerPaymentDetails(sock, chatId, selectedPackage, m);
            }
            return;
        }

        // ============= DATA PACKAGE HANDLER =============
        if (input.includes('gb') && (input.startsWith('.halotel') || input.includes('data_'))) {
            let gbValue;
            
            if (input.startsWith('data_')) {
                gbValue = parseInt(input.replace('data_', ''));
            } else {
                const gbMatch = input.match(/\d+/);
                gbValue = gbMatch ? parseInt(gbMatch[0]) : null;
            }
            
            if (!gbValue) {
                return await sock.sendMessage(chatId, { text: '❌ Tafadhali chagua kiasi sahihi cha GB.' }, { quoted: m });
            }
            
            const selectedData = DATA_PACKAGES.find(d => d.gb === gbValue);
            if (!selectedData) {
                return await sock.sendMessage(chatId, { text: '❌ Package hiyo haipo. Tumia .halotel kuona orodha.' }, { quoted: m });
            }

            await sock.sendMessage(chatId, { react: { text: '💰', key: m.key } });

            const paymentButtons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: `📋 Copy Number: ${SAFE_CONFIG.PAYMENT_NO}`,
                        copy_code: SAFE_CONFIG.PAYMENT_NO
                    })
                }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                text: `✨ *MICKEY BIZ - DATA ORDER*\n\n📊 *Package:* ${selectedData.gb}GB - ${selectedData.label}\n💰 *Amount:* TSh ${selectedData.price.toLocaleString()}\n📌 *Network:* Halotel\n\n*PAYMENT DETAILS:*\n💳 *Number:* ${SAFE_CONFIG.PAYMENT_NO}\n💵 *Amount:* TSh ${selectedData.price.toLocaleString()}\n\n*After payment:*\n1. Take a screenshot\n2. Send it here\n3. Your data will be activated immediately\n\n📱 *M-Pesa/Tigo/Airtel users:* Send payment to the number above\n\n🚀 Powered by Mickey Glitch Tech`,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: paymentButtons
            }, { quoted: m });
        }

        // ============= MAIN MENU =============
        if (input === '.halotel') {
            await sock.sendMessage(chatId, { react: { text: '🏪', key: m.key } });

            const mainButtons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🖥️ SERVER HOSTING",
                        id: ".halotel server"
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📱 DATA BUNDLES",
                        id: "show_data_menu"
                    })
                }
            ];

            const dataRows = DATA_PACKAGES.map(p => ({
                header: `${p.gb}GB`,
                title: p.label,
                description: `TSh ${p.price.toLocaleString()}`,
                id: `data_${p.gb}`
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: `🏪 *MICKEY GLITCH STORE*\n\nMambo vipi *${userName}*! 👋\n\nKaribu kwenye duka letu. Tunauza:\n\n🖥️ *SERVER HOSTING* - Server specifications na malipo\n📱 *DATA BUNDLES* - Halotel internet packages\n\nChagua huduma unayoitaka kwa kubonyeza button hapo chini:\n\n🚀 Powered by Mickey Glitch Tech`,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: mainButtons
            }, { quoted: m });
        }

        // ============= SHOW DATA MENU =============
        if (input === 'show_data_menu') {
            const dataRows = DATA_PACKAGES.map(p => ({
                header: `${p.gb}GB`,
                title: p.label,
                description: `💰 TSh ${p.price.toLocaleString()}`,
                id: `data_${p.gb}`
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: `📱 *HALOTEL DATA BUNDLES*\n\nChagua package yako ya data hapa chini:\n\n*Prices:*\n${DATA_PACKAGES.map(p => `• ${p.gb}GB - ${p.label}: TSh ${p.price.toLocaleString()}`).join('\n')}\n\nBonyeza package unayoitaka kuendelea na malipo.`,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "📦 SELECT DATA PACKAGE",
                        sections: [{ title: "HALOTEL BUNDLES", rows: dataRows }]
                    })
                }]
            }, { quoted: m });
        }

        // ============= AI CHAT =============
        if (input.length > 2 && !input.startsWith('.') && !input.startsWith('data_') && !input.startsWith('server_')) {
            const aiReply = await askMickeyBiz(input, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

    } catch (e) {
        console.error("Halotel Command Error:", e);
        await sock.sendMessage(chatId, { 
            text: `❌ *ERROR OCCURRED*\n\nSamahani, kuna hitilafu: ${e.message}\n\nTafadhali jaribu tena baadae.` 
        }, { quoted: m });
    }
}

module.exports = {
    halotelCommand
};