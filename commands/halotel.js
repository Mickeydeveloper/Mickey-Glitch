/**
 * halotel.js - Mickey Glitch Business AI with Flutterwave Native Payment Flows
 * Inauza bando na server kwa kutumia Flutterwave Verification Engine (No Webhooks)
 */

const { sendInteractiveMessage } = require('gifted-btns');
const Flutterwave = require('flutterwave-node-v3');
const fs = require('fs');
const path = require('path');
const settings = require('./settings');

// Kuchukua vigezo kutoka kwenye settings.js
const CONFIG = settings.CONFIG || {};
const BANNER = CONFIG.BANNER || 'https://files.catbox.moe/ljabyq.png';
const FOOTER = CONFIG.FOOTER || '🚀 Powered by Mickey Glitch Tech';

// Initialize Flutterwave SDK
const flw = new Flutterwave(CONFIG.FLW_PUBLIC_KEY, CONFIG.FLW_SECRET_KEY);

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

// Functions za kusaidia kuhifadhi data
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

        // 💳 4. SHUGHULIKIA OMBI LA MALIPO YA FLUTTERWAVE (STK PUSH)
        if (lowerInput.startsWith('buy_server_') || lowerInput.startsWith('buy_data_')) {
            let selectedItem, type, packageName;
            
            // Safisha namba ya mteja ianze na 255 (Inaondoa @s.whatsapp.net n.k.)
            const cleanNumber = userJid.split('@')[0].replace(/[^0-9]/g, '').replace(/^0/, '255');

            if (lowerInput.startsWith('buy_server_')) {
                type = 'server';
                selectedItem = SERVER_PACKAGES.find(pkg => pkg.id === input.replace('buy_server_', ''));
                packageName = selectedItem?.name + " Server";
            } else {
                type = 'data';
                selectedItem = DATA_PACKAGES.find(p => p.gb === parseInt(input.replace('buy_data_', '')));
                packageName = `${selectedItem?.gb}GB Data Bundle`;
            }

            if (!selectedItem) return await sock.sendMessage(chatId, { text: "❌ Kifurushi hakikupatikana!" });

            const orderId = 'MCK' + Date.now().toString().slice(-6);
            
            // Hifadhi oda kwenye mfumo kama inasubiri malipo
            saveOrder({ id: orderId, userJid, type, package: packageName, price: selectedItem.price, status: 'pending_payment', createdAt: new Date().toISOString() });

            await sock.sendMessage(chatId, { text: `⏳ *Ombi la Malipo Limeandaliwa:*\n\nTafadhali angalia simu yako ya *${cleanNumber}* sasa hivi. Utaona ujumbe wa kukatwa TSh ${selectedItem.price.toLocaleString()} kwa ajili ya *${packageName}*. Weka PIN kukamilisha.` });

            try {
                // Sukuma STK Push kwenda kwa mteja kupitia Flutterwave
                const response = await flw.MobileMoney.tz({
                    phone_number: cleanNumber,
                    amount: selectedItem.price,
                    currency: 'TZS',
                    email: 'mickeybiz@glitchbot.com',
                    tx_ref: orderId,
                    fullname: userName
                });

                if (response.status !== 'success') {
                    updateOrderStatus(orderId, 'failed');
                    return await sock.sendMessage(chatId, { text: `❌ Ombi limeshindwa kutumwa: ${response.message}` });
                }

                // 🔄 IN-BOT VERIFICATION ENGINE (POLLING)
                // Inakagua kila baada ya sekunde 5 kama mteja amelipa bila kuhitaji Webhooks
                let checks = 0;
                let isPaid = false;

                const checkInterval = setInterval(async () => {
                    checks++;
                    
                    // Uliza server za Flutterwave hali ya muamala kwa kutumia Transaction ID yao
                    const checkStatus = await flw.Transaction.verify({ id: response.data.id });

                    if (checkStatus.data.status === "successful" && checkStatus.data.amount >= selectedItem.price) {
                        isPaid = true;
                        clearInterval(checkInterval); // Zima injini ya kukagua
                        updateOrderStatus(orderId, 'completed');

                        // 🎉 MPE MTEJA HUDUMA KIKAMILIFU APA
                        return await sock.sendMessage(chatId, { 
                            text: `🎉 *MALIPO YAMETHIBITISHWA KIOTOMATIKI!*\n\nAsante *${userName}*, malipo yako ya TSh ${selectedItem.price.toLocaleString()} yamepokelewa.\n\nHuduma yako ya *${packageName}* imewezeshwa sasa hivi kwenye mfumo wetu! 🚀` 
                        });
                    }

                    // Kama dakika 1 imeisha (mizunguko 12 × sekunde 5) na mteja hajaweka PIN
                    if (checks >= 12 && !isPaid) {
                        clearInterval(checkInterval);
                        updateOrderStatus(orderId, 'timeout');
                        return await sock.sendMessage(chatId, { text: `⏱️ *Muda wa Malipo Umeisha:* Ombi lako la malipo ${orderId} limeghairiwa kwa sababu umechelewa kuweka PIN ya simu yako.` });
                    }

                }, 5000); // Inakagua kila sekunde 5

            } catch (err) {
                console.error("Flutterwave API Error:", err);
                updateOrderStatus(orderId, 'error');
                await sock.sendMessage(chatId, { text: `❌ Hitilafu imetokea wakati wa kuunganisha malipo. Jaribu tena.` });
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
