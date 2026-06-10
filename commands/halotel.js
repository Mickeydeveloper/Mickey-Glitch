/**
 * halotel.js - Mickey Glitch Business AI with AzamPay Integration
 * Inauza bando na server kwa kutumia AzamPay Push Engine (No Webhooks)
 */

const { sendInteractiveMessage } = require('gifted-btns');
const azampaySDK = require('azampay');
const fs = require('fs');
const path = require('path');
const settings = require('./settings');

// Kuchukua vigezo kutoka kwenye settings.js
const CONFIG = settings.CONFIG || {};
const BANNER = CONFIG.BANNER || 'https://files.catbox.moe/ljabyq.png';
const FOOTER = CONFIG.FOOTER || '🚀 Powered by Mickey Glitch Tech';

// AzamPay environment helper
const AZAMPAY_ENV = CONFIG.AZAM_ENV && CONFIG.AZAM_ENV.toString().toUpperCase() === 'PRODUCTION' ? 'LIVE' : 'SANDBOX';
const AZAMPAY_API_KEY = CONFIG.AZAM_API_KEY || '';

async function createAzamPayClient() {
    const getToken = azampaySDK.getToken || azampaySDK.default?.getToken;
    if (!getToken) {
        throw new Error('AzamPay SDK exports are not available. Ensure azampay package is installed correctly.');
    }

    const tokenResponse = await getToken({
        appName: CONFIG.AZAM_APP_NAME || 'MickeyBiz',
        clientId: CONFIG.AZAM_CLIENT_ID || 'your-client-id',
        clientSecret: CONFIG.AZAM_CLIENT_SECRET || 'your-client-secret',
        apiKey: AZAMPAY_API_KEY,
        env: AZAMPAY_ENV
    });

    if (!tokenResponse || tokenResponse.success !== true) {
        const message = tokenResponse?.message || 'Unable to acquire AzamPay token';
        throw new Error(message);
    }

    return tokenResponse;
}

// Database Setup ya JSON kufuatilia Oda
const ORDERS_FILE = path.join(__dirname, '..', 'data', 'halotel_orders.json');
if (!fs.existsSync(path.dirname(ORDERS_FILE))) fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));

// Vifurushi vya Biashara
const SERVER_PACKAGES = [
    { name: 'SMALL', price: 3000, id: 'pkg_small', specs: '1GB RAM | 10GB Disk' },
    { name: 'MEDIUM', price: 5000, id: 'pkg_medium', specs: '3GB RAM | 25GB Disk' },
    { name: 'LARGE', price: 6500, id: 'pkg_large', specs: '4GB RAM | 50GB Disk' }
];

const DATA_PACKAGES = [
    { gb: 10, price: 10000, label: 'Standard Pack' },
    { gb: 20, price: 20000, label: 'Silver Pack' },
    { gb: 50, price: 50000, label: 'Business Pack' }
];

// Helper Functions
function saveOrder(order) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
    orders.push(order);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function updateOrderStatus(orderId, status) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
        orders[index].status = status;
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    }
}

