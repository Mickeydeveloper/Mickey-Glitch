/**
 * halotel.js - Mickey Glitch Business AI with AzamPay Integration
 * Fixed: No API Key required - uses only App Name, Client ID, Client Secret
 */

const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');
const settings = require('./settings');

const CONFIG = settings.CONFIG || {};
const BANNER = CONFIG.BANNER || 'https://files.catbox.moe/ljabyq.png';
const FOOTER = CONFIG.FOOTER || '🚀 Powered by Mickey Glitch Tech';

// AzamPay credentials - NO API KEY NEEDED
const AZAMPAY_ENV = CONFIG.AZAM_ENV?.toString().toUpperCase() === 'PRODUCTION' ? 'LIVE' : 'SANDBOX';
const AZAM_APP_NAME = CONFIG.AZAM_APP_NAME || 'MickeyBiz';
const AZAM_CLIENT_ID = CONFIG.AZAM_CLIENT_ID || '';
const AZAM_CLIENT_SECRET = CONFIG.AZAM_CLIENT_SECRET || '';

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

// ==================== AZAMPAY WITHOUT API KEY ====================
async function getAzamPayToken() {
    // Kama hakuna client credentials, tumia simulation mode
    if (!AZAM_CLIENT_ID || !AZAM_CLIENT_SECRET) {
        console.log("⚠️ AzamPay credentials missing - using simulation mode");
        return null;
    }
    
    const axios = require('axios');
    
    try {
        const response = await axios.post(
            AZAMPAY_ENV === 'LIVE' 
                ? 'https://authenticator-sandbox.azampay.co.tz/app/register'  // Sandbox
                : 'https://authenticator-sandbox.azampay.co.tz/app/register', // Same for sandbox
            {
                appName: AZAM_APP_NAME,
                clientId: AZAM_CLIENT_ID,
                clientSecret: AZAM_CLIENT_SECRET
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        if (response.data && response.data.success === true) {
            return {
                success: true,
                data: response.data,
                token: response.data.data?.apiKey || response.data.apiKey
            };
        }
        
        console.log("AzamPay response:", response.data);
        return null;
        
    } catch (error) {
        console.error("AzamPay token error:", error.response?.data || error.message);
        return null;
    }
}

async function createAzamPayClient() {
    // Kama hakuna credentials, return null (tutatumia simulation)
    if (!AZAM_CLIENT_ID || !AZAM_CLIENT_SECRET) {
        return null;
    }
    
    const tokenData = await getAzamPayToken();
    if (!tokenData || !tokenData.success) {
        console.log("⚠️ Failed to get AzamPay token - using simulation");
        return null;
    }
    
    return {
        token: tokenData.token,
        mnoCheckout: async (params) => {
            const axios = require('axios');
            try {
                const response = await axios.post(
                    AZAMPAY_ENV === 'LIVE'
                        ? 'https://sandbox.azampay.co.tz/api/v1/azampay/mno/checkout'  // Sandbox endpoint
                        : 'https://sandbox.azampay.co.tz/api/v1/azampay/mno/checkout',
                    {
                        accountNumber: params.accountNumber,
                        amount: params.amount,
                        currency: params.currency || 'TZS',
                        externalId: params.externalId,
                        provider: params.provider
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                return { success: true, data: response.data };
            } catch (err) {
                console.error("mnoCheckout error:", err.response?.data || err.message);
                return { success: false, message: err.response?.data?.message || err.message };
            }
        },
        transactionStatus: async (params) => {
            const axios = require('axios');
            try {
                const response = await axios.get(
                    `${AZAMPAY_ENV === 'LIVE' ? 'https://sandbox.azampay.co.tz' : 'https://sandbox.azampay.co.tz'}/api/v1/azampay/transaction/status?reference=${params.reference}&bankName=${params.bankName}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.token}`
                        }
                    }
                );
                return { status: response.data?.status || 'PENDING', data: response.data };
            } catch (err) {
                return { status: 'PENDING', error: err.message };
            }
        }
    };
}

// Extract phone number
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
    if (phoneNumber.startsWith('061') || phoneNumber.startsWith('062')) return 'Halopesa';
    if (phoneNumber.startsWith('074') || phoneNumber.startsWith('075') || phoneNumber.startsWith('076')) return 'Mpesa';
    if (phoneNumber.startsWith('078') || phoneNumber.startsWith('068') || phoneNumber.startsWith('069')) return 'Airtel';
    if (phoneNumber.startsWith('065') || phoneNumber.startsWith('067') || phoneNumber.startsWith('071')) return 'Tigo';
    if (phoneNumber.startsWith('071') || phoneNumber.startsWith('076')) return 'Vodacom';
    return 'Tigo';
}

// ==================== PROCESS PAYMENT ====================
async function processPayment(sock, chatId, m, phoneNumber, selectedItem, type, packageName, userName) {
    const orderId = 'ORD' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const provider = detectProvider(phoneNumber);
    
    if (!phoneNumber || phoneNumber.length < 10) {
        return await sock.sendMessage(chatId, { 
            text: `❌ *Namba ya simu si sahihi!*\n\nTafadhali tumia namba sahihi kama:\n• *.halotel 0615944745 Gb10*\n• *.halotel 0711765335 small*` 
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
    
    // Jaribu kuunda AzamPay client
    const azamClient = await createAzamPayClient();
    
    // Kama AzamPay haipatikani (no credentials or error), tumia simulation
    if (!azamClient) {
        await sock.sendMessage(chatId, { 
            text: `⚠️ *HUDUMA YA MALIPO INAPATIKANA KWA SIMULATION MODE*\n\n📞 Namba: *${phoneNumber}*\n📦 Kifurushi: *${packageName}*\n💰 Kiasi: *TSh ${selectedItem.price.toLocaleString()}*\n\n🟡 Malipo yanachakatwa kwa simulation...\n\n✅ Kwa simulation, malipo yanakubaliwa moja kwa moja!` 
        });
        
        // Auto-confirm after 3 seconds
        setTimeout(async () => {
            updateOrderStatus(orderId, 'completed');
            await sock.sendMessage(chatId, { 
                text: `🎉 *MALIPO YAMETHIBITISHWA (SIMULATION)!*\n\nAsante *${userName}*, malipo yako ya TSh ${selectedItem.price.toLocaleString()} yamepokelewa kwa namba ${phoneNumber}.\n\n✅ Huduma yako ya *${packageName}* imewezeshwa kikamilifu!\n🆔 Order ID: ${orderId}` 
            });
        }, 3000);
        return;
    }
    
    // Kama AzamPay ipo, tumia real payment
    await sock.sendMessage(chatId, { 
        text: `⏳ *Ombi la Malipo Linatayarishwa...*\n\n📞 Namba: *${phoneNumber}*\n📦 Kifurushi: *${packageName}*\n💰 Kiasi: *TSh ${selectedItem.price.toLocaleString()}*\n🏦 Mtoa Huduma: *${provider}*\n\nTafadhali angalia simu yako na uweke PIN kukamilisha malipo.` 
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
                text: `❌ *Ombi la Malipo Limeshindwa*\n\n${paymentResponse?.message || 'Jaribu tena baada ya dakika chache.'}` 
            });
        }
        
        // Poll for payment confirmation
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
                        text: `🎉 *MALIPO YAMETHIBITISHWA!*\n\nAsante *${userName}*, malipo yako ya TSh ${selectedItem.price.toLocaleString()} yamepokelewa.\n\n✅ Huduma yako ya *${packageName}* imewezeshwa kikamilifu!` 
                    });
                }
            } catch (err) {
                // Still waiting
            }
            
            if (checks >= 12 && !isPaid) {
                clearInterval(checkInterval);
                updateOrderStatus(orderId, 'timeout');
                return await sock.sendMessage(chatId, { 
                    text: `⏱️ *Muda wa Malipo Umeisha*\n\nOmbi ${orderId} limeghairiwa. Tafadhali tuma ombi jipya.` 
                });
            }
        }, 5000);
        
    } catch (error) {
        console.error("Payment error:", error);
        updateOrderStatus(orderId, 'error');
        await sock.sendMessage(chatId, { 
            text: `❌ *Hitilafu ya Malipo*\n\nTumeshindwa kuchakata malipo yako. Jaribu tena.` 
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
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📱 DATA BUNDLES", id: ".halotel data" }) }
            ];
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: BANNER },
                text: `🏪 *MICKEY GLITCH STORE*\n\nMambo vipi *${userName}*! 👋\nChagua huduma unayohitaji.`,
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
            
            // Check for server package
            const serverMatch = input.toLowerCase().match(/(small|medium|large)/);
            if (serverMatch) {
                const serverName = serverMatch[1].toUpperCase();
                selectedItem = SERVER_PACKAGES.find(p => p.name === serverName);
                if (selectedItem) {
                    type = 'server';
                    packageName = `${selectedItem.name} Server`;
                }
            }
            
            // Check for data package
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
                    text: `⚠️ *Tafadhali andika kwa usahihi*\n\nMfano:\n• *.halotel 0711765335 small*\n• *.halotel 0711765335 medium*\n• *.halotel 0711765335 large*\n• *.halotel 0711765335 Gb10*` 
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