/**
 * halotel.js - Mickey Glitch Business AI with AzamPay Integration
 * Improved: Auto-detect number from button click OR manual input
 */

const { sendInteractiveMessage } = require('gifted-btns');
const azampaySDK = require('azampay');
const fs = require('fs');
const path = require('path');
const settings = require('./settings');

const CONFIG = settings.CONFIG || {};
const BANNER = CONFIG.BANNER || 'https://files.catbox.moe/ljabyq.png';
const FOOTER = CONFIG.FOOTER || '🚀 Powered by Mickey Glitch Tech';

const AZAMPAY_ENV = CONFIG.AZAM_ENV?.toString().toUpperCase() === 'PRODUCTION' ? 'LIVE' : 'SANDBOX';
const AZAMPAY_API_KEY = CONFIG.AZAM_API_KEY || '';

async function createAzamPayClient() {
    const getToken = azampaySDK.getToken || azampaySDK.default?.getToken;
    if (!getToken) throw new Error('AzamPay SDK not available');

    const tokenResponse = await getToken({
        appName: CONFIG.AZAM_APP_NAME || 'MickeyBiz',
        clientId: CONFIG.AZAM_CLIENT_ID || 'your-client-id',
        clientSecret: CONFIG.AZAM_CLIENT_SECRET || 'your-client-secret',
        apiKey: AZAMPAY_API_KEY,
        env: AZAMPAY_ENV
    });

    if (!tokenResponse?.success) throw new Error(tokenResponse?.message || 'Token acquisition failed');
    return tokenResponse;
}

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

// ==================== HELPER: EXTRACT PHONE NUMBER ====================
function extractPhoneNumber(input, userJid) {
    // Kama kuna namba katika input (kwa mfano ".halotel 0615944745 Gb10")
    const phoneMatch = input.match(/(0[0-9]{9})|(255[0-9]{9})/);
    if (phoneMatch) {
        let phone = phoneMatch[0];
        // Badilisha 255... kuwa 0...
        if (phone.startsWith('255')) phone = '0' + phone.slice(3);
        return phone;
    }
    
    // Kama hakuna namba kwenye input, tumia namba ya mteja kutoka kwa JID
    let fallbackNumber = userJid.split('@')[0].replace(/[^0-9]/g, '');
    if (fallbackNumber.startsWith('255')) fallbackNumber = '0' + fallbackNumber.slice(3);
    return fallbackNumber;
}

function detectProvider(phoneNumber) {
    if (phoneNumber.startsWith('061') || phoneNumber.startsWith('062')) return 'Halopesa';
    if (phoneNumber.startsWith('074') || phoneNumber.startsWith('075') || phoneNumber.startsWith('076')) return 'Mpesa';
    if (phoneNumber.startsWith('078') || phoneNumber.startsWith('068') || phoneNumber.startsWith('069')) return 'Airtel';
    if (phoneNumber.startsWith('065') || phoneNumber.startsWith('067') || phoneNumber.startsWith('071')) return 'Tigo';
    return 'Tigo'; // default
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
        
        // Kama ni ".halotel" pekee - onyesha menu
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
                text: `📱 *HALOTEL INTERNET BUNDLES*\n\nChagua bando lako utumiwe push notification ya malipo:`,
                footer: FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({ title: "📦 CHAGUA BANDO", sections: [{ title: "VIFURUSHI", rows: dataRows }] })
                }]
            }, { quoted: m });
        }

        // SHUGHULIKIA UNUNUZI (kwa button au kwa kuandika kwa mkono)
        // Inasaidia: ".halotel 0615944745 Gb10" au ".halotel 0615944745 server small"
        if (lowerInput.startsWith('.halotel')) {
            // Extract phone number kutoka kwa input
            let customerPhone = extractPhoneNumber(input, userJid);
            
            // Determine package from input
            let selectedItem = null;
            let type = null;
            let packageName = null;
            
            // Check if it's a data package (Gb10, Gb20, Gb50)
            const dataMatch = input.match(/[Gg][Bb]\s*(\d+)/);
            if (dataMatch) {
                const gb = parseInt(dataMatch[1]);
                selectedItem = DATA_PACKAGES.find(p => p.gb === gb);
                if (selectedItem) {
                    type = 'data';
                    packageName = `${selectedItem.gb}GB Data`;
                }
            }
            
            // Check if it's a server package (small, medium, large)
            const serverMatch = input.toLowerCase().match(/(small|medium|large)/);
            if (serverMatch && !selectedItem) {
                const serverName = serverMatch[1].toUpperCase();
                selectedItem = SERVER_PACKAGES.find(p => p.name === serverName);
                if (selectedItem) {
                    type = 'server';
                    packageName = `${selectedItem.name} Server`;
                }
            }
            
            // If no package specified via text, show menu
            if (!selectedItem) {
                const mainButtons = [
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🖥️ SERVER HOSTING", id: ".halotel server" }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📱 DATA BUNDLES", id: ".halotel data" }) }
                ];
                return await sendInteractiveMessage(sock, chatId, {
                    text: `⚠️ *Tafadhali eleza kifurushi*\n\nMfano:\n• *.halotel 0615944745 Gb10*\n• *.halotel 0615944745 server small*`,
                    interactiveButtons: mainButtons
                }, { quoted: m });
            }
            
            // Proceed with payment
            await processPayment(sock, chatId, m, customerPhone, selectedItem, type, packageName, userName);
            return;
        }
        
        // Kwa button clicks (buy_server_xxx au buy_data_xxx)
        if (lowerInput.startsWith('buy_server_') || lowerInput.startsWith('buy_data_')) {
            let selectedItem, type, packageName;
            let customerPhone = extractPhoneNumber('', userJid); // Tumia namba ya mteja kutoka kwa JID
            
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
        console.error("Fatal Error in Halotel Command:", e);
        await sock.sendMessage(chatId, { text: "❌ Hitilafu ya mfumo. Jaribu tena." });
    }
}