// =================================================================
// MAIN BOT COMMAND HANDLER
// =================================================================
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // Kusoma amri zilizoandikwa au kubonyezwa kwenye button
        let input = (
            m.message?.conversation || 
            m.message?.extendedTextMessage?.text || 
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).trim();

        const lowerInput = input.toLowerCase();
        if (lowerInput === 'halotel') input = '.halotel';

        // 🏪 1. MENU KUU YA DUKA
        if (lowerInput === '.halotel') {
            const mainButtons = [
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🖥️ SERVER HOSTING", id: ".halotel server" }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📱 DATA BUNDLES", id: ".halotel data" }) }
            ];
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: BANNER },
                text: `🏪 *MICKEY GLITCH STORE*\n\nMambo vipi *${userName}*! 👋\nChagua huduma unayohitaji hapa chini na ulipie papo hapo kwa namba yako ya simu:`,
                footer: FOOTER,
                interactiveButtons: mainButtons
            }, { quoted: m });
        }

        // 🖥️ 2. MENU YA SERVER
        if (lowerInput === '.halotel server') {
            const serverButtons = SERVER_PACKAGES.map(pkg => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ display_text: `⚡ ${pkg.name} - TSh ${pkg.price}`, id: `buy_server_${pkg.id}` })
            }));
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: BANNER },
                text: `🖥️ *CHAGUA SERVER HOSTING:*\n\n` + SERVER_PACKAGES.map(p => `▪️ *${p.name}*: TSh ${p.price} (${p.specs})`).join('\n'),
                footer: FOOTER,
                interactiveButtons: serverButtons
            }, { quoted: m });
        }

        // 📱 3. MENU YA BANDO LA DATA
        if (lowerInput === '.halotel data') {
            const dataRows = DATA_PACKAGES.map(p => ({
                header: `${p.gb}GB Pack`,
                title: p.label,
                description: `💰 TSh ${p.price.toLocaleString()}`,
                id: `buy_data_${p.gb}`
            }));
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: BANNER },
                text: `📱 *HALOTEL INTERNET BUNDLES*\n\nChagua bando lako utumiwe push notification ya malipo:`,
                footer: FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({ title: "📦 CHAGUA BANDO", sections: [{ title: "VIFURUSHI", rows: dataRows }] })
                }]
            }, { quoted: m });
        }

        // 💳 4. SHUGHULIKIA OMBI LA MALIPO YA AZAMPAY (MNO CHECKOUT)
        if (lowerInput.startsWith('buy_server_') || lowerInput.startsWith('buy_data_')) {
            let selectedItem, type, packageName;
            
            // Safisha namba ya mteja (Inaondoa herufi zote, inabakiza namba safi tu kama 0612130873)
            let cleanNumber = userJid.split('@')[0].replace(/[^0-9]/g, '');
            if (cleanNumber.startsWith('255')) {
                cleanNumber = '0' + cleanNumber.slice(3); // AzamPay wanapendelea muundo wa 0xxx...
            }

            if (lowerInput.startsWith('buy_server_')) {
                type = 'server';
                selectedItem = SERVER_PACKAGES.find(pkg => pkg.id === input.replace('buy_server_', ''));
                packageName = selectedItem?.name + " Server";
            } else {
                type = 'data';
                selectedItem = DATA_PACKAGES.find(p => p.gb === parseInt(input.replace('buy_data_', '')));
                packageName = `${selectedItem?.gb}GB Data`;
            }

            if (!selectedItem) return await sock.sendMessage(chatId, { text: "❌ Kifurushi hakikupatikana!" });

            const orderId = 'ORD' + Date.now().toString().slice(-6);
            
            // Tambua mtandao wa mteja kiotomatiki kwa ajili ya AzamPay Provider map
            let providerName = 'Tigo'; 
            if (cleanNumber.startsWith('061') || cleanNumber.startsWith('062')) providerName = 'Halopesa';
            else if (cleanNumber.startsWith('074') || cleanNumber.startsWith('075') || cleanNumber.startsWith('076')) providerName = 'Mpesa';
            else if (cleanNumber.startsWith('078') || cleanNumber.startsWith('068') || cleanNumber.startsWith('069')) providerName = 'Airtel';
            else if (cleanNumber.startsWith('065') || cleanNumber.startsWith('067') || cleanNumber.startsWith('071')) providerName = 'Tigo';

            // Hifadhi oda kwenye mfumo kama inasubiri malipo
            saveOrder({ id: orderId, userJid, type, package: packageName, price: selectedItem.price, status: 'pending_payment', createdAt: new Date().toISOString() });

            await sock.sendMessage(chatId, { text: `⏳ *AzamPay Request:*\n\nTafadhali angalia simu yako ya *${cleanNumber}* sasa hivi. Utaona ujumbe wa kuweka PIN ili kulipia TSh ${selectedItem.price.toLocaleString()} kwa ajili ya *${packageName}*.` });

            try {
                const azamPayClient = await createAzamPayClient();

                // Sukuma STK Push kwenda kwa mteja kupitia package ya 'azampay'
                const response = await azamPayClient.mnoCheckout({
                    accountNumber: cleanNumber,
                    amount: selectedItem.price.toString(), // Package ya azampay inataka amount kama string
                    currency: "TZS",
                    externalId: orderId,
                    provider: providerName
                });

                if (!response || response.success === false) {
                    updateOrderStatus(orderId, 'failed');
                    return await sock.sendMessage(chatId, { text: `❌ Ombi limeshindwa: ${response?.message || 'Mvamio wa mtandao'}` });
                }

                // 🔄 IN-BOT VERIFICATION ENGINE (POLLING)
                // Inatumia ile function ya azampay.transactionStatus kuuliza kama mteja amelipa kila baada ya sekunde 5
                let checks = 0;
                let isPaid = false;

                const checkInterval = setInterval(async () => {
                    checks++;
                    
                    try {
                        // Kagua hali ya muamala AzamPay kwa kutumia externalId (orderId)
                        const checkStatus = await azamPayClient.transactionStatus({ reference: orderId, bankName: providerName });

                        // AzamPay inarudisha status kama 'SUCCESS' muamala ukikamilika
                        if (checkStatus && checkStatus.status === 'SUCCESS') {
                            isPaid = true;
                            clearInterval(checkInterval);
                            updateOrderStatus(orderId, 'completed');

                            // 🎉 MPE MTEJA HUDUMA KIKAMILIFU HAPA
                            return await sock.sendMessage(chatId, { 
                                text: `🎉 *MALIPO YAMETHIBITISHWA KIOTOMATIKI!*\n\nAsante *${userName}*, malipo yako ya TSh ${selectedItem.price.toLocaleString()} yamepokelewa.\n\nHuduma yako ya *${packageName}* imewezeshwa sasa hivi kwenye mfumo wetu! 🚀` 
                            });
                        }
                    } catch (checkErr) {
                        console.log("Kusubiri malipo..."); // Log ndogo ya server kama haijatiki bado
                    }

                    // Kama sekunde 60 zimeisha (checks 12 × sekunde 5) na mteja hajaweka PIN
                    if (checks >= 12 && !isPaid) {
                        clearInterval(checkInterval);
                        updateOrderStatus(orderId, 'timeout');
                        return await sock.sendMessage(chatId, { text: `⏱️ *Muda Umeisha:* Ombi la malipo ${orderId} limeghairiwa kwa sababu umechelewa kuweka PIN ya simu yako.` });
                    }

                }, 5000); // Inakagua kila sekunde 5

            } catch (err) {
                console.error("AzamPay API Error:", err);
                updateOrderStatus(orderId, 'error');
                await sock.sendMessage(chatId, { text: `❌ Hitilafu imetokea wakati wa kuunganisha AzamPay. Hakikisha akaunti yako ipo sawa.` });
            }
            return;
        }

    } catch (e) {
        console.error("Fatal Error in Halotel Command:", e);
    }
}

module.exports = {
    halotelCommand,
    SERVER_PACKAGES,
    DATA_PACKAGES
};
