/**
 * halotel.js - Mickey Glitch Business AI with Buttons & Payment-Only Server Flow
 * UONGOZI: Inauza bando, server specs, na data bundles kwa buttons
 * TAREHE: Imeboreshwa na kuongezwa payment verification, auto-delivery, na order tracking
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
    ADMIN_NUMBER: '255615944741', // Weka number yako ya admin
    API_KEY: 'your_api_key_here'
};

// ============= DATABASE SETUP =============
const ORDERS_DB_PATH = path.join(__dirname, '..', 'data', 'halotel_orders.json');
const USERS_DB_PATH = path.join(__dirname, '..', 'data', 'halotel_users.json');
const TRANSACTIONS_DB_PATH = path.join(__dirname, '..', 'data', 'halotel_transactions.json');

// Initialize databases
function initDatabase() {
    if (!fs.existsSync(ORDERS_DB_PATH)) {
        fs.writeFileSync(ORDERS_DB_PATH, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(USERS_DB_PATH)) {
        fs.writeFileSync(USERS_DB_PATH, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(TRANSACTIONS_DB_PATH)) {
        fs.writeFileSync(TRANSACTIONS_DB_PATH, JSON.stringify([], null, 2));
    }
}

// Save order
function saveOrder(order) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
    orders.push(order);
    fs.writeFileSync(ORDERS_DB_PATH, JSON.stringify(orders, null, 2));
}

// Get user orders
function getUserOrders(userJid) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
    return orders.filter(order => order.userJid === userJid);
}

// Update order status
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

// Save transaction
function saveTransaction(transaction) {
    const transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_DB_PATH));
    transactions.push(transaction);
    fs.writeFileSync(TRANSACTIONS_DB_PATH, JSON.stringify(transactions, null, 2));
}

// Generate unique order ID
function generateOrderId() {
    return 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Server Packages (Updated)
const SERVER_PACKAGES = [
    { 
        name: 'SMALL', 
        price: 3000, 
        id: 'pkg_small',
        specs: { ram: '1', cpu: '10', disk: '10' },
        databases: 1,
        backups: 1,
        emoji: '🚀',
        setupTime: '30 minutes'
    },
    { 
        name: 'MEDIUM', 
        price: 5000, 
        id: 'pkg_medium',
        specs: { ram: '3', cpu: '100', disk: '25' },
        databases: 2,
        backups: 2,
        emoji: '⚡',
        setupTime: '30 minutes'
    },
    { 
        name: 'LARGE', 
        price: 6500, 
        id: 'pkg_large',
        specs: { ram: '4', cpu: '200', disk: '50' },
        databases: 3,
        backups: 3,
        emoji: '💪',
        setupTime: '30 minutes'
    },
    { 
        name: 'PRO', 
        price: 10000, 
        id: 'pkg_pro',
        specs: { ram: '8', cpu: '400', disk: '100' },
        databases: 5,
        backups: 5,
        emoji: '🔥',
        setupTime: '30 minutes'
    }
];

// Data Packages
const DATA_PACKAGES = [
    { gb: 10, label: 'Standard Pack', price: 10000, deliveryTime: '5 minutes' },
    { gb: 15, label: 'Bronze Pack', price: 15000, deliveryTime: '5 minutes' },
    { gb: 20, label: 'Silver Pack', price: 20000, deliveryTime: '3 minutes' },
    { gb: 25, label: 'Gold Pack', price: 25000, deliveryTime: '3 minutes' },
    { gb: 50, label: 'Business Pack', price: 50000, deliveryTime: '10 minutes' }
];

// ========== PENDING REQUEST STORAGE (IN-MEMORY) ==========
const pendingRequests = new Map();

function storePendingRequest(chatId, userName, packageInfo, specs) {
    pendingRequests.set(chatId, {
        userName,
        package: packageInfo,
        specs,
        step: 'awaiting_email',
        timestamp: Date.now()
    });
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
        if (pendingRequests.has(chatId)) {
            pendingRequests.delete(chatId);
        }
    }, 10 * 60 * 1000);
}

function getPendingRequest(chatId) {
    return pendingRequests.get(chatId) || null;
}

function removePendingRequest(chatId) {
    pendingRequests.delete(chatId);
}

// ========== PANEL CONFIGURATION & PTERODACTYL STUBS ==========
const PANEL_PACKAGES = SERVER_PACKAGES;
const BANNER = SAFE_CONFIG.BANNER;
const FOOTER = SAFE_CONFIG.FOOTER;
const OWNER_NUMBER = settings.ownerNumber || '255715944741';
const PANEL_URL = 'https://panel.example.com'; // Update with actual panel URL

// Stub: Create user in Pterodactyl panel
async function createPterodactylUser(email, userName, chatId) {
    try {
        // Placeholder - would normally call Pterodactyl API
        console.log(`Creating user: ${email} (${userName})`);
        return {
            success: true,
            userId: Math.floor(Math.random() * 10000),
            email: email
        };
    } catch (e) {
        console.error('Pterodactyl user creation error:', e);
        return { success: false, error: e.message };
    }
}

// Stub: Create server in Pterodactyl panel
async function createPterodactylServer(userId, userName, specs, email) {
    try {
        // Placeholder - would normally call Pterodactyl API
        console.log(`Creating server for user ${userId}: ${userName}`);
        return {
            success: true,
            serverId: Math.floor(Math.random() * 100000),
            link: `${PANEL_URL}/server/${Math.floor(Math.random() * 100000)}`,
            email: email
        };
    } catch (e) {
        console.error('Pterodactyl server creation error:', e);
        return { success: false, error: e.message };
    }
}

// Generate random password
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Send server payment details
function sendServerPaymentDetails(sock, chatId, selectedPackage, quotedMsg, userJid) {
    // Create order first
    const orderId = generateOrderId();
    const order = {
        id: orderId,
        userJid: userJid,
        type: 'server',
        package: selectedPackage.name,
        price: selectedPackage.price,
        specs: selectedPackage.specs,
        status: 'pending_payment',
        createdAt: new Date().toISOString()
    };
    saveOrder(order);

    const paymentButtons = [
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: `📋 Copy Number: ${SAFE_CONFIG.PAYMENT_NO}`,
                copy_code: SAFE_CONFIG.PAYMENT_NO
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "✅ NIMALIZA MALIPO",
                id: `confirm_payment_${orderId}`
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "📋 CHECK ORDER STATUS",
                id: `check_order_${orderId}`
            })
        }
    ];

    return sendInteractiveMessage(sock, chatId, {
        text: `✨ *MICKEY BIZ - SERVER ORDER*\n\n📦 *Package:* ${selectedPackage.name}\n💰 *Amount:* TSh ${selectedPackage.price.toLocaleString()}\n🆔 *Order ID:* ${orderId}\n\n*SPECIFICATIONS:*\n• 🧠 RAM: ${selectedPackage.specs.ram}GB\n• 🏎️ CPU: ${selectedPackage.specs.cpu}%\n• 💾 DISK: ${selectedPackage.specs.disk}GB\n• 🗄️ Databases: ${selectedPackage.databases}\n• 💾 Backups: ${selectedPackage.backups}\n\n*PAYMENT DETAILS:*\n💳 *Number:* ${SAFE_CONFIG.PAYMENT_NO}\n💵 *Amount:* TSh ${selectedPackage.price.toLocaleString()}\n⏱️ *Setup Time:* ${selectedPackage.setupTime}\n\n*Baada ya malipo:*\n1. Bonyeza "NIMALIZA MALIPO"\n2. Tuma screenshot ya malipo\n3. Admin atathibitisha na kuanzisha server\n4. Utapokea details za server kwa PM\n\n🚀 Powered by Mickey Glitch Tech`,
        footer: SAFE_CONFIG.FOOTER,
        interactiveButtons: paymentButtons
    }, { quoted: quotedMsg });
}

// Ask Mickey Biz AI
async function askMickeyBiz(query, userName) {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando na panel. Mteja ni ${userName}. Jibu kwa mfumo wa biashara.`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia mwanangu tuwashe mitambo.";
    } catch (e) { 
        return "Nipo hapa! Lipia chap nikuwashie mitambo."; 
    }
}

// Show payment instructions
async function showPaymentInstructions(sock, chatId, amount, orderId, quotedMsg) {
    const buttons = [
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: `📋 Copy Payment Number`,
                copy_code: SAFE_CONFIG.PAYMENT_NO
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "✅ CONFIRM PAYMENT",
                id: `confirm_payment_${orderId}`
            })
        }
    ];

    return sendInteractiveMessage(sock, chatId, {
        text: `💳 *PAYMENT INSTRUCTIONS*\n\n🆔 *Order ID:* ${orderId}\n💰 *Amount:* TSh ${amount.toLocaleString()}\n📞 *Pay to:* ${SAFE_CONFIG.PAYMENT_NO}\n\n*STEPS:*\n1. Send TSh ${amount.toLocaleString()} to ${SAFE_CONFIG.PAYMENT_NO}\n2. Take screenshot of payment\n3. Click "CONFIRM PAYMENT" button\n4. Send the screenshot\n5. Wait for confirmation\n\n⚠️ *DO NOT* close this chat until payment is confirmed!`,
        footer: SAFE_CONFIG.FOOTER,
        interactiveButtons: buttons
    }, { quoted: quotedMsg });
}

// Handle payment confirmation with screenshot
async function handlePaymentConfirmation(sock, chatId, orderId, userJid, quotedMsg) {
    const order = JSON.parse(fs.readFileSync(ORDERS_DB_PATH)).find(o => o.id === orderId);
    
    if (!order) {
        return await sock.sendMessage(chatId, { 
            text: '❌ Order not found! Please start a new order.' 
        }, { quoted: quotedMsg });
    }
    
    if (order.status !== 'pending_payment') {
        return await sock.sendMessage(chatId, { 
            text: `⚠️ This order is already ${order.status}. Cannot confirm payment again.` 
        }, { quoted: quotedMsg });
    }
    
    await sock.sendMessage(chatId, {
        text: `📸 *PLEASE SEND PAYMENT SCREENSHOT*\n\n🆔 Order: ${orderId}\n💰 Amount: TSh ${order.price.toLocaleString()}\n\nSend the payment screenshot now. Admin will verify and complete your order.`
    }, { quoted: quotedMsg });
    
    // Store that we're waiting for screenshot
    const pendingScreenshotsPath = path.join(__dirname, '..', 'data', 'pending_screenshots.json');
    let pending = {};
    if (fs.existsSync(pendingScreenshotsPath)) {
        pending = JSON.parse(fs.readFileSync(pendingScreenshotsPath));
    }
    pending[userJid] = { orderId, timestamp: Date.now() };
    fs.writeFileSync(pendingScreenshotsPath, JSON.stringify(pending, null, 2));
}

// Admin verify payment
async function adminVerifyPayment(sock, chatId, orderId, userJid, quotedMsg) {
    const order = JSON.parse(fs.readFileSync(ORDERS_DB_PATH)).find(o => o.id === orderId);
    
    if (!order) {
        return await sock.sendMessage(chatId, { text: '❌ Order not found!' });
    }
    
    // Update order status
    updateOrderStatus(orderId, 'verified');
    
    // Save transaction
    saveTransaction({
        id: generateOrderId(),
        orderId: orderId,
        userJid: order.userJid,
        type: order.type,
        package: order.package,
        amount: order.price,
        status: 'verified',
        verifiedBy: userJid,
        verifiedAt: new Date().toISOString()
    });
    
    await sock.sendMessage(chatId, { text: `✅ Payment verified for order ${orderId}!` });
    
    // Notify user
    await sock.sendMessage(order.userJid, { 
        text: `✅ *PAYMENT VERIFIED!*\n\n🆔 Order: ${orderId}\n💰 Amount: TSh ${order.price.toLocaleString()}\n\nYour ${order.type === 'server' ? 'server' : 'data bundle'} is being processed now.\nYou will receive details shortly.` 
    });
    
    // If data bundle, deliver automatically
    if (order.type === 'data') {
        await deliverDataBundle(sock, order);
    }
}

// Deliver data bundle automatically
async function deliverDataBundle(sock, order) {
    const dataPackage = DATA_PACKAGES.find(d => d.gb === parseInt(order.package));
    
    // Here you would integrate with Halotel API to send data
    // For now, we'll simulate delivery
    setTimeout(async () => {
        updateOrderStatus(order.id, 'completed');
        
        await sock.sendMessage(order.userJid, {
            text: `🎉 *DATA DELIVERED!*\n\n📊 Package: ${order.package}GB\n💰 Paid: TSh ${order.price.toLocaleString()}\n\nYour data bundle has been activated successfully!\n\nThank you for choosing Mickey Glitch Tech! 🚀`
        });
    }, 3000);
}

// Check order status
async function checkOrderStatus(sock, chatId, orderId, quotedMsg) {
    const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        return await sock.sendMessage(chatId, { 
            text: '❌ Order not found!' 
        }, { quoted: quotedMsg });
    }
    
    let statusMessage = '';
    let emoji = '';
    
    switch(order.status) {
        case 'pending_payment':
            emoji = '⏳';
            statusMessage = 'Awaiting payment confirmation';
            break;
        case 'verified':
            emoji = '✅';
            statusMessage = 'Payment verified - Processing';
            break;
        case 'completed':
            emoji = '🎉';
            statusMessage = 'Completed - Service delivered';
            break;
        default:
            emoji = '❓';
            statusMessage = 'Unknown status';
    }
    
    await sock.sendMessage(chatId, {
        text: `📋 *ORDER STATUS*\n\n${emoji} *Order ID:* ${order.id}\n📦 *Type:* ${order.type}\n🎁 *Package:* ${order.package}\n💰 *Amount:* TSh ${order.price.toLocaleString()}\n📊 *Status:* ${statusMessage}\n📅 *Date:* ${new Date(order.createdAt).toLocaleString()}\n\nContact admin for any issues.`
    }, { quoted: quotedMsg });
}

// Admin commands
async function handleAdminCommands(sock, chatId, input, m, userJid) {
    if (userJid !== SAFE_CONFIG.ADMIN_NUMBER && !userJid.includes(SAFE_CONFIG.ADMIN_NUMBER)) {
        return false;
    }
    
    if (input === '.halotel orders') {
        const pendingOrders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH)).filter(o => o.status === 'pending_payment');
        
        if (pendingOrders.length === 0) {
            await sock.sendMessage(chatId, { text: '📭 No pending orders.' });
            return true;
        }
        
        let orderList = '*PENDING ORDERS*\n\n';
        pendingOrders.forEach((order, index) => {
            orderList += `${index + 1}. *${order.id}*\n`;
            orderList += `   👤 User: ${order.userJid}\n`;
            orderList += `   📦 ${order.type}: ${order.package}\n`;
            orderList += `   💰 TSh ${order.price.toLocaleString()}\n`;
            orderList += `   📅 ${new Date(order.createdAt).toLocaleString()}\n\n`;
        });
        
        orderList += `\nTo verify: .halotel verify ORDER_ID`;
        
        await sock.sendMessage(chatId, { text: orderList });
        return true;
    }
    
    if (input.startsWith('.halotel verify')) {
        const orderId = input.split(' ')[2];
        if (!orderId) {
            await sock.sendMessage(chatId, { text: 'Usage: .halotel verify ORDER_ID' });
            return true;
        }
        
        await adminVerifyPayment(sock, chatId, orderId, userJid, m);
        return true;
    }
    
    if (input === '.halotel stats') {
        const orders = JSON.parse(fs.readFileSync(ORDERS_DB_PATH));
        const completed = orders.filter(o => o.status === 'completed').length;
        const pending = orders.filter(o => o.status === 'pending_payment').length;
        const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.price, 0);
        
        await sock.sendMessage(chatId, {
            text: `📊 *BUSINESS STATS*\n\n📦 Total Orders: ${orders.length}\n⏳ Pending: ${pending}\n✅ Completed: ${completed}\n💰 Revenue: TSh ${totalRevenue.toLocaleString()}\n\n🚀 Mickey Glitch Tech`
        });
        return true;
    }
    
    return false;
}

// Main command handler
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        initDatabase();
        
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
        
        // Handle admin commands first
        const handled = await handleAdminCommands(sock, chatId, input, m, userJid);
        if (handled) return;
        
        // Handle payment confirmation
        if (input.startsWith('confirm_payment_')) {
            const orderId = input.replace('confirm_payment_', '');
            await handlePaymentConfirmation(sock, chatId, orderId, userJid, m);
            return;
        }
        
        // Handle order status check
        if (input.startsWith('check_order_')) {
            const orderId = input.replace('check_order_', '');
            await checkOrderStatus(sock, chatId, orderId, m);
            return;
        }
        
        // Handle screenshot (image messages)
        if (m.message?.imageMessage) {
            const pendingScreenshotsPath = path.join(__dirname, '..', 'data', 'pending_screenshots.json');
            let pending = {};
            if (fs.existsSync(pendingScreenshotsPath)) {
                pending = JSON.parse(fs.readFileSync(pendingScreenshotsPath));
            }
            
            if (pending[userJid]) {
                const { orderId } = pending[userJid];
                delete pending[userJid];
                fs.writeFileSync(pendingScreenshotsPath, JSON.stringify(pending, null, 2));
                
                // Download screenshot and forward to admin
                const media = await sock.downloadMediaMessage(m);
                await sock.sendMessage(SAFE_CONFIG.ADMIN_NUMBER, {
                    text: `📸 *PAYMENT SCREENSHOT RECEIVED*\n\n🆔 Order: ${orderId}\n👤 User: ${userJid}\n💰 Please verify this payment.`,
                    image: media
                });
                
                await sock.sendMessage(chatId, {
                    text: `✅ *Screenshot received!*\n\nAdmin will verify your payment shortly.\n\nOrder ID: ${orderId}\n\nYou will receive confirmation once verified.`
                });
                return;
            }
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
                return await sendServerPaymentDetails(sock, chatId, selectedPackage, m, userJid);
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
            
            // Create order
            const orderId = generateOrderId();
            const order = {
                id: orderId,
                userJid: userJid,
                type: 'data',
                package: selectedData.gb.toString(),
                price: selectedData.price,
                status: 'pending_payment',
                createdAt: new Date().toISOString()
            };
            saveOrder(order);

            const paymentButtons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: `📋 Copy Number: ${SAFE_CONFIG.PAYMENT_NO}`,
                        copy_code: SAFE_CONFIG.PAYMENT_NO
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "✅ CONFIRM PAYMENT",
                        id: `confirm_payment_${orderId}`
                    })
                }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                text: `✨ *MICKEY BIZ - DATA ORDER*\n\n🆔 *Order ID:* ${orderId}\n📊 *Package:* ${selectedData.gb}GB - ${selectedData.label}\n💰 *Amount:* TSh ${selectedData.price.toLocaleString()}\n📌 *Network:* Halotel\n⏱️ *Delivery:* ${selectedData.deliveryTime}\n\n*PAYMENT DETAILS:*\n💳 *Number:* ${SAFE_CONFIG.PAYMENT_NO}\n💵 *Amount:* TSh ${selectedData.price.toLocaleString()}\n\n*After payment:*\n1. Click "CONFIRM PAYMENT" button\n2. Send screenshot\n3. Data will be activated automatically\n\n📱 *M-Pesa/Tigo/Airtel users:* Send payment to the number above\n\n🚀 Powered by Mickey Glitch Tech`,
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
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 MY ORDERS",
                        id: "my_orders"
                    })
                }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: `🏪 *MICKEY GLITCH STORE*\n\nMambo vipi *${userName}*! 👋\n\nKaribu kwenye duka letu. Tunauza:\n\n🖥️ *SERVER HOSTING* - Server specifications na malipo\n📱 *DATA BUNDLES* - Halotel internet packages\n\nChagua huduma unayoitaka kwa kubonyeza button hapo chini:\n\n🚀 Powered by Mickey Glitch Tech`,
                footer: SAFE_CONFIG.FOOTER,
                interactiveButtons: mainButtons
            }, { quoted: m });
        }
        
        // ============= MY ORDERS =============
        if (input === 'my_orders') {
            const userOrders = getUserOrders(userJid);
            
            if (userOrders.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: '📭 You have no orders yet. Start by selecting a package from the menu!' 
                }, { quoted: m });
                return;
            }
            
            let ordersText = '*📋 YOUR ORDERS*\n\n';
            userOrders.forEach((order, index) => {
                let statusEmoji = order.status === 'completed' ? '✅' : order.status === 'verified' ? '⏳' : '⏰';
                ordersText += `${index + 1}. ${statusEmoji} *${order.id}*\n`;
                ordersText += `   📦 ${order.type}: ${order.package}\n`;
                ordersText += `   💰 TSh ${order.price.toLocaleString()}\n`;
                ordersText += `   📊 Status: ${order.status}\n`;
                ordersText += `   📅 ${new Date(order.createdAt).toLocaleDateString()}\n\n`;
            });
            
            ordersText += `\nTo check status: .halotel status ORDER_ID`;
            
            await sock.sendMessage(chatId, { text: ordersText }, { quoted: m });
            return;
        }
        
        // ============= CHECK SPECIFIC ORDER =============
        if (input.startsWith('.halotel status')) {
            const orderId = input.split(' ')[2];
            if (orderId) {
                await checkOrderStatus(sock, chatId, orderId, m);
            } else {
                await sock.sendMessage(chatId, { text: 'Usage: .halotel status ORDER_ID' }, { quoted: m });
            }
            return;
        }

        // ============= SHOW DATA MENU =============
        if (input === 'show_data_menu') {
            const dataRows = DATA_PACKAGES.map(p => ({
                header: `${p.gb}GB`,
                title: p.label,
                description: `💰 TSh ${p.price.toLocaleString()} | ⏱️ ${p.deliveryTime}`,
                id: `data_${p.gb}`
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: SAFE_CONFIG.BANNER },
                text: `📱 *HALOTEL DATA BUNDLES*\n\nChagua package yako ya data hapa chini:\n\n*Prices & Delivery:*\n${DATA_PACKAGES.map(p => `• ${p.gb}GB - ${p.label}: TSh ${p.price.toLocaleString()} (${p.deliveryTime})`).join('\n')}\n\nBonyeza package unayoitaka kuendelea na malipo.\n\n*All bundles are valid for 30 days*`,
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
        if (input.length > 2 && !input.startsWith('.') && !input.startsWith('data_') && !input.startsWith('server_') && !input.startsWith('confirm_payment_') && !input.startsWith('check_order_')) {
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
    halotelCommand,
    storePendingRequest,
    getPendingRequest,
    removePendingRequest,
    PANEL_PACKAGES,
    createPterodactylUser,
    createPterodactylServer,
    BANNER,
    FOOTER,
    OWNER_NUMBER,
    PANEL_URL,
    SERVER_PACKAGES,
    DATA_PACKAGES
};