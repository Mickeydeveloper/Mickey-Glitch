const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');
const { PTERO_CONFIG, CONFIG } = require('./settings');

// List ya Bidhaa
const PACKAGES = [
    { gb: 10, label: 'Standard Pack' }, { gb: 20, label: 'Silver Pack' }, { gb: 50, label: 'Business Pack' }
];

const PANEL_PACKAGES = [
    { name: 'Panel 1GB', price: 5000, id: 'h_panel_1gb', specs: { ram: '1', cpu: '100', disk: '10' } },
    { name: 'Node/Bot Server', price: 15000, id: 'h_panel_node', specs: { ram: '4', cpu: '200', disk: '40' } }
];

// Pterodactyl Automation
async function createPterodactylServer(userName, userJid, pkg) {
    try {
        const cleanJid = userJid.split('@')[0];
        const pass = Math.random().toString(36).slice(-10) + 'A1!';
        
        const user = await axios.post(`${PTERO_CONFIG.PANEL_URL}/api/application/users`, 
            { username: `u_${cleanJid}`, email: `${cleanJid}@bot.store`, first_name: userName, last_name: 'User', password: pass },
            { headers: { 'Authorization': `Bearer ${PTERO_CONFIG.API_KEY}` }});

        const server = await axios.post(`${PTERO_CONFIG.PANEL_URL}/api/application/servers`, {
            name: `Node-${userName}`, user: user.data.attributes.id, egg: PTERO_CONFIG.EGG_ID,
            docker_image: "ghcr.io/pterodactyl/yolks:node_18", startup: "node index.js",
            limits: { memory: pkg.ram * 1024, swap: 0, disk: pkg.disk * 1024, io: 500, cpu: pkg.cpu },
            deploy: { locations: [PTERO_CONFIG.LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { headers: { 'Authorization': `Bearer ${PTERO_CONFIG.API_KEY}` }});

        return { success: true, user: `u_${cleanJid}`, pass, link: PTERO_CONFIG.PANEL_URL };
    } catch (e) { return { success: false, error: e.message }; }
}

async function halotelCommand(sock, chatId, m, body = '') {
    let input = (m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || body).toLowerCase().trim();
    if (input === 'halotel') input = '.halotel';
    const userName = m.pushName || 'Mteja';

    // 1. Menu ya Panel (.halotel server)
    if (input === '.halotel server') {
        const rows = PANEL_PACKAGES.map(p => ({ header: p.name, title: `TSh ${p.price}`, description: `RAM: ${p.specs.ram}GB, CPU: ${p.specs.cpu}%`, id: p.id }));
        return await sendInteractiveMessage(sock, chatId, {
            image: { url: CONFIG.BANNER },
            text: `Karibu *${userName}*! Chagua Server Specs unazotaka:`,
            footer: CONFIG.FOOTER,
            interactiveButtons: [{ name: "single_select", buttonParamsJson: JSON.stringify({ title: "🛒 CHAGUA SERVER", sections: [{ title: "PANELS", rows }] }) }]
        }, { quoted: m });
    }

    // 2. Process ya Panel
    const selectedPanel = PANEL_PACKAGES.find(p => p.id === input);
    if (selectedPanel) {
        await sock.sendMessage(chatId, { text: '⏳ *Tafadhali subiri, naandaa server yako...*' });
        const res = await createPterodactylServer(userName, chatId, selectedPanel.specs);
        if (res.success) {
            return await sock.sendMessage(chatId, { text: `✅ *SERVER TAYARI!*\n\n🔗 *Link:* ${res.link}\n👤 *User:* ${res.user}\n🔑 *Pass:* ${res.pass}` });
        } else {
            return await sock.sendMessage(chatId, { text: `❌ *Hitilafu:* ${res.error}` });
        }
    }

    // 3. Menu ya Bando (.halotel)
    if (input === '.halotel') {
        const rows = PACKAGES.map(p => ({ header: `${p.gb}GB`, title: p.label, description: `TSh ${(p.gb * CONFIG.PRICE_PER_GB)}`, id: `.halotel ${p.gb}gb` }));
        return await sendInteractiveMessage(sock, chatId, {
            image: { url: CONFIG.BANNER },
            text: `Mambo vipi *${userName}*! Chagua bando la Halotel au andika *.halotel server* kwa VPS:`,
            footer: CONFIG.FOOTER,
            interactiveButtons: [{ name: "single_select", buttonParamsJson: JSON.stringify({ title: "🛒 BANDO", sections: [{ title: "HALOTEL", rows }] }) }]
        }, { quoted: m });
    }
}

module.exports = halotelCommand;