// ==================== PROCESS PAYMENT FUNCTION ====================
async function processPayment(sock, chatId, m, phoneNumber, selectedItem, type, packageName, userName) {
    const orderId = 'ORD' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const provider = detectProvider(phoneNumber);
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 10) {
        return await sock.sendMessage(chatId, { 
            text: `❌ *Namba ya simu si sahihi!*\n\nTafadhali tumia namba sahihi kama:\n• *.halotel 0615944745 Gb10*\nAu bonyeza button kwa namba yako ya simu iliyosajiliwa.` 
        });
    }
    
    // Save order
    saveOrder({ 
        id: orderId, 
        userJid: m.key.participant || m.key.remoteJid,
        phone: phoneNumber,
        type, 
        package: packageName, 
        price: selectedItem.price, 
        status: 'pending_payment', 
        createdAt: new Date().toISOString() 
    });
    
    await sock.sendMessage(chatId, { 
        text: `⏳ *Ombi la Malipo Linatayarishwa...*\n\n📞 Namba: *${phoneNumber}*\n📦 Kifurushi: *${packageName}*\n💰 Kiasi: *TSh ${selectedItem.price.toLocaleString()}*\n🏦 Mtoa Huduma: *${provider}*\n\nTafadhali angalia simu yako na uweke PIN kukamilisha malipo.` 
    });
    
    try {
        const azamPayClient = await createAzamPayClient();
        
        const paymentResponse = await azamPayClient.mnoCheckout({
            accountNumber: phoneNumber,
            amount: selectedItem.price.toString(),
            currency: "TZS",
            externalId: orderId,
            provider: provider
        });
        
        if (!paymentResponse || paymentResponse.success === false) {
            updateOrderStatus(orderId, 'failed');
            return await sock.sendMessage(chatId, { 
                text: `❌ *Ombi la Malipo Limeshindwa*\n\n${paymentResponse?.message || 'Huduma ya AzamPay haipatikani kwa sasa. Jaribu tena baada ya dakika chache.'}` 
            });
        }
        
        // Start polling for payment confirmation
        let checks = 0;
        let isPaid = false;
        
        const checkInterval = setInterval(async () => {
            checks++;
            
            try {
                const statusCheck = await azamPayClient.transactionStatus({ 
                    reference: orderId, 
                    bankName: provider 
                });
                
                if (statusCheck && statusCheck.status === 'SUCCESS') {
                    isPaid = true;
                    clearInterval(checkInterval);
                    updateOrderStatus(orderId, 'completed');
                    
                    return await sock.sendMessage(chatId, { 
                        text: `🎉 *MALIPO YAMETHIBITISHWA!*\n\nAsante *${userName}*, malipo yako ya TSh ${selectedItem.price.toLocaleString()} yamepokelewa kwa namba ${phoneNumber}.\n\n✅ Huduma yako ya *${packageName}* imewezeshwa kikamilifu!\n🚀 Powered by Mickey Glitch Tech` 
                    });
                }
            } catch (err) {
                // Still waiting for payment
            }
            
            // Timeout after 60 seconds (12 checks * 5 seconds)
            if (checks >= 12 && !isPaid) {
                clearInterval(checkInterval);
                updateOrderStatus(orderId, 'timeout');
                return await sock.sendMessage(chatId, { 
                    text: `⏱️ *Muda wa Malipo Umeisha*\n\nOmbi la malipo ${orderId} limeghairiwa kwa sababu hukuweka PIN kwa muda uliopangwa.\n\nTafadhali tuma ombi jipya.` 
                });
            }
        }, 5000);
        
    } catch (error) {
        console.error("AzamPay Error:", error);
        updateOrderStatus(orderId, 'error');
        await sock.sendMessage(chatId, { 
            text: `❌ *Hitilafu ya Kiufundi*\n\nTumeshindwa kuunganisha na AzamPay. Hakikisha:\n1️⃣ API keys zako ni sahihi\n2️⃣ Mtandao umeunganishwa\n3️⃣ Jaribu tena baada ya dakika chache` 
        });
    }
}

module.exports = {
    halotelCommand,
    SERVER_PACKAGES,
    DATA_PACKAGES,
    extractPhoneNumber,
    detectProvider
};