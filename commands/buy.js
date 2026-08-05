/**
 * buy.js - Modern Pterodactyl System with Native Buttons & Custom UI
 */

const axios = require('axios');
const moment = require('moment-timezone');
const { Button, ButtonV2 } = require('../lib/messageBuilder');

// ─── 1. CORE CONFIG ────────────────────────────────────────────────────────
const PANEL_CONFIG = {
    baseUrl: "https://panel.mickeypannel.dpdns.org",
    apiKey: "ptla_Lkp1S3qISOERsFvYfmu4k3G7efrkY8vffL6854NcJ0k",
    eggId: 15,
    locationId: 1,
    nestId: 5,
    timezone: "Africa/Nairobi",
    thumbnail: "https://files.catbox.moe/54sbu9.png"
};

const PLAN_SPECS = {
    '1gb':       { ram: 1024,  cpu: 100, disk: 5120,   price: 'TSh 5,000'  },
    '2gb':       { ram: 2048,  cpu: 150, disk: 10240,  price: 'TSh 8,000'  },
    '5gb':       { ram: 5120,  cpu: 250, disk: 20480,  price: 'TSh 15,000' },
    '10gb':      { ram: 10240, cpu: 400, disk: 40960,  price: 'TSh 25,000' },
    'unlimited': { ram: 20480, cpu: 800, disk: 102400, price: 'TSh 50,000' }
};

