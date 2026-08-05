/**
 * buy.js - Ultimate Panel Purchase System
 * Usage: .buy <plan> <username> [target]
 */

const moment = require("moment-timezone");
const axios = require("axios");
const { Button, ButtonV2 } = require('../lib/messageBuilder');

// ─── CONFIGURATION ───────────────────────────────────────────────────────
const CONFIG = {
    timeout: 15000,
    defaultEgg: "15",
    defaultLocation: "1",
    defaultNest: "5",
    timezone: "Africa/Nairobi",
    thumbnail: "https://files.catbox.moe/54sbu9.png"
};

const PLANS = {
    '1gb': { memo: 1024, cpu: 100, disk: 5120, price: "TSh 5,000", label: "1GB RAM" },
    '2gb': { memo: 2048, cpu: 150, disk: 10240, price: "TSh 8,000", label: "2GB RAM" },
    '5gb': { memo: 5120, cpu: 250, disk: 20480, price: "TSh 15,000", label: "5GB RAM" },
    '10gb': { memo: 10240, cpu: 400, disk: 40960, price: "TSh 25,000", label: "10GB RAM" },
    'unlimited': { memo: 20480, cpu: 800, disk: 102400, price: "TSh 50,000", label: "Unlimited RAM" }
};

// ─── HELPERS ─────────────────────────────────────────────────────────────
function parseArguments(args) {
    const result = { plan: '1gb', username: '', target: null, hasTarget: false };
    if (!args || args.length === 0) return result;

    const argsArray = Array.isArray(args) ? args : args.split(' ');
    const cleaned = argsArray.filter(a => a && a.trim().length > 0);

    for (let i = 0; i < cleaned.length; i++) {
        const arg = cleaned[i].toLowerCase();
        if (arg in PLANS) {
            result.plan = arg;
            cleaned.splice(i, 1);
            break;
        }
    }

    for (let i = 0; i < cleaned.length; i++) {
        const arg = cleaned[i];
        if (arg.includes('@') && arg.match(/^[0-9]+@/)) {
            result.target = arg;
            result.hasTarget = true;
            cleaned.splice(i, 1);
            break;
        }
        if (arg.match(/^[0-9]{10,15}$/)) {
            result.target = `${arg}@s.whatsapp.net`;
            result.hasTarget = true;
            cleaned.splice(i, 1);
            break;
        }
    }

    if (cleaned.length > 0) {
        result.username = cleaned.join(' ');
    }

    return result;
}

function extractUser(ctx) {
    let args = ctx.args || [];
    if (typeof args === 'string') args = args.split(' ');
    if (ctx.text) {
        const parts = ctx.text.split(' ');
        if (parts.length > 1) args = parts.slice(1);
    }

    const parsed = parseArguments(args);
    const username = parsed.username || ctx.sender?.split('@')[0] || 'user';
    let target = parsed.target;

    if (!target) {
        target = ctx.quoted?.sender || ctx.mentionedJid?.[0] || ctx.sender;
    }

    return { username, targetJid: target, plan: parsed.plan };
}

function resolveChatId(ctx) {
    return ctx?.chatId || ctx?.chat || ctx?.from || ctx?._msg?.key?.remoteJid || ctx?.sender;
}

function resolveClient(ctx) {
    return ctx?.core || ctx?.sock || ctx?.client || ctx;
}

async function sendCard(ctx, { title, body, footer = '⚡ MICKEY GLITCH SUB', buttons = [], image = CONFIG.thumbnail }) {
    const client = resolveClient(ctx);
    const recipient = resolveChatId(ctx);

    try {
        if (buttons.length > 0) {
            const builder = new ButtonV2(client)
                .setTitle(title)
                .setBody(body)
                .setFooter(footer)
                .setThumbnail(image);

            buttons.forEach(b => builder.addButton(b.label, b.id));
            return await builder.send(recipient, { quoted: ctx?._msg });
        }

        const builder = new Button(client)
            .setTitle(title)
            .setBody(body)
            .setFooter(footer)
            .setImage(image);

        return await builder.send(recipient, { quoted: ctx?._msg });
    } catch (e) {
        return await client?.sendMessage?.(recipient, { text: `${title}\n\n${body}` });
    }
}

