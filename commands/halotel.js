/**
 * halotel.js - Mickey Glitch Business AI (Super Stable Version)
 * Kazi: Inatofautisha bando na Panel za Server zenye Specs (RAM, CPU, DISK) ukitumia gifted-btns.
 * Ushirikiano: Inasoma token na config zote kutoka kwenye settings.js kiotomatiki.
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');
const settings = require('./settings'); // Import settings object nzima

// Kuchukua config kutoka settings.js
const PTERO_CONFIG = settings.PTERO_CONFIG;
const CONFIG = settings.CONFIG;

// Orodha ya vifurushi vya bando la kawaida
const PACKAGES = [
    { gb: 10, label: 'Standard Pack' },
    { gb: 15, label: 'Bronze Pack' },
    { gb: 20, label: 'Silver Pack' },
    { gb: 25, label: 'Gold Pack' },
    { gb: 50, label: 'Business Pack' }
];

// Orodha ya bidhaa za Panel zenye CPU, RAM, na DISK
const PANEL_PACKAGES = [
    { 
        name: 'Panel 1GB', 
        price: 5000, 
        id: 'h_panel_1gb',
        specs: { ram: '1', cpu: '100', disk: '10' } // Inasomwa kama GB na % baadae
    },
    { 
        name: 'Number 1 Month', 
        price: 3000, 
        id: 'h_panel_num1m',
        specs: { ram: '0.5', cpu: '50', disk: '5' }
    },
    { 
        name: 'Node/Bot Server', 
        price: 15000, 
        id: 'h_panel_node',
        specs: { ram: '4', cpu: '200', disk: '40' }
    }
];

async function askMickeyBiz(query, userName, context = "") {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI. Unauza bando na panel za server zilizowekwa spesifikeshoni zake. Mteja ni ${userName}. Jibu kishkaji sana (Bongo Slang).`;
        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Lipia mwanangu tuwashe mitambo.";
    } catch (e) { return "Nipo hapa! Lipia chap nikuwashie mitambo."; }
}

/**
 * Function ya kuunda User na Server kiotomatiki kwenye Pterodactyl Panel
 */
