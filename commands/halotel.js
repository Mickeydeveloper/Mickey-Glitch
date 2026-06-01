/**
 * halotel.js - Mickey Glitch Business AI with Buttons & Auto Email
 * KAZI: Inauza bando na panel za server kwa buttons
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');
const settings = require('./settings');

const CONFIG = settings.CONFIG;
const PTERO_CONFIG = settings.PTERO_CONFIG;

const SAFE_CONFIG = CONFIG || {
    PRICE_PER_GB: 1000,
    PAYMENT_NO: '0615944741',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech'
};

const SAFE_PTERO = PTERO_CONFIG || {
    PANEL_URL: 'https://panel.mickeypannel.dpdns.org/',
    API_KEY: 'ptla_6TPdj5LSkKq1vCLbEJYBO1hy39vD2NBWqopJKc1Pgg0',
    LOCATION_ID: 2,
    EGG_ID: 15
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

// In-memory pending requests store (simple Map)
const pendingRequests = new Map();

function storePendingRequest(chatId, userName, selectedPackage, specs) {
    pendingRequests.set(chatId, {
        userName,
        package: selectedPackage,
        specs,
        step: 'awaiting_email',
        createdAt: Date.now()
    });
}

function getPendingRequest(chatId) {
    return pendingRequests.get(chatId);
}

function removePendingRequest(chatId) {
    return pendingRequests.delete(chatId);
}

// Generate random email for Pterodactyl account
function generateRandomEmail(userName, userJid) {
    const cleanJid = userJid.split('@')[0];
    const randomStr = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now().toString().slice(-6);
    return `${cleanJid}_${randomStr}${timestamp}@mickeybot.store`;
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

function normalizePterodactylUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let cleaned = url.trim();
    // Remove trailing slashes
    cleaned = cleaned.replace(/\/+$|\/+$/g, '');
    // If the user supplied the API base already, strip it so we can append a clean path
    cleaned = cleaned.replace(/\/api\/application$/i, '');
    return cleaned;
}

function getPterodactylApiEndpoint(endpoint) {
    const base = normalizePterodactylUrl(SAFE_PTERO.PANEL_URL);
    return `${base}/api/application/${endpoint.replace(/^\/+/, '')}`;
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

// Create server along with a new user (kept for backward compatibility)
async function createPterodactylServerWithUserCreation(userName, userJid, pkg) {
    try {
        const cleanJid = userJid.split('@')[0];
        const userEmail = generateRandomEmail(userName, userJid);
        const userPassword = generateRandomPassword();
        const serverName = `${pkg.name}_${cleanJid}_${Date.now().toString().slice(-4)}`;

        // 1. Create user account
        const userRes = await axios.post(getPterodactylApiEndpoint('users'), {
            username: `user_${cleanJid}_${Date.now().toString().slice(-6)}`,
            email: userEmail,
            first_name: userName.replace(/[^a-zA-Z0-9]/g, '') || 'Mteja',
            last_name: pkg.name,
            password: userPassword
        }, {
            headers: { 
                'Authorization': `Bearer ${SAFE_PTERO.API_KEY}`, 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            },
            timeout: 15000
        });

        const pteroUserId = userRes.data?.attributes?.id || userRes.data?.id;

        // 2. Convert specs
        const ramMb = parseFloat(pkg.specs.ram) * 1024;
        const diskMb = parseFloat(pkg.specs.disk) * 1024;
        const cpuLimit = parseInt(pkg.specs.cpu);

        // 3. Create server
        const serverRes = await axios.post(getPterodactylApiEndpoint('servers'), {
            name: serverName,
            user: pteroUserId,
            egg: SAFE_PTERO.EGG_ID,
            docker_image: "ghcr.io/pterodactyl/yolks:node_18",
            startup: "node index.js",
            limits: { 
                memory: ramMb, 
                swap: 0, 
                disk: diskMb, 
                io: 500, 
                cpu: cpuLimit 
            },
            feature_limits: { 
                databases: pkg.databases, 
                allocations: 1, 
                backups: pkg.backups 
            },
            deploy: { 
                locations: [SAFE_PTERO.LOCATION_ID], 
                dedicated_ip: false, 
                port_range: [] 
            },
            environment: { INST: "npm install" }
        }, {
            headers: { 
                'Authorization': `Bearer ${SAFE_PTERO.API_KEY}`, 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            },
            timeout: 20000
        });

        return {
            success: true,
            panelUrl: SAFE_PTERO.PANEL_URL,
            email: userEmail,
            password: userPassword,
            serverName: serverName,
            username: userRes.data.attributes.username
        };

    } catch (error) {
        console.error("Pterodactyl Error:", error.response?.data || error.message);
        return { 
            success: false, 
            error: error.response?.data?.errors?.[0]?.detail || error.message 
        };
    }
}

// Create a Pterodactyl user (used by server.js flow)
async function createPterodactylUser(email, userName) {
    try {
        const password = generateRandomPassword();
        const userRes = await axios.post(getPterodactylApiEndpoint('users'), {
            username: `user_${email.split('@')[0]}_${Date.now().toString().slice(-6)}`,
            email: email,
            first_name: (userName || 'Mteja').replace(/[^a-zA-Z0-9]/g, '') || 'Mteja',
            last_name: 'Client',
            password: password
        }, {
            headers: {
                'Authorization': `Bearer ${SAFE_PTERO.API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        return { success: true, userId: userRes.data?.attributes?.id || userRes.data?.id, username: userRes.data?.attributes?.username || userRes.data?.username };
    } catch (err) {
        console.error('Create Pterodactyl User Error:', err.response?.data || err.message);
        return { success: false, error: err.response?.data?.errors?.[0]?.detail || err.message };
    }
}

// Create a Pterodactyl server for an existing userId (used by server.js flow)
async function createPterodactylServer(userId, userName, specs, email) {
    try {
        const serverName = `srv_${specs.ram}GB_${(email || 'user').split('@')[0]}_${Date.now().toString().slice(-4)}`;

        const ramMb = parseFloat(specs.ram) * 1024;
        const diskMb = parseFloat(specs.disk) * 1024;
        const cpuLimit = parseInt(specs.cpu);

        const serverRes = await axios.post(getPterodactylApiEndpoint('servers'), {
            name: serverName,
            user: userId,
            egg: SAFE_PTERO.EGG_ID,
            docker_image: "ghcr.io/pterodactyl/yolks:node_18",
            startup: "node index.js",
            limits: { 
                memory: ramMb, 
                swap: 0, 
                disk: diskMb, 
                io: 500, 
                cpu: cpuLimit 
            },
            feature_limits: { 
                databases: specs.databases || 1, 
                allocations: 1, 
                backups: specs.backups || 1 
            },
            deploy: { 
                locations: [SAFE_PTERO.LOCATION_ID], 
                dedicated_ip: false, 
                port_range: [] 
            },
            environment: { INST: "npm install" }
        }, {
            headers: { 
                'Authorization': `Bearer ${SAFE_PTERO.API_KEY}`, 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            },
            timeout: 20000
        });

        return { success: true, link: SAFE_PTERO.PANEL_URL, serverId: serverRes.data.attributes.id };
    } catch (err) {
        console.error('Create Pterodactyl Server Error:', err.response?.data || err.message);
        return { success: false, error: err.response?.data?.errors?.[0]?.detail || err.message };
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

            // Create interactive buttons for each package
            const serverButtons = SERVER_PACKAGES.map(pkg => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: `${pkg.emoji} ${pkg.name} - TSh ${pkg.price.toLocaleString()}`,
                    id: `server_${pkg.id}`
                })
            }));

            const text = `🤖 *${userName} - SERVER HOSTING*\n\nHabari ${userName}! Karibu kwenye huduma yetu ya server hosting.\n\n*📦 PACKAGES ZINAZOPATIKANA:*\n\n${SERVER_PACKAGES.map(pkg => 
                `${pkg.emoji} *${pkg.name} - ${pkg.name === 'SMALL' ? 'Kuanzia' : pkg.name === 'MEDIUM' ? 'Bora' : pkg.name === 'LARGE' ? 'Biashara' : 'Unlimited'}*\n` +
                `   💰 TSh ${pkg.price.toLocaleString()}\n` +
                `   💾 RAM: ${pkg.specs.ram}GB | CPU: ${pkg.specs.cpu}% | DISK: ${pkg.specs.disk}GB\n` +
                `   📊 Databases: ${pkg.databases} | Backups: ${pkg.backups}\n`
            ).join('\n')}\n*✏️ BONYEZA BUTTON HAPA CHINI KUCHAGUA PACKAGE:*\n\n🚀 Powered by Mickey Glitch Tech`;

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
                await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });
                
                // Sending status message
                await sock.sendMessage(chatId, { 
                    text: `🔄 *Processing Your Request*\n\n${selectedPackage.emoji} *${selectedPackage.name} PACKAGE SELECTED*\n💰 Amount: TSh ${selectedPackage.price.toLocaleString()}\n\n⏳ Creating your server automatically...\n📧 Generating account credentials...\n\n*This will take about 30-60 seconds*` 
                }, { quoted: m });

                // Create server automatically (creates user + server)
                const creation = await createPterodactylServerWithUserCreation(userName, userJid, selectedPackage);

                if (creation.success) {
                    const successMessage = `✅ *SERVER CREATED SUCCESSFULLY!* 🎉\n\n${selectedPackage.emoji} *Package:* ${selectedPackage.name}\n💰 *Amount:* TSh ${selectedPackage.price.toLocaleString()}\n\n*🔐 LOGIN CREDENTIALS:*\n━━━━━━━━━━━━━━━━━━━\n🌐 *Panel URL:* ${creation.panelUrl}\n📧 *Email:* ${creation.email}\n🔑 *Password:* ${creation.password}\n👤 *Username:* ${creation.username}\n━━━━━━━━━━━━━━━━━━━\n\n*📊 SERVER SPECS:*\n• 🧠 RAM: ${selectedPackage.specs.ram} GB\n• 🏎️ CPU: ${selectedPackage.specs.cpu}%\n• 💾 DISK: ${selectedPackage.specs.disk} GB\n• 🗄️ Databases: ${selectedPackage.databases}\n• 💾 Backups: ${selectedPackage.backups}\n\n*⚠️ IMPORTANT:*\n1. Save these credentials safely\n2. Change your password after first login\n3. Contact admin if you face any issues\n\n*Thank you for choosing Mickey Glitch Server Hosting!* 🚀`;

                    await sock.sendMessage(chatId, { text: successMessage }, { quoted: m });
                    
                    // Also send credentials to admin
                    const adminJid = `${settings.ownerNumber}@s.whatsapp.net`;
                    await sock.sendMessage(adminJid, { 
                        text: `🆕 *NEW SERVER CREATED*\n\n👤 Client: ${userName}\n📱 JID: ${userJid}\n📦 Package: ${selectedPackage.name}\n💰 Amount: TSh ${selectedPackage.price.toLocaleString()}\n📧 Email: ${creation.email}\n🖥️ Server: ${creation.serverName}` 
                    });
                } else {
                    await sock.sendMessage(chatId, { 
                        text: `❌ *SERVER CREATION FAILED*\n\nSamahani ${userName}, tumepata hitilafu wakati wa kuunda server yako.\n\n*Error:* ${creation.error}\n\nTafadhali wasiliana na admin kwa msaada zaidi.` 
                    }, { quoted: m });
                }
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
                text: `🏪 *MICKEY GLITCH STORE*\n\nMambo vipi *${userName}*! 👋\n\nKaribu kwenye duka letu. Tunauza:\n\n🖥️ *SERVER HOSTING* - Pterodactyl panels\n📱 *DATA BUNDLES* - Halotel internet packages\n\nChagua huduma unayoitaka kwa kubonyeza button hapo chini:\n\n🚀 Powered by Mickey Glitch Tech`,
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
    PANEL_PACKAGES: SERVER_PACKAGES,
    createPterodactylUser,
    createPterodactylServer,
    storePendingRequest,
    getPendingRequest,
    removePendingRequest,
    BANNER: SAFE_CONFIG.BANNER,
    FOOTER: SAFE_CONFIG.FOOTER,
    OWNER_NUMBER: settings.ownerNumber,
    PANEL_URL: SAFE_PTERO.PANEL_URL,
    halotelCommand
};