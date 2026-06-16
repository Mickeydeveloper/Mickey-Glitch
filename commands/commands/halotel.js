/**
 * halotel.js - Mickey Glitch Business AI with AzamPay Integration (LIVE & PRODUCTION READY)
 */

const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Imeletwa juu kwa matumizi ya global scope
const settings = require('./settings');

const CONFIG = settings.CONFIG || {};
const BANNER = CONFIG.BANNER || 'https://files.catbox.moe/ljabyq.png';
const FOOTER = CONFIG.FOOTER || '🚀 Powered by Mickey Glitch Tech';

function formatMoney(amount) {
    return `TSh ${Number(amount || 0).toLocaleString('en-US')}`;
}

// AzamPay credentials
const AZAMPAY_ENV = CONFIG.AZAM_ENV?.toString().toUpperCase() === 'PRODUCTION' ? 'LIVE' : 'SANDBOX';
const AZAM_APP_NAME = CONFIG.AZAM_APP_NAME || 'MickeyBiz';
const AZAM_CLIENT_ID = CONFIG.AZAM_CLIENT_ID || '';
const AZAM_CLIENT_SECRET = CONFIG.AZAM_CLIENT_SECRET || '';

// Base URLs kulingana na Mazingira (Environment)
const AUTH_URL = AZAMPAY_ENV === 'LIVE'
    ? 'https://authenticator.azampay.co.tz/app/register'
    : 'https://authenticator-sandbox.azampay.co.tz/app/register';

const BASE_API_URL = AZAMPAY_ENV === 'LIVE'
    ? 'https://api.azampay.co.tz'
    : 'https://sandbox.azampay.co.tz';

// Database
const ORDERS_FILE = path.join(__dirname, '..', 'data', 'halotel_orders.json');
if (!fs.existsSync(path.dirname(ORDERS_FILE))) fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));

// Vifurushi
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

// ==================== LIVE AZAMPAY CLIENT ====================
async function getAzamPayToken() {
    if (!AZAM_CLIENT_ID || !AZAM_CLIENT_SECRET) {
        console.error("❌ AzamPay Error: Client ID au Client Secret haijapatikana kwenye config.");
        return null;
    }

    try {
        const response = await axios.post(AUTH_URL, {
            appName: AZAM_APP_NAME,
            clientId: AZAM_CLIENT_ID,
            clientSecret: AZAM_CLIENT_SECRET
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        });

        if (response.data && response.data.success === true) {
            return response.data.data?.apiKey || response.data.apiKey || null;
        }
        return null;
    } catch (error) {
        console.error("AzamPay Token Auth Error:", error.response?.data || error.message);
        return null;
    }
}

