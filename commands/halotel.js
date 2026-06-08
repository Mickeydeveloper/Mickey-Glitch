/**
 * halotel.js - Mickey Glitch Business AI with WhatsApp Native Payment Flows
 * UONGOZI: Inauza bando, server specs, na data bundles kwa Interactive Buttons & Flows
 * TAREHE: Imeboreshwa na WhatsApp native_flow pamoja na Button Listeners madhubuti
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');
const settings = require('./settings');
const fs = require('fs');
const path = require('path');

const CONFIG = settings.CONFIG;

const SAFE_CONFIG = CONFIG || {
    PRICE_PER_GB: 1000,
    PAYMENT_NO: '0615944741',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
    ADMIN_NUMBER: '255615944741',
    API_KEY: 'your_api_key_here'
};

// ============= DATABASE SETUP =============
const ORDERS_DB_PATH = path.join(__dirname, '..', 'data', 'halotel_orders.json');
const USERS_DB_PATH = path.join(__dirname, '..', 'data', 'halotel_users.json');
const TRANSACTIONS_DB_PATH = path.join(__dirname, '..', 'data', 'halotel_transactions.json');

function initDatabase() {
    if (!fs.existsSync(path.dirname(ORDERS_DB_PATH))) {
        fs.mkdirSync(path.dirname(ORDERS_DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(ORDERS_DB_PATH)) fs.writeFileSync(ORDERS_DB_PATH, JSON.stringify([], null, 2));
    if (!fs.existsSync(USERS_DB_PATH)) fs.writeFileSync(USERS_DB_PATH, JSON.stringify([], null, 2));
    if (!fs.existsSync(TRANSACTIONS_DB_PATH)) fs.writeFileSync(TRANSACTIONS_DB_PATH, JSON.stringify([], null, 2));
}

function saveOrder(order) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
    orders.push(order);
    fs.writeFileSync(ORDERS_DB_PATH, JSON.stringify(orders, null, 2));
}

function getUserOrders(userJid) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
    return orders.filter(order => order.userJid === userJid);
}

function updateOrderStatus(orderId, status, paymentScreenshot = null) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = status;
        if (paymentScreenshot) {
            orders[orderIndex].paymentScreenshot = paymentScreenshot;
            orders[orderIndex].paymentDate = new Date().toISOString();
        }
        if (status === 'completed') {
            orders[orderIndex].completedAt = new Date().toISOString();
        }
        fs.writeFileSync(ORDERS_DB_PATH, JSON.stringify(orders, null, 2));
        return true;
    }
    return false;
}

function saveTransaction(transaction) {
    const transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_DB_PATH));
    transactions.push(transaction);
    fs.writeFileSync(TRANSACTIONS_DB_PATH, JSON.stringify(transactions, null, 2));
}

function generateOrderId() {
    return 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Packages
const SERVER_PACKAGES = [
    { name: 'SMALL', price: 3000, id: 'pkg_small', specs: { ram: '1', cpu: '10', disk: '10' }, databases: 1, backups: 1, emoji: '🚀', setupTime: '30 mins' },
    { name: 'MEDIUM', price: 5000, id: 'pkg_medium', specs: { ram: '3', cpu: '100', disk: '25' }, databases: 2, backups: 2, emoji: '⚡', setupTime: '30 mins' },
    { name: 'LARGE', price: 6500, id: 'pkg_large', specs: { ram: '4', cpu: '200', disk: '50' }, databases: 3, backups: 3, emoji: '💪', setupTime: '30 mins' },
    { name: 'PRO', price: 10000, id: 'pkg_pro', specs: { ram: '8', cpu: '400', disk: '100' }, databases: 5, backups: 5, emoji: '🔥', setupTime: '30 mins' }
];

const DATA_PACKAGES = [
    { gb: 10, label: 'Standard Pack', price: 10000, deliveryTime: '5 minutes' },
    { gb: 15, label: 'Bronze Pack', price: 15000, deliveryTime: '5 minutes' },
    { gb: 20, label: 'Silver Pack', price: 20000, deliveryTime: '3 minutes' },
    { gb: 25, label: 'Gold Pack', price: 25000, deliveryTime: '3 minutes' },
    { gb: 50, label: 'Business Pack', price: 50000, deliveryTime: '10 minutes' }
];

// ========== PENDING REQUEST STORAGE ==========
const pendingRequests = new Map();

function storePendingRequest(chatId, userName, packageInfo, specs) {
    pendingRequests.set(chatId, { userName, package: packageInfo, specs, step: 'awaiting_email', timestamp: Date.now() });
    setTimeout(() => { if (pendingRequests.has(chatId)) pendingRequests.delete(chatId); }, 10 * 60 * 1000);
}
function getPendingRequest(chatId) { return pendingRequests.get(chatId) || null; }
function removePendingRequest(chatId) { pendingRequests.delete(chatId); }

const PANEL_PACKAGES = SERVER_PACKAGES;
const BANNER = SAFE_CONFIG.BANNER;
const FOOTER = SAFE_CONFIG.FOOTER;
const OWNER_NUMBER = settings.ownerNumber || '255715944741';
const PANEL_URL = 'https://panel.example.com';

async function askMickeyBiz(query, userName) {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando na panel. Mteja ni ${userName}. Jibu kwa mfumo wa biashara ya kibongo kwa ufasaha lakini kifupi mno.`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia mwanangu tuwashe mitambo.";
    } catch (e) { 
        return "Mambo vipi boss! Lipia chap nikuwashie huduma yako sasa hivi."; 
    }
}

// ============= NATIVE FLOW BUTTON GENERATORS =============

// 1. review_and_pay Native Flow
function sendNativeReviewAndPay(sock, chatId, order, itemName, description, quotedMsg) {
    const flowParams = {
        name: "review_and_pay",
        parameters: {
            currency: "TZS",
            total_amount: order.price * 100, 
            order_id: order.id,
            items: [
                {
                    retailer_id: order.id,
                    name: itemName,
                    description: description,
                    amount: order.price * 100,
                    quantity: 1
                }
            ],
            payment_configuration: "manual",
            payment_type: "cash_on_delivery"
        }
    };

    const nativeButtons = [
        {
            name: "native_flow",
            buttonParamsJson: JSON.stringify({
                display_text: "💳 ANGALIA ORDER & LIPIA",
                name: "review_and_pay",
                params: flowParams
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "❌ BATILISHA (CANCEL ORDER)",
                id: `cancel_order_${order.id}`
            })
        }
    ];

    return sendInteractiveMessage(sock, chatId, {
        text: `✨ *MICKEY BIZ - ORDER INVOICE*\n\n🆔 *Order ID:* ${order.id}\n📦 *Item:* ${itemName}\n💰 *Jumla:* TSh ${order.price.toLocaleString()}\n\nBonyeza kifungo cha *ANGALIA ORDER & LIPIA* hapo chini ili kukamilisha malipo yako salama kabisa.`,
        footer: SAFE_CONFIG.FOOTER,
        interactiveButtons: nativeButtons
    }, { quoted: quotedMsg });
}

// 2. payment_info Native Flow
function sendNativePaymentInfo(sock, chatId, orderId, amount, quotedMsg) {
    const flowParams = {
        name: "payment_info",
        parameters: {
            order_id: orderId,
            total_amount: amount * 100,
            currency: "TZS",
            payment_method: ["bank_transfer", "mobile_wallet"],
            payment_instructions: `Tuma TSh ${amount.toLocaleString()} kwenda namba yetu ya malipo: ${SAFE_CONFIG.PAYMENT_NO}.\n\nBaada ya kukamilisha, bofya kifungo cha 'NISHALIPIA' kutuma Screenshot.`
        }
    };

    const nativeButtons = [
        {
            name: "native_flow",
            buttonParamsJson: JSON.stringify({
                display_text: "💸 MAELEKEZO YA MALIPO",
                name: "payment_info",
                params: flowParams
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "✅ NISHALIPIA (TUMA PICHA)",
                id: `confirm_payment_${orderId}`
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "❌ SITAKI TENA ORDER",
                id: `cancel_order_${orderId}`
            })
        }
    ];

    return sendInteractiveMessage(sock, chatId, {
        text: `💳 *UTARATIBU WA MALIPO (PAYMENT FLOW)*\n\nOrder yako *${orderId}* imetengenezwa. Tafadhali bofya vifungo vilivyopo chini kupata maelekezo au kuthibitisha mwamala wako.`,
        footer: SAFE_CONFIG.FOOTER,
        interactiveButtons: nativeButtons
    }, { quoted: quotedMsg });
}

// Handle Cancel Order
async function handleCancelOrder(sock, chatId, orderId, quotedMsg) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        if (orders[orderIndex].status === 'pending_payment') {
            orders[orderIndex].status = 'cancelled';
            fs.writeFileSync(ORDERS_DB_PATH, JSON.stringify(orders, null, 2));
            return await sock.sendMessage(chatId, { text: `❌ Order *${orderId}* imesitishwa rasmi na kufutwa kwenye foleni ya malipo.` }, { quoted: quotedMsg });
        }
        return await sock.sendMessage(chatId, { text: `⚠️ Order hii haiwezi kusitishwa kwa sababu ipo kwenye hali ya: ${orders[orderIndex].status}` }, { quoted: quotedMsg });
    }
    await sock.sendMessage(chatId, { text: '❌ Order haikupatikana.' }, { quoted: quotedMsg });
}

// Handle payment confirmation with screenshot request
async function handlePaymentConfirmation(sock, chatId, orderId, userJid, quotedMsg) {
    const order = JSON.parse(fs.readFileSync(ORDERS_DB_PATH)).find(o => o.id === orderId);
    
    if (!order) return await sock.sendMessage(chatId, { text: '❌ Order haikupatikana!' }, { quoted: quotedMsg });
    if (order.status !== 'pending_payment') return await sock.sendMessage(chatId, { text: `⚠️ Order hii tayari imeshughulikiwa (${order.status}).` }, { quoted: quotedMsg });
    
    await sock.sendMessage(chatId, {
        text: `📸 *TUMA SCREENSHOT YA MALIPO SASA*\n\n🆔 Order: ${orderId}\n💰 Kiasi: TSh ${order.price.toLocaleString()}\n\nTafadhali tuma picha ya mwamala wako (Screenshot) hapa hapa. System itamuarifu admin kuisasisha.`
    }, { quoted: quotedMsg });
    
    const pendingScreenshotsPath = path.join(__dirname, '..', 'data', 'pending_screenshots.json');
    let pending = fs.existsSync(pendingScreenshotsPath) ? JSON.parse(fs.readFileSync(pendingScreenshotsPath)) : {};
    pending[userJid] = { orderId, timestamp: Date.now() };
    fs.writeFileSync(pendingScreenshotsPath, JSON.stringify(pending, null, 2));
}

// Admin verify payment
async function adminVerifyPayment(sock, chatId, orderId, userJid, quotedMsg) {
    const order = JSON.parse(fs.readFileSync(ORDERS_DB_PATH)).find(o => o.id === orderId);
    if (!order) return await sock.sendMessage(chatId, { text: '❌ Order haipo!' });
    
    updateOrderStatus(orderId, 'verified');
    saveTransaction({
        id: generateOrderId(), orderId: orderId, userJid: order.userJid, type: order.type,
        package: order.package, amount: order.price, status: 'verified', verifiedBy: userJid, verifiedAt: new Date().toISOString()
    });
    
    await sock.sendMessage(chatId, { text: `✅ Malipo ya order ${orderId} yamethibitishwa!` });
    await sock.sendMessage(order.userJid, { 
        text: `✅ *MALIPO YAMETHIBITISHWA!*\n\n🆔 Order: ${orderId}\n💰 Kiasi: TSh ${order.price.toLocaleString()}\n\nHuduma yako ya ${order.type === 'server' ? 'Server Hosting' : 'Bando la Data'} inatengenezwa sasa hivi na itaamilishwa punde.` 
    });
    
    if (order.type === 'data') await deliverDataBundle(sock, order);
}

async function deliverDataBundle(sock, order) {
    setTimeout(async () => {
        updateOrderStatus(order.id, 'completed');
        await sock.sendMessage(order.userJid, {
            text: `🎉 *DATA IMETUMWA NA KUKAMILIKA!*\n\n📊 Package: ${order.package}GB\n💰 Malipo: TSh ${order.price.toLocaleString()}\n\nBando lako limeshawekwa tayari kwenye namba yako! Shukrani kwa kuchagua Mickey Glitch Tech! 🚀`
        });
    }, 4000);
}

async function checkOrderStatus(sock, chatId, orderId, quotedMsg) {
    const order = JSON.parse(fs.readFileSync(ORDERS_DB_PATH)).find(o => o.id === orderId);
    if (!order) return await sock.sendMessage(chatId, { text: '❌ Order haikupatikana!' }, { quoted: quotedMsg });
    
    let statusMessage = order.status === 'pending_payment' ? 'Inasubiri Malipo' : order.status === 'verified' ? 'Imethibitishwa - Inatengenezwa' : order.status === 'cancelled' ? 'Imesitishwa/Cancelled' : 'Imekamilika';
    let emoji = order.status === 'completed' ? '🎉' : order.status === 'cancelled' ? '❌' : '⏳';

    await sock.sendMessage(chatId, {
        text: `📋 *HALI YA ORDER (STATUS)*\n\n${emoji} *Order ID:* ${order.id}\n📦 *Aina:* ${order.type.toUpperCase()}\n🎁 *Kifurushi:* ${order.package}\n💰 *Kiasi:* TSh ${order.price.toLocaleString()}\n📊 *Hali:* ${statusMessage}\n📅 *Tarehe:* ${new Date(order.createdAt).toLocaleString()}`
    }, { quoted: quotedMsg });
}

// Admin Commands Handler
async function handleAdminCommands(sock, chatId, input, m, userJid) {
    if (userJid !== SAFE_CONFIG.ADMIN_NUMBER && !userJid.includes(SAFE_CONFIG.ADMIN_NUMBER)) return false;
    
    if (input === '.halotel orders') {
        const pendingOrders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH)).filter(o => o.status === 'pending_payment');
        if (pendingOrders.length === 0) return await sock.sendMessage(chatId, { text: '📭 Hakuna order zinazosubiri malipo.' }), true;
        
        let orderList = '*PENDING ORDERS*\n\n';
        pendingOrders.forEach((o, i) => {
            orderList += `${i + 1}. *${o.id}*\n👤 User: ${o.userJid}\n📦 ${o.type}: ${o.package}\n💰 TSh ${o.price.toLocaleString()}\n\n`;
        });
        orderList += `Kuthibitisha tumia: .halotel verify ORDER_ID`;
        await sock.sendMessage(chatId, { text: orderList });
        return true;
    }
    
    if (input.startsWith('.halotel verify')) {
        const orderId = input.split(' ')[2];
        if (!orderId) return await sock.sendMessage(chatId, { text: 'Matumizi: .halotel verify ORDER_ID' }), true;
        await adminVerifyPayment(sock, chatId, orderId, userJid, m);
        return true;
    }
    
    if (input === '.halotel stats') {
        const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
        const completed = orders.filter(o => o.status === 'completed').length;
        const total = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.price, 0);
        await sock.sendMessage(chatId, { text: `📊 *BUSINESS STATS*\n\n📦 Jumla ya Order: ${orders.length}\n✅ Imekamilika: ${completed}\n💰 Mapato: TSh ${total.toLocaleString()}` });
        return true;
    }
    return false;
}

// Main Command Handler
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        initDatabase();
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // ============= ADVANCED BUTTON CLICK LISTENER =============
        let input = (
            m.message?.conversation || 
            m.message?.extendedTextMessage?.text || 
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.templateButtonReplyMessage?.selectedId ||
            m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.name ||
            body || ''
        ).trim();

        // Kama ni Interactive native response payload extraction
        if (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const nativeParams = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                if (nativeParams.order_id) {
                    input = `native_flow_completed_${nativeParams.order_id}`;
                }
            } catch (err) {
                console.log("Error parsing native flow json listener: ", err);
            }
        }

        const lowerInput = input.toLowerCase();

        if (lowerInput === 'halotel') input = '.halotel';
        
        if (await handleAdminCommands(sock, chatId, lowerInput, m, userJid)) return;
        
        if (lowerInput.startsWith('confirm_payment_')) {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });
            return await handlePaymentConfirmation(sock, chatId, input.substring(16), userJid, m);
        }

        if (lowerInput.startsWith('cancel_order_')) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } });
            return await handleCancelOrder(sock, chatId, input.substring(13), m);
        }
        
        if (lowerInput.startsWith('check_order_')) {
            return await checkOrderStatus(sock, chatId, input.substring(12), m);
        }
        
        // Handle image screenshot incoming
        if (m.message?.imageMessage) {
            const pendingScreenshotsPath = path.join(__dirname, '..', 'data', 'pending_screenshots.json');
            let pending = fs.existsSync(pendingScreenshotsPath) ? JSON.parse(fs.readFileSync(pendingScreenshotsPath)) : {};
            
            if (pending[userJid]) {
                const { orderId } = pending[userJid];
                delete pending[userJid];
                fs.writeFileSync(pendingScreenshotsPath, JSON.stringify(pending, null, 2));
                
                const media = await sock.downloadMediaMessage(m);
                await sock.sendMessage(SAFE_CONFIG.ADMIN_NUMBER, {
                    text: `📸 *NEW PAYMENT SCREENSHOT*\n\n🆔 Order ID: ${orderId}\n👤 Kutoka kwa Jid: ${userJid}\n\nTafadhali kagua na uthibitishe kwa kutumia:\n.halotel verify ${orderId}`,
                    image: media
                });
                
                await sock.sendMessage(chatId, { text: `✅ *Screenshot Imepokelewa!*\n\nAdmin anaikagua sasa hivi. Utapokea ujumbe wa uthibitisho punde itakapokamilika.` });
                return;
            }
        }
        
        // ============= SERVER PACKAGES MENU =============
        if (lowerInput === '.halotel server') {
            await sock.sendMessage(chatId, { react: { text: '🖥️', key: m.key } });

            const serverButtons = SERVER_PACKAGES.map(pkg => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: `${pkg.emoji} ${pkg.name} - TSh ${pkg.price.toLocaleString()}`,
                    id: `server_${pkg.id}`
                })
            }));

            const text = `🤖 *${userName} - SERVER HOSTING*\n\nChagua package ya server hapa chini ili kuona details na kupewa Native Flow payment link.\n\n*PACKAGES AVAILABLE:*\n\n${SERVER_PACKAGES.map(pkg => 
                `${pkg.emoji} *${pkg.name}*\n` +
                `   💰 TSh ${pkg.price.toLocaleString()}\n` +
                `   💾 RAM: ${pkg.specs.ram}GB | CPU: ${pkg.specs.cpu}% | DISK: ${pkg.specs.disk}GB\n`
            ).join('\n')}`;

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: text,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: serverButtons
            }, { quoted: m });
        }

        // ============= SERVER CHOICE -> TRIGGER NATIVE FLOWS =============
        if (lowerInput.startsWith('server_')) {
            const selectedPackage = SERVER_PACKAGES.find(pkg => pkg.id === input.replace('server_', ''));
            if (selectedPackage) {
                const orderId = generateOrderId();
                saveOrder({
                    id: orderId, userJid, type: 'server', package: selectedPackage.name,
                    price: selectedPackage.price, specs: selectedPackage.specs, status: 'pending_payment', createdAt: new Date().toISOString()
                });

                return sendNativeReviewAndPay(sock, chatId, { id: orderId, price: selectedPackage.price }, `Server Hosting: ${selectedPackage.name}`, `${selectedPackage.specs.ram}GB RAM / ${selectedPackage.specs.disk}GB Disk`, m);
            }
        }

        // ============= DATA PACKAGES SELECTION -> TRIGGER FLOWS =============
        if (lowerInput.includes('gb') && (lowerInput.startsWith('.halotel') || lowerInput.includes('data_'))) {
            let gbValue = lowerInput.startsWith('data_') ? parseInt(lowerInput.replace('data_', '')) : (lowerInput.match(/\d+/) ? parseInt(lowerInput.match(/\d+/)[0]) : null);
            const selectedData = DATA_PACKAGES.find(d => d.gb === gbValue);
            
            if (selectedData) {
                const orderId = generateOrderId();
                saveOrder({
                    id: orderId, userJid, type: 'data', package: selectedData.gb.toString(),
                    price: selectedData.price, status: 'pending_payment', createdAt: new Date().toISOString()
                });

                return sendNativePaymentInfo(sock, chatId, orderId, selectedData.price, m);
            }
        }

        // ============= MAIN STORE MENU =============
        if (lowerInput === '.halotel') {
            await sock.sendMessage(chatId, { react: { text: '🏪', key: m.key } });

            const mainButtons = [
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🖥️ SERVER HOSTING", id: ".halotel server" }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📱 DATA BUNDLES", id: "show_data_menu" }) },
                { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📋 ORDER ZANGU", id: "my_orders" }) }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: `🏪 *MICKEY GLITCH STORE*\n\nMambo vipi *${userName}*! 👋\n\nChagua huduma unayohitaji kupitia njia za kisasa kabisa hapo chini:`,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: mainButtons
            }, { quoted: m });
        }

        // ============= MY ORDERS =============
        if (lowerInput === 'my_orders') {
            const userOrders = getUserOrders(userJid);
            if (userOrders.length === 0) return await sock.sendMessage(chatId, { text: '📭 Huna order yoyote kwa sasa.' }, { quoted: m });
            
            let ordersText = '*📋 ORDER ZAKO*\n\n';
            userOrders.forEach((o, i) => {
                let statusEmoji = o.status === 'completed' ? '✅' : o.status === 'cancelled' ? '❌' : '⏳';
                ordersText += `${i + 1}. ${statusEmoji} *${o.id}*\n   📦 ${o.type.toUpperCase()}: ${o.package}\n   💰 TSh ${o.price.toLocaleString()} | Status: _${o.status}_\n\n`;
            });
            await sock.sendMessage(chatId, { text: ordersText }, { quoted: m });
            return;
        }

        // ============= DATA INTERACTIVE SELECT MENU =============
        if (lowerInput === 'show_data_menu') {
            const dataRows = DATA_PACKAGES.map(p => ({
                header: `${p.gb}GB Pack`,
                title: p.label,
                description: `💰 TSh ${p.price.toLocaleString()} | ⏱️ ${p.deliveryTime}`,
                id: `data_${p.gb}`
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: `📱 *HALOTEL INTERNET DATA BUNDLES*\n\nChagua kifurushi chako sasa:`,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "📦 CHAGUA BANDO HAPA",
                        sections: [{ title: "HALOTEL HIGH SPEED", rows: dataRows }]
                    })
                }]
            }, { quoted: m });
        }

        // ============= AI CHAT BOT INTELLIGENCE =============
        if (input.length > 2 && !input.startsWith('.') && !lowerInput.startsWith('data_') && !lowerInput.startsWith('server_') && !lowerInput.startsWith('confirm_payment_') && !lowerInput.startsWith('check_order_')) {
            const aiReply = await askMickeyBiz(input, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

    } catch (e) {
        console.error("Halotel Command Error:", e);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu imetokea kwenye usikilizaji: ${e.message}` }, { quoted: m });
    }
}

module.exports = {
    halotelCommand,
    storePendingRequest,
    getPendingRequest,
    removePendingRequest,
    PANEL_PACKAGES,
    SERVER_PACKAGES,
    DATA_PACKAGES,
    BANNER,
    FOOTER,
    OWNER_NUMBER,
    PANEL_URL
};