// ─── API PTERODACTYL ──────────────────────────────────────────────────────
async function createPterodactylUser(domain, apiKey, username, password) {
    const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const response = await axios.post(
        `${domain}/api/application/users`,
        {
            email: `${cleanUser}@gmail.com`,
            username: cleanUser,
            first_name: username,
            last_name: "User",
            language: "en",
            password: String(password)
        },
        {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            timeout: CONFIG.timeout
        }
    );
    return response.data.attributes;
}

async function createPterodactylServer(domain, apiKey, userId, username, specs, eggId, locationId) {
    const response = await axios.post(
        `${domain}/api/application/servers`,
        {
            name: `${username}-server`,
            user: userId,
            egg: parseInt(eggId, 10),
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "npm start",
            environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
            limits: { memory: specs.memo, swap: 0, disk: specs.disk, io: 500, cpu: specs.cpu },
            feature_limits: { databases: 0, backups: 0, allocations: 0 },
            deploy: { locations: [parseInt(locationId, 10)], dedicated_ip: false, port_range: [] }
        },
        {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            timeout: CONFIG.timeout
        }
    );
    return response.data.attributes;
}

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────
async function createPanel(ctx) {
    const { username, targetJid, plan } = extractUser(ctx);

    // Hardcoded credentials moja kwa moja ili kuzuia Config Error
    const domain = "https://panel.mickeypannel.dpdns.org";
    const apiKey = "ptla_Lkp1S3qISOERsFvYfmu4k3G7efrkY8vffL6854NcJ0k";
    const eggId = "15";
    const locationId = "1";

    if (!domain || !apiKey) {
        await sendCard(ctx, {
            title: '⚠️ SYSTEM CONFIG ERROR',
            body: '❌ *Panel setup haijakamilika!*',
            buttons: [{ label: '📞 Owner', id: '.owner' }]
        });
        return false;
    }

    const planSpecs = PLANS[plan] || PLANS['1gb'];
    const cleanUser = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const password = `@${cleanUser}${Math.floor(1000 + Math.random() * 9000)}`;

    try {
        // 1. Create User
        const user = await createPterodactylUser(domain, apiKey, username, password);

        // 2. Create Server
        const server = await createPterodactylServer(domain, apiKey, user.id, username, planSpecs, eggId, locationId);

        // 3. Send Credentials
        const credsText = 
            `🌐 *PTERODACTYL PANEL DETAILS*\n\n` +
            `👤 *Username:* \`${user.username}\`\n` +
            `🔑 *Password:* \`${password}\`\n` +
            `📦 *Plan:* ${planSpecs.label}\n` +
            `🔗 *URL:* ${domain}\n\n` +
            `⚠️ *Hifadhi taarifa hizi usipoteze!*`;

        await sendCard(ctx, {
            title: '🎉 PANEL SUCCESS',
            body: credsText,
            buttons: [
                { label: '🌐 Open Panel', id: `${domain}` }
            ]
        });

        return true;
    } catch (error) {
        const errMessage = error?.response?.data?.errors?.[0]?.detail || error.message || 'Unknown Error';
        await sendCard(ctx, {
            title: '❌ PANEL CREATION FAILED',
            body: `❌ Imeshindwa kutengeneza panel.\n\n*Reason:* ${errMessage}`
        });
        return false;
    }
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────
module.exports = {
    name: 'buy',
    aliases: ['buygb', 'panel'],
    category: 'panel',
    permissions: { owner: true },

    code: async (ctx) => {
        const raw = Array.isArray(ctx.args) ? ctx.args.join(' ') : String(ctx.args || '');

        if (!raw || raw === 'help') {
            return await sendCard(ctx, {
                title: '🛒 PANEL MENU',
                body: `*Matumizi:* .buy <plan> <username>\n\n*Mipango (Plans):*\n• 1gb - TSh 5,000\n• 2gb - TSh 8,000\n• 5gb - TSh 15,000\n• 10gb - TSh 25,000\n• unlimited - TSh 50,000`
            });
        }

        await createPanel(ctx);
    }
};
module.exports.createPanel = createPanel;