async function createPterodactylServer(userName, userJid, pkg) {
    try {
        const cleanJid = userJid.split('@')[0];
        const userPassword = Math.random().toString(36).slice(-10) + 'A1!'; // Auto-generate password
        
        // 1. Tengeneza User Account kwanza
        const userRes = await axios.post(`${PTERO_CONFIG.PANEL_URL}/api/application/users`, {
            username: `u_${cleanJid}`,
            email: `${cleanJid}@mickeybot.store`,
            first_name: userName.replace(/[^a-zA-Z0-9]/g, '') || 'Mteja',
            last_name: 'Glitch',
            password: userPassword
        }, {
            headers: { 
                'Authorization': `Bearer ${PTERO_CONFIG.API_KEY}`, 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            }
        });

        const pteroUserId = userRes.data.attributes.id;

        // 2. Badilisha Specs kwenda Megabytes (Pterodactyl Limits)
        const ramMb = parseFloat(pkg.ram) * 1024; 
        const diskMb = parseFloat(pkg.disk) * 1024;
        const cpuLimit = parseInt(pkg.cpu);

        // 3. Tengeneza Server (Node.js Environment)
        const serverRes = await axios.post(`${PTERO_CONFIG.PANEL_URL}/api/application/servers`, {
            name: `Node-${userName.replace(/[^a-zA-Z0-9]/g, '')}`,
            user: pteroUserId,
            egg: PTERO_CONFIG.EGG_ID,
            docker_image: "ghcr.io/pterodactyl/yolks:node_18", 
            startup: "node index.js", 
            limits: { memory: ramMb, swap: 0, disk: diskMb, io: 500, cpu: cpuLimit },
            feature_limits: { databases: 1, allocations: 1, backups: 1 },
            deploy: { locations: [PTERO_CONFIG.LOCATION_ID], dedicated_ip: false, port_range: [] },
            environment: { INST: "npm install" } 
        }, {
            headers: { 
                'Authorization': `Bearer ${PTERO_CONFIG.API_KEY}`, 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            }
        });

        return {
            success: true,
            link: PTERO_CONFIG.PANEL_URL,
            username: `u_${cleanJid}`,
            password: userPassword,
            serverName: serverRes.data.attributes.name
        };

    } catch (error) {
        console.error("Pterodactyl Automation Error:", error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // TAMBUA INPUT (Inasoma text au majibu ya buttons)
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

        // ==========================================
        // [UPANDE WA PANEL / SERVER LOGIC]
        // ==========================================

        // A. Menu kuu ya Server (.halotel server)
        if (input === '.halotel server') {
            await sock.sendMessage(chatId, { react: { text: '🖥️', key: m.key } });

            const panelRows = PANEL_PACKAGES.map(p => ({
                header: p.name,
                title: `RAM: ${p.specs.ram} GB | CPU: ${p.specs.cpu}%`,
                description: `💾 Disk: ${p.specs.disk} GB SSD — TSh ${p.price.toLocaleString()}`,
                id: p.id 
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: `Inakuwaje *${userName}*! 👋\n\nKaribu kwenye *ZERO TR4SH STORE* 🖥️\nHapa kuna server zenye nguvu kwa ajili ya bot zako.\n\nChagua package yenye specs unazotaka hapa chini nikuwashe VPS: 👇`,
                footer: CONFIG.FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🛒 CHAGUA SERVER SPECS",
                        sections: [{ title: "SERVER & PANELS", rows: panelRows }]
                    })
                }]
            }, { quoted: m });
        }

        // B. Kamata Oda ya Server iliyochaguliwa na kuitengeneza kiotomatiki
        const selectedPanel = PANEL_PACKAGES.find(p => p.id === input);
        if (selectedPanel) {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });
            await sock.sendMessage(chatId, { text: '⏳ *Tafadhali subiri kidogo, ninafanya mawasiliano na Pterodactyl kuandaa mitambo yako...*' });

            // Inaita Pterodactyl kuunda user na server papo hapo
            const creation = await createPterodactylServer(userName, userJid, selectedPanel.specs);

            if (creation.success) {
                return await sock.sendMessage(chatId, {
                    text: `*PANEL YAKO IPO TAYARI!* 🎉\n\nMitambo imewashwa kiotomatiki kwenye panel. Hapa kuna login details zako:\n\n🔗 *Link:* ${creation.link}\n👤 *Username:* ${creation.username}\n🔑 *Password:* ${creation.password}\n\n⚙️ *Specs Zilizowekwa:* \n   • 🧠 *RAM:* ${selectedPanel.specs.ram} GB\n   • 🏎️ *CPU:* ${selectedPanel.specs.cpu}%\n   • 💾 *DISK:* ${selectedPanel.specs.disk} GB\n\n_Tafadhali ingia na ubadilishe password yako mara moja kwa usalama!_ 🚀`
                }, { quoted: m });
            } else {
                await sock.sendMessage(chatId, { text: `❌ Samahani mwanangu, mfumo umepata hitilafu kidogo wakati wa kuunda server yako kwenye panel. Admin amearifiwa.` }, { quoted: m });
                // Inamtaarifu mmiliki wa bot kupitia namba iliyopo settings.js ya ownerNumber
                const adminJid = `${settings.ownerNumber}@s.whatsapp.net`;
                return await sock.sendMessage(adminJid, { text: `🚨 *PTERODACTYL ERROR!* \n\nBot imefeli kumtengenezea server mteja: *${userName}* (${userJid}).\nError Message: ${creation.error}` });
            }
        }

        // ==========================================
        // [UPANDE WA BANDO LA KAWAIDA LOGIC]
        // ==========================================

        // C. Direct Package Handler (.halotel 10gb)
        if (input.includes('gb') && (input.startsWith('.halotel') || input.includes('h_pkg'))) {
            const gbValue = input.match(/\d+/)[0]; 
            const totalPrice = parseInt(gbValue) * CONFIG.PRICE_PER_GB;

            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });

            const aiInstruction = await askMickeyBiz(`Mteja kachagua ${gbValue}GB. Mpe maelekezo ya malipo ya TSh ${totalPrice}.`, userName);

            const paymentButtons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: `📋 Copy No: ${CONFIG.PAYMENT_NO}`,
                        copy_code: CONFIG.PAYMENT_NO
                    })
                }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                text: `✨ *MICKEY BIZ - ODA YAKO*\n\n${aiInstruction}\n\n📊 *DATA:* ${gbValue}GB\n💰 *BEI:* TSh ${totalPrice.toLocaleString()}\n📌 *MTANDAO:* Halotel\n\nUkishalipa, tuma screenshot hapa chap! 🚀`,
                footer: CONFIG.FOOTER,
                interactiveButtons: paymentButtons
            }, { quoted: m });
        }

        // D. Menu Kuu ya Bando (.halotel pekee)
        if (input === '.halotel') {
            await sock.sendMessage(chatId, { react: { text: '🛒', key: m.key } });

            const rows = PACKAGES.map(p => ({
                header: `${p.gb}GB`,
                title: p.label,
                description: `TSh ${(p.gb * CONFIG.PRICE_PER_GB).toLocaleString()}`,
                id: `.halotel ${p.gb}gb`
            }));

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: `Mambo vipi *${userName}*! 👋\n\nChagua bando lako la *Halotel* hapa chini nikupe namba ya malipo chap! 👇\n\n_(Kama unataka Panel za Server, andika *.halotel server*)_`,
                footer: CONFIG.FOOTER,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🛒 ORODHA YA VIFURUSHI",
                        sections: [{ title: "HALOTEL BANDO", rows: rows }]
                    })
                }]
            }, { quoted: m });
        }

        // AI Conversation ya kawaida isiyo na dot command
        if (input.length > 2 && !input.startsWith('.')) {
            const aiReply = await askMickeyBiz(input, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

    } catch (e) {
        console.error("Halotel Command Error:", e);
    }
}

module.exports = halotelCommand;