async function createAzamPayClient() {
    const token = await getAzamPayToken();
    if (!token) return null;

    return {
        mnoCheckout: async (params) => {
            try {
                const response = await axios.post(`${BASE_API_URL}/api/v1/azampay/mno/checkout`, {
                    accountNumber: params.accountNumber,
                    amount: params.amount,
                    currency: params.currency || 'TZS',
                    externalId: params.externalId,
                    provider: params.provider
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 20000
                });
                return { success: true, data: response.data };
            } catch (err) {
                console.error("mnoCheckout Error:", err.response?.data || err.message);
                return { success: false, message: err.response?.data?.message || err.message };
            }
        },
        transactionStatus: async (params) => {
            try {
                const response = await axios.get(
                    `${BASE_API_URL}/api/v1/azampay/transaction/status?reference=${params.reference}&bankName=${params.bankName}`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` },
                        timeout: 10000
                    }
                );
                return { status: response.data?.status || 'PENDING', data: response.data };
            } catch (err) {
                return { status: 'PENDING', error: err.message };
            }
        }
    };
}

function extractPhoneNumber(input, userJid) {
    const phoneMatch = input.match(/(0[0-9]{9})|(255[0-9]{9})/);
    if (phoneMatch) {
        let phone = phoneMatch[0];
        if (phone.startsWith('255')) phone = '0' + phone.slice(3);
        return phone;
    }

    let fallbackNumber = userJid.split('@')[0].replace(/[^0-9]/g, '');
    if (fallbackNumber.startsWith('255')) fallbackNumber = '0' + fallbackNumber.slice(3);
    return fallbackNumber;
}

function detectProvider(phoneNumber) {
    const clean = String(phoneNumber || '').replace(/\D/g, '');
    if (/^(061|062)/.test(clean)) return 'Halopesa';
    if (/^(074|075|076|067)/.test(clean)) return 'Mpesa'; // Mpesa / Vodacom prefixes
    if (/^(068|069|078|079)/.test(clean)) return 'Airtel';
    if (/^(065|066|071|072)/.test(clean)) return 'Tigo';
    return 'Halopesa';
}

// ==================== PROCESS LIVE PAYMENT ====================
async function processPayment(sock, chatId, m, phoneNumber, selectedItem, type, packageName, userName) {
    const orderId = 'ORD' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const provider = detectProvider(phoneNumber);

    if (!phoneNumber || phoneNumber.length < 10) {
        return await sock.sendMessage(chatId, {
            text: `❌ *Namba ya simu si sahihi!*\n\nTumia namba halali kama:\n• *.halotel 0615944745 Gb10*\n• *.halotel 0711765335 small*`
        });
    }

    // Jaribu kuunganisha AzamPay Client ya Live
    const azamClient = await createAzamPayClient();

    if (!azamClient) {
        return await sock.sendMessage(chatId, {
            text: `❌ *Hitilafu ya Mfumo wa Malipo (AzamPay)*\n\nTumeshindwa kuanzisha muunganisho wa malipo kwa sasa. Tafadhali thibitisha Client ID/Secret zako kwenye faili la mipangilio (settings.js).`
        });
    }

    saveOrder({ 
        id: orderId, 
        userJid: m.key.participant || m.key.remoteJid,
        phone: phoneNumber,
        type, 
        package: packageName, 
        price: selectedItem.price, 
        status: 'pending', 
        createdAt: new Date().toISOString() 
    });

    await sock.sendMessage(chatId, {
        text: `⏳ *Ombi la malipo linatumwa...*\n\n📞 Namba: *${phoneNumber}*\n📦 Huduma: *${packageName}*\n💰 Kiasi: *${formatMoney(selectedItem.price)}*\n🏦 Mtandao: *${provider}*\n\n👉 *ANGALIA SIMU YAKO SASA hivi kuweka PIN ya malipo.*`
    });

    try {
        const paymentResponse = await azamClient.mnoCheckout({
            accountNumber: phoneNumber,
            amount: selectedItem.price.toString(),
            currency: "TZS",
            externalId: orderId,
            provider: provider
        });

        if (!paymentResponse || paymentResponse.success === false) {
            updateOrderStatus(orderId, 'failed');
            return await sock.sendMessage(chatId, { 
                text: `❌ *Ombi la Malipo Limeshindwa*\n\nSababu: ${paymentResponse?.message || 'Mtandao una shida, jaribu tena.'}` 
            });
        }

        // Kuanza kufuatilia (Polling) muamala kwa sekunde 60 (checks 12 kila baada ya sekunde 5)
        let checks = 0;
        let isPaid = false;

        const checkInterval = setInterval(async () => {
            checks++;

            try {
                const statusCheck = await azamClient.transactionStatus({ 
                    reference: orderId, 
                    bankName: provider 
                });

                if (statusCheck && statusCheck.status === 'SUCCESS') {
                    isPaid = true;
                    clearInterval(checkInterval);
                    updateOrderStatus(orderId, 'completed');

                    return await sock.sendMessage(chatId, {
                        text: `🎉 *MALIPO YAMETHIBITISHWA!*\n\nAsante *${userName}*, malipo ya *${formatMoney(selectedItem.price)}* yamepokelewa kikamilifu.\n\n✅ Huduma ya *${packageName}* imewezeshwa tayari.`
                    });
                } else if (statusCheck && (statusCheck.status === 'FAILED' || statusCheck.status === 'CANCELED')) {
                    isPaid = false;
                    clearInterval(checkInterval);
                    updateOrderStatus(orderId, 'failed');
                    return await sock.sendMessage(chatId, {
                        text: `❌ *Malipo Yamekataliwa!*\n\nMuamala umefeli au umeghairiwa kutoka kwenye simu yako.`
                    });
                }
            } catch (err) {
                // Endelea kusubiri PIN iwekwe
            }

            if (checks >= 12 && !isPaid) {
                clearInterval(checkInterval);
                updateOrderStatus(orderId, 'timeout');
                return await sock.sendMessage(chatId, { 
                    text: `⏱️ *Muda wa Kuweka PIN Umeisha*\n\nOmbi la malipo ${orderId} limeghairiwa kwa sababu umechelewa kuweka PIN.` 
                });
            }
        }, 5000);

    } catch (error) {
        console.error("Payment Process Error:", error);
        updateOrderStatus(orderId, 'error');
        await sock.sendMessage(chatId, { 
            text: `❌ *Hitilafu ya Malipo*\n\nTumeshindwa kukamilisha muamala wako. Jaribu tena.` 
        });
    }
}

// ==================== MAIN COMMAND HANDLER ====================
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
        ).trim();

        const lowerInput = input.toLowerCase();

        // Menu kuu
        if (lowerInput === '.halotel') {
            const mainButtons = [
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🖥️ SERVER HOSTING", id: ".halotel server" }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📱 DATA BUNDLES", id: ".halotel data" }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "💳 HOW TO PAY", id: ".halotel pay" }) }
            ];
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: BANNER },
                text: `🏪 *MICKEY GLITCH STORE*\n\nMambo vipi *${userName}*! 👋\nChagua huduma unayohitaji au angalia mwongozo wa malipo.`,
                footer: FOOTER,
                interactiveButtons: mainButtons
            }, { quoted: m });
        }

        // Menu ya SERVER
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

        if (lowerInput === '.halotel pay') {
            return await sock.sendMessage(chatId, {
                text: `💳 *MWONGOZO WA MALIPO YA LIVE*\n\n1. Chagua kifurushi chako.\n2. Hakikisha simu yako ipo karibu.\n3. Tuma amri: *.halotel [Namba] [Kifurushi]*\n   Mfano: *.halotel 0711765335 small*\n4. Push Notification itatokea kwenye simu yako ya mkononi, weka PIN yako kukamilisha malipo.`
            }, { quoted: m });
        }

        // Menu ya DATA
        if (lowerInput === '.halotel data') {
            const dataRows = DATA_PACKAGES.map(p => ({
                header: `${p.gb}GB Pack`,
                title: p.label,
                description: `💰 TSh ${p.price.toLocaleString()}`,
                id: `buy_data_${p.gb}`
            }));
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: BANNER },
                text: `📱 *HALOTEL INTERNET BUNDLES*\n\nChagua bando lako:`,
                footer: FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({ title: "📦 CHAGUA BANDO", sections: [{ title: "VIFURUSHI", rows: dataRows }] })
                }]
            }, { quoted: m });
        }

        // Handle manual input
        if (lowerInput.startsWith('.halotel') && lowerInput !== '.halotel' && !lowerInput.startsWith('.halotel server') && !lowerInput.startsWith('.halotel data')) {
            let customerPhone = extractPhoneNumber(input, userJid);
            let selectedItem = null;
            let type = null;
            let packageName = null;

            const serverMatch = input.toLowerCase().match(/(small|medium|large)/);
            if (serverMatch) {
                const serverName = serverMatch[1].toUpperCase();
                selectedItem = SERVER_PACKAGES.find(p => p.name === serverName);
                if (selectedItem) {
                    type = 'server';
                    packageName = `${selectedItem.name} Server`;
                }
            }

            const dataMatch = input.match(/[Gg][Bb]\s*(\d+)/);
            if (dataMatch && !selectedItem) {
                const gb = parseInt(dataMatch[1]);
                selectedItem = DATA_PACKAGES.find(p => p.gb === gb);
                if (selectedItem) {
                    type = 'data';
                    packageName = `${selectedItem.gb}GB Data`;
                }
            }

            if (!selectedItem) {
                return await sock.sendMessage(chatId, { 
                    text: `⚠️ *Tafadhali andika kwa usahihi*\n\nMfano:\n• *.halotel 0711765335 small*\n• *.halotel 0711765335 Gb10*` 
                });
            }

            await processPayment(sock, chatId, m, customerPhone, selectedItem, type, packageName, userName);
            return;
        }

        // Handle button clicks
        if (lowerInput.startsWith('buy_server_') || lowerInput.startsWith('buy_data_')) {
            let selectedItem, type, packageName;
            let customerPhone = extractPhoneNumber('', userJid);

            if (lowerInput.startsWith('buy_server_')) {
                type = 'server';
                selectedItem = SERVER_PACKAGES.find(pkg => pkg.id === input.replace('buy_server_', ''));
                packageName = selectedItem?.name + " Server";
            } else {
                type = 'data';
                selectedItem = DATA_PACKAGES.find(p => p.gb === parseInt(input.replace('buy_data_', '')));
                packageName = `${selectedItem?.gb}GB Data`;
            }

            if (!selectedItem) {
                return await sock.sendMessage(chatId, { text: "❌ Kifurushi hakikupatikana!" });
            }

            await processPayment(sock, chatId, m, customerPhone, selectedItem, type, packageName, userName);
            return;
        }

    } catch (e) {
        console.error("Fatal Error:", e);
        await sock.sendMessage(chatId, { text: "❌ Hitilafu ya mfumo. Jaribu tena." });
    }
}

module.exports = {
    halotelCommand,
    SERVER_PACKAGES,
    DATA_PACKAGES,
    extractPhoneNumber,
    detectProvider
};