// ─── 2. AXIOS CLIENT ───────────────────────────────────────────────────────
const panelApi = axios.create({
    baseURL: `${PANEL_CONFIG.baseUrl}/api/application`,
    headers: {
        'Authorization': `Bearer ${PANEL_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 15000
});

// ─── 3. UI HELPERS ─────────────────────────────────────────────────────────

// Display kawaida inayotumia MessageBuilder kwa Menus/Errors
async function dispatchCard(ctx, { title, body, buttons = [] }) {
    const client = ctx.core || ctx.sock || ctx.client || ctx;
    const chatJid = ctx.chatId || ctx.chat || ctx.from || ctx._msg?.key?.remoteJid || ctx.sender;
    const msgQuote = ctx._msg;

    try {
        if (buttons.length > 0) {
            const btnV2 = new ButtonV2(client)
                .setTitle(title)
                .setBody(body)
                .setFooter('⚡ MICKEY GLITCH TECH')
                .setThumbnail(PANEL_CONFIG.thumbnail);

            buttons.forEach(btn => btnV2.addButton(btn.label, btn.id));
            return await btnV2.send(chatJid, { quoted: msgQuote });
        }

        const btnV1 = new Button(client)
            .setTitle(title)
            .setBody(body)
            .setFooter('⚡ MICKEY GLITCH TECH')
            .setImage(PANEL_CONFIG.thumbnail);

        return await btnV1.send(chatJid, { quoted: msgQuote });
    } catch (err) {
        return await client?.sendMessage?.(chatJid, { text: `*${title}*\n\n${body}` });
    }
}

// Helper ya kutuma NATIVE BUTTONS pekee kwa taarifa za Server
async function sendNativeCard(ctx, { text, footer, buttons = [] }) {
    const client = ctx.core || ctx.sock || ctx.client || ctx;
    const chatJid = ctx.chatId || ctx.chat || ctx.from || ctx._msg?.key?.remoteJid || ctx.sender;
    const msgQuote = ctx._msg;

    // Baileys Native Button Structure
    const buttonMessage = {
        text: text,
        footer: footer || '⚡ MICKEY GLITCH TECH',
        buttons: buttons.map((b, i) => ({
            buttonId: b.id || `btn_${i}`,
            buttonText: { displayText: b.label },
            type: 1
        })),
        headerType: 1
    };

    try {
        return await client.sendMessage(chatJid, buttonMessage, { quoted: msgQuote });
    } catch (e) {
        // Fallback kama Native Buttons hazi-support-wi kwenye toleo la WhatsApp la mpokeaji
        return await client.sendMessage(chatJid, { text: `${text}\n\n_${footer}_` }, { quoted: msgQuote });
    }
}

// ─── 4. PARSER & USER MANAGER ──────────────────────────────────────────────
function parseInput(ctx) {
    let rawArgs = ctx.args || [];
    if (typeof rawArgs === 'string') rawArgs = rawArgs.split(' ');
    if (ctx.text && rawArgs.length === 0) {
        const parts = ctx.text.trim().split(/\s+/);
        rawArgs = parts.slice(1);
    }

    let plan = '1gb';
    let username = '';
    let targetJid = ctx.quoted?.sender || ctx.mentionedJid?.[0] || ctx.sender;

    const filteredArgs = [];
    for (const item of rawArgs) {
        const cleanItem = item.toLowerCase().trim();
        if (PLAN_SPECS[cleanItem]) {
            plan = cleanItem;
        } else if (cleanItem.match(/^\d{10,15}$/)) {
            targetJid = `${cleanItem}@s.whatsapp.net`;
        } else if (cleanItem.includes('@s.whatsapp.net')) {
            targetJid = cleanItem;
        } else {
            filteredArgs.push(item);
        }
    }

    username = filteredArgs.join('').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!username) username = `user${Math.floor(1000 + Math.random() * 9000)}`;

    return { plan, username, targetJid };
}

async function getOrCreateUser(username, userPass) {
    const email = `${username}@gmail.com`;
    
    try {
        const userRes = await panelApi.post('/users', {
            email: email,
            username: username,
            first_name: username,
            last_name: "Client",
            language: "en",
            password: String(userPass)
        });
        return userRes.data.attributes;
    } catch (error) {
        const errorDetail = error?.response?.data?.errors?.[0]?.detail || error.message || '';
        
        if (errorDetail.includes('email has already been taken') || errorDetail.includes('username has already been taken')) {
            const searchRes = await panelApi.get(`/users?filter[email]=${email}`);
            if (searchRes.data.data && searchRes.data.data.length > 0) {
                return searchRes.data.data[0].attributes;
            }
        }
        throw error;
    }
}

// ─── 5. MAIN ENGINE ────────────────────────────────────────────────────────
async function createPanel(ctx) {
    const { plan, username } = parseInput(ctx);
    const spec = PLAN_SPECS[plan];
    const userPass = `@${username}${Math.floor(1000 + Math.random() * 9000)}`;
    const createDate = moment().tz(PANEL_CONFIG.timezone).format("DD-MM-YYYY HH:mm");

    try {
        // A. Process User
        const createdUser = await getOrCreateUser(username, userPass);

        // B. Process Server
        await panelApi.post('/servers', {
            name: `${username}-srv`,
            user: createdUser.id,
            egg: PANEL_CONFIG.eggId,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18", 
            startup: "npm start",
            environment: { 
                INST: "npm", 
                USER_UPLOAD: "0", 
                AUTO_UPDATE: "0", 
                CMD_RUN: "npm start",
                MAIN_FILE: "index.js", 
                JS_FILE: "index.js" 
            },
            limits: { memory: spec.ram, swap: 0, disk: spec.disk, io: 500, cpu: spec.cpu },
            feature_limits: { databases: 0, backups: 0, allocations: 0 },
            deploy: { locations: [PANEL_CONFIG.locationId], dedicated_ip: false, port_range: [] }
        });

        // C. Taarifa za Server kwa kutumia NATIVE BUTTONS
        const credsText = 
            `╭─────────────━┈-🎯\n` +
            `│ 🚀 *PTERODACTYL PANEL READY*\n` +
            `╭─────────────━┈-🎯\n` +
            `│ 👤 *Username:* \`${createdUser.username}\`\n` +
            `│ 🔑 *Password:* \`${userPass}\`\n` +
            `│ 📦 *Plan:* ${plan.toUpperCase()} (${spec.ram}MB)\n` +
            `│ 🧠 *CPU Limit:* ${spec.cpu}%\n` +
            `│ 💿 *Disk Space:* ${spec.disk}MB\n` +
            `│ 🌐 *Link:* ${PANEL_CONFIG.baseUrl}\n` +
            `│ 📅 *Created:* ${createDate}\n` +
            `╰─────────────━┈-🎯\n\n` +
            `> *⚠️ Hifadhi maelezo haya mahali salama!*`;

        await sendNativeCard(ctx, {
            text: credsText,
            footer: '⚡ Powered by Mickey Glitch Tech',
            buttons: [
                { label: '📋 Menu', id: '.menu' },
                { label: '📞 Owner Support', id: '.owner' }
            ]
        });

        return true;
    } catch (error) {
        const errorDetail = error?.response?.data?.errors?.[0]?.detail || error.message || 'API Connection Failed';
        
        // Error response inatumia MessageBuilder
        await dispatchCard(ctx, {
            title: '❌ CREATION FAILURE',
            body: `Imeshindwa kutengeneza server.\n\n*Sababu:* ${errorDetail}`
        });
        return false;
    }
}

// ─── 6. EXPORTS ─────────────────────────────────────────────────────────────
module.exports = {
    name: 'buy',
    aliases: ['buygb', 'panel', 'createpanel'],
    category: 'panel',
    permissions: { owner: true },

    code: async (ctx) => {
        const argsText = Array.isArray(ctx.args) ? ctx.args.join(' ') : String(ctx.args || '');

        if (!argsText || argsText === 'help') {
            const menuBody = 
                `📌 *Jinsi ya Kutumia:*\n` +
                `\`.buy <plan> <username>\`\n\n` +
                `📋 *Mipango Iliyopo (Plans):*\n` +
                `• *1gb*  - TSh 5,000\n` +
                `• *2gb*  - TSh 8,000\n` +
                `• *5gb*  - TSh 15,000\n` +
                `• *10gb* - TSh 25,000\n` +
                `• *unlimited* - TSh 50,000`;

            return await dispatchCard(ctx, {
                title: '🛒 PANEL PURCHASE MENU',
                body: menuBody,
                buttons: [{ label: '📞 Help / Owner', id: '.owner' }]
            });
        }

        await createPanel(ctx);
    }
};

module.exports.createPanel = createPanel;
