/**
 * buy.js - Ultimate Panel Purchase System
 * Never before seen - Handles ALL input formats
 * Usage: .buy <plan> <username> [target]
 */

const moment = require("moment-timezone");
const axios = require("axios");
const { Button, ButtonV2, createCtx } = require('../lib/messageBuilder');

// ─── ──────────────────────────────────────────────────────────────────────
// 1. SUPER CONFIG
// ─── ──────────────────────────────────────────────────────────────────────
const CONFIG = {
    timeout: 15000,
    retries: 3,
    retryDelay: 2000,
    defaultMemo: 1024,
    defaultCpu: 100,
    defaultDisk: 5120, 
    defaultEgg: "5",
    defaultLocation: "1",
    defaultNest: "1",
    timezone: "Africa/Nairobi",
    thumbnail: "https://files.catbox.moe/54sbu9.png"
};

function formatPanelError(error, context = 'PTERODACTYL') {
    const responseData = error?.response?.data;
    const responseText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2);
    const message = responseData?.errors?.map((item) => item?.detail || JSON.stringify(item)).join('\n')
        || responseData?.message
        || error?.message
        || 'Unknown panel error';

    return {
        context,
        message,
        status: error?.response?.status || null,
        url: error?.config?.url || null,
        method: error?.config?.method || null,
        requestData: error?.config?.data || null,
        responseData: responseData || null,
        responseText,
        stack: error?.stack || null,
    };
}

function logPanelEvent(stage, details) {
    console.log(`[PTERODACTYL][${stage}]`, JSON.stringify(details, null, 2));
}

// ─── PLANS ──────────────────────────────────────────────────────────────────
const PLANS = {
    '1gb': { memo: 1024, cpu: 100, disk: 5120, price: "TSh 5,000", label: "1GB" },
    '2gb': { memo: 2048, cpu: 150, disk: 10240, price: "TSh 8,000", label: "2GB" },
    '5gb': { memo: 5120, cpu: 250, disk: 20480, price: "TSh 15,000", label: "5GB" },
    '10gb': { memo: 10240, cpu: 400, disk: 40960, price: "TSh 25,000", label: "10GB" },
    'unlimited': { memo: 20480, cpu: 800, disk: 102400, price: "TSh 50,000", label: "Unlimited" }
};

// ─── ──────────────────────────────────────────────────────────────────────
// 2. SUPER HELPERS
// ─── ──────────────────────────────────────────────────────────────────────

// ─── ULTIMATE ARGUMENT PARSER ──────────────────────────────────────────────
function parseArguments(args) {
    const result = { plan: '1gb', username: '', target: null, hasTarget: false };
    
    if (!args || args.length === 0) return result;
    
    const argsArray = Array.isArray(args) ? args : args.split(' ');
    const cleaned = argsArray.filter(a => a && a.trim().length > 0);
    
    // ─── Find plan ──────────────────────────────────────────────────────
    for (let i = 0; i < cleaned.length; i++) {
        const arg = cleaned[i].toLowerCase();
        if (arg in PLANS) {
            result.plan = arg;
            cleaned.splice(i, 1);
            break;
        }
        // Check for plan like "1gb" without space
        const planMatch = arg.match(/^(\d+gb|unlimited)$/i);
        if (planMatch) {
            result.plan = planMatch[0].toLowerCase();
            cleaned.splice(i, 1);
            break;
        }
    }
    
    // ─── Find target (number with @ or just number) ────────────────────
    for (let i = 0; i < cleaned.length; i++) {
        const arg = cleaned[i];
        // Check if it's a number with @
        if (arg.includes('@') && arg.match(/^[0-9]+@/)) {
            result.target = arg;
            result.hasTarget = true;
            cleaned.splice(i, 1);
            break;
        }
        // Check if it's just a number
        if (arg.match(/^[0-9]{10,15}$/)) {
            result.target = `${arg}@s.whatsapp.net`;
            result.hasTarget = true;
            cleaned.splice(i, 1);
            break;
        }
        // Check if it has - (username-number format)
        if (arg.includes('-')) {
            const parts = arg.split('-');
            if (parts.length === 2 && parts[1].match(/^[0-9]+$/)) {
                result.username = parts[0];
                result.target = `${parts[1]}@s.whatsapp.net`;
                result.hasTarget = true;
                cleaned.splice(i, 1);
                break;
            }
        }
    }
    
    // ─── Remaining is username ──────────────────────────────────────────
    if (cleaned.length > 0) {
        result.username = cleaned.join(' ');
    }
    
    return result;
}

// ─── ULTIMATE USER EXTRACTOR ──────────────────────────────────────────────
function extractUser(ctx) {
    const result = { username: '', target: null, targetJid: null, plan: '1gb' };
    
    // ─── Get args from ctx ──────────────────────────────────────────────
    let args = ctx.args || [];
    if (typeof args === 'string') args = args.split(' ');
    if (ctx.text) {
        const parts = ctx.text.split(' ');
        if (parts.length > 1) args = parts.slice(1);
    }
    
    // ─── Parse arguments ────────────────────────────────────────────────
    const parsed = parseArguments(args);
    result.plan = parsed.plan;
    
    // ─── Get username ────────────────────────────────────────────────────
    if (parsed.username) {
        result.username = parsed.username;
    } else {
        // Try to get from sender
        result.username = ctx.sender?.split('@')[0] || 'user';
    }
    
    // ─── Get target ──────────────────────────────────────────────────────
    if (parsed.hasTarget && parsed.target) {
        result.target = parsed.target;
        result.targetJid = parsed.target;
    } else if (ctx.quoted) {
        result.target = ctx.quoted.sender || ctx.quoted.key?.participant;
        result.targetJid = result.target;
    } else if (ctx.mentionedJid && ctx.mentionedJid.length > 0) {
        result.target = ctx.mentionedJid[0];
        result.targetJid = result.target;
    } else {
        result.target = ctx.sender || ctx._msg?.key?.participant || ctx._msg?.key?.remoteJid;
        result.targetJid = result.target;
    }
    
    return result;
}

// ─── SUPER SAFE SEND ──────────────────────────────────────────────────────
async function superSend(ctx, target, content) {
    const methods = [
        () => ctx?.sendMessage?.(target, content),
        () => ctx?.core?.sendMessage?.(target, content),
        () => ctx?.sock?.sendMessage?.(target, content),
        () => ctx?.reply?.(content.text || content),
        () => ctx?._msg?.key?.remoteJid && ctx.core?.sendMessage?.(ctx._msg.key.remoteJid, content),
        () => ctx?._msg?.key?.remoteJid && ctx.sock?.sendMessage?.(ctx._msg.key.remoteJid, content)
    ];
    
    for (const method of methods) {
        try {
            const result = await method();
            if (result) return result;
        } catch (e) {
            continue;
        }
    }
    console.error("[SUPER SEND] All methods failed");
    return null;
}

// ─── SUPER SAFE REPLY ─────────────────────────────────────────────────────
async function superReply(ctx, text) {
    const methods = [
        () => ctx?.reply?.(text),
        () => ctx?.sendMessage?.(ctx.chatId || ctx.chat || ctx.from, { text }),
        () => ctx?.core?.sendMessage?.(ctx._msg?.key?.remoteJid, { text }),
        () => ctx?.sock?.sendMessage?.(ctx._msg?.key?.remoteJid, { text })
    ];
    
    for (const method of methods) {
        try {
            const result = await method();
            if (result) return result;
        } catch (e) {
            continue;
        }
    }
    console.error("[SUPER REPLY] All methods failed");
    return null;
}

function resolveChatId(ctx) {
    return ctx?.chatId || ctx?.chat || ctx?.from || ctx?._msg?.key?.remoteJid || ctx?.senderId || null;
}

function resolveClient(ctx) {
    return ctx?.core || ctx?.sock || ctx?.client || ctx || null;
}

async function sendStyledCard(ctx, {
    body,
    title = '📦 Mickey Glitch',
    footer = '⚡ Mickey Glitch Sub',
    buttons = [],
    targetJid,
    thumbnail = CONFIG.thumbnail,
    fallbackText,
    quoted = true,
} = {}) {
    const recipient = targetJid || resolveChatId(ctx);
    const client = resolveClient(ctx);
    const text = fallbackText || body || '⚠️ Message unavailable.';

    if (!recipient || !client) {
        return superReply(ctx, text);
    }

    try {
        if (buttons.length > 0) {
            const builder = new ButtonV2(client)
                .setTitle(title)
                .setBody(body)
                .setFooter(footer)
                .setThumbnail(thumbnail);

            buttons.forEach((button) => builder.addButton(button.label, button.id));
            return await builder.send(recipient, { quoted: quoted ? ctx?._msg : undefined, fallbackText: text });
        }

        const builder = new Button(client)
            .setTitle(title)
            .setBody(body)
            .setFooter(footer)
            .setImage(thumbnail);

        return await builder.send(recipient, { quoted: quoted ? ctx?._msg : undefined, fallbackText: text });
    } catch (error) {
        console.error('[STYLED CARD ERROR]', error.message || error);
        return superReply(ctx, text);
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 3. SUPER BUTTON BUILDER
// ─── ──────────────────────────────────────────────────────────────────────

async function sendSuperButtons(ctx, targetJid, username, password, domain) {
    const panelBody =
        `🚀 *PTERODACTYL PANEL DATA*\n\n` +
        `👤 *Username:* ${username}\n` +
        `🔑 *Password:* ${password}\n` +
        `🌐 *Server URL:* ${domain}\n\n` +
        `_Hifadhi taarifa hizi kwa usalama._`;

    const recipient = targetJid || resolveChatId(ctx);
    const client = resolveClient(ctx);

    if (!recipient || !client) {
        await superReply(ctx, panelBody);
        return true;
    }

    try {
        const button = new Button(client)
            .setTitle('🎯 Panel Credentials')
            .setBody(panelBody)
            .setImage(CONFIG.thumbnail)
            .setFooter('© MICKEY GLITCH TECH')
            .addCopy('📋 Copy Username', username)
            .addCopy('🔑 Copy Password', String(password))
            .addUrl('🌐 Open Panel', domain, false);

        await button.send(recipient, { quoted: ctx?._msg, fallbackText: panelBody });
        return true;
    } catch (error) {
        console.log('[BUTTON] Failed, sending plain text...', error.message || error);
        await superSend(ctx, recipient, { text: panelBody });
        return true;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. PTERODACTYL API FUNCTIONS
// ─── ──────────────────────────────────────────────────────────────────────

async function createPterodactylUser(domain, apiKey, username, password) {
    const email = `${username}@gmail.com`;
    const payload = {
        email,
        username,
        first_name: username,
        last_name: username,
        language: "en",
        password: String(password)
    };

    try {
        const response = await axios.post(
            `${domain}/api/application/users`,
            payload,
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                timeout: CONFIG.timeout
            }
        );

        if (response?.data?.errors) {
            const message = response.data.errors.map((item) => item?.detail || JSON.stringify(item)).join("\n");
            throw new Error(message);
        }

        logPanelEvent('USER_CREATED', { username, email, domain });
        return response.data.attributes;
    } catch (error) {
        const formatted = formatPanelError(error, 'CREATE_USER');
        console.error('[PTERODACTYL][CREATE_USER_FAILED]', JSON.stringify(formatted, null, 2));
        throw new Error(formatted.message || 'User creation failed');
    }
}

async function getExistingUser(domain, apiKey, username) {
    const response = await axios.get(
        `${domain}/api/application/users?filter[email]=${username}@gmail.com`,
        {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            timeout: CONFIG.timeout
        }
    );
    if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0].attributes;
    }
    return null;
}

async function fetchEggData(domain, apiKey, nestId, eggId) {
    const response = await axios.get(
        `${domain}/api/application/nests/${nestId}/eggs/${eggId}`,
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            timeout: CONFIG.timeout
        }
    );
    return response.data.attributes;
}

async function createPterodactylServer(domain, apiKey, userId, username, eggId, locationId, startupCmd, memo, cpu, disk, description) {
    const payload = {
        name: username,
        description: description || '',
        user: userId,
        egg: parseInt(eggId, 10),
        pack: null,
        image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: startupCmd,
        environment: {
            INST: "npm",
            USER_UPLOAD: "0",
            AUTO_UPDATE: "0",
            CMD_RUN: "npm start",
            JS_FILE: "index.js",
            MAIN_FILE: "index.js"
        },
        limits: {
            memory: memo || CONFIG.defaultMemo,
            swap: 0,
            disk: disk || CONFIG.defaultDisk,
            io: 500,
            cpu: cpu || CONFIG.defaultCpu
        },
        feature_limits: {
            databases: 0,
            backups: 0,
            allocations: 0
        },
        deploy: {
            locations: [parseInt(locationId, 10)],
            dedicated_ip: false,
            port_range: []
        }
    };

    try {
        const response = await axios.post(
            `${domain}/api/application/servers`,
            payload,
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                timeout: CONFIG.timeout
            }
        );

        if (response?.data?.errors) {
            const message = response.data.errors.map((item) => item?.detail || JSON.stringify(item)).join("\n");
            throw new Error(message);
        }

        logPanelEvent('SERVER_CREATED', { username, userId, domain, serverId: response?.data?.attributes?.id || null });
        return response.data.attributes;
    } catch (error) {
        const formatted = formatPanelError(error, 'CREATE_SERVER');
        console.error('[PTERODACTYL][CREATE_SERVER_FAILED]', JSON.stringify(formatted, null, 2));
        throw new Error(formatted.message || 'Server creation failed');
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. MAIN CREATE PANEL
// ─── ──────────────────────────────────────────────────────────────────────

async function createPanel(ctx) {
    try {
        // ─── Extract user info ──────────────────────────────────────────
        const userData = extractUser(ctx);
        const { username, targetJid, plan } = userData;
        
        if (!username || username.length < 1) {
            await sendStyledCard(ctx, {
                title: '⚠️ Missing Username',
                body: '❌ *Tafadhali andika username!*\n\n📌 Example: `.buy 1gb mickey`',
                footer: '⚡ Mickey Glitch Sub',
                fallbackText: '❌ *Tafadhali andika username!*\n\n📌 Example: `.buy 1gb mickey`',
            });
            return null;
        }
        
        if (!targetJid) {
            await sendStyledCard(ctx, {
                title: '⚠️ Missing Target',
                body: '❌ *Imeshindwa kupata namba!*\n\n📌 Reply ujumbe wa mtu au weka namba: `.buy 1gb mickey-255712345678`',
                footer: '⚡ Mickey Glitch Sub',
                fallbackText: '❌ *Imeshindwa kupata namba!*\n\n📌 Reply ujumbe wa mtu au weka namba: `.buy 1gb mickey-255712345678`',
            });
            return null;
        }
        
        // ─── Get plan specs ─────────────────────────────────────────────
        const planSpecs = PLANS[plan] || PLANS['1gb'];
        
        // ─── Get config ──────────────────────────────────────────────────
        const domain = global.PTERODACTYL?.domain || global.domain;
        const apiKey = global.PTERODACTYL?.apiKey || global.plta;
        const eggId = global.PTERODACTYL?.eggId || global.eggs || CONFIG.defaultEgg;
        const locationId = global.PTERODACTYL?.locationId || global.locc || CONFIG.defaultLocation;
        const nestId = global.PTERODACTYL?.nestId || global.nestId || CONFIG.defaultNest;
        const timezone = global.PTERODACTYL?.timezone || global.TIMEZONE || CONFIG.timezone;
        
        if (!domain || !apiKey) {
            await sendStyledCard(ctx, {
                title: '⚠️ Panel Setup Missing',
                body: '❌ *Panel configuration missing!*\n\nPlease contact the admin to configure the Pterodactyl panel credentials first.',
                footer: '⚡ Mickey Glitch Sub',
                fallbackText: '❌ *Panel configuration missing!*\n\nPlease contact the admin to configure the Pterodactyl panel credentials first.',
                buttons: [
                    { label: '📞 Contact Admin', id: '.owner' },
                    { label: '🛠️ Check Setup', id: '.menu' }
                ],
            });
            return null;
        }
        
        // ─── Generate password ──────────────────────────────────────────
        const password = `@${username}${Math.floor(Math.random() * 9999)}@`;
        const description = moment().tz(timezone).format("dddd, D MMMM - YYYY");
        
        // ─── Send processing ────────────────────────────────────────────
        await sendStyledCard(ctx, {
            title: '⏳ Creating Panel',
            body: `⏳ *Creating ${plan} (${planSpecs.memo}MB) panel for ${username}...*\n\nPlease wait while the panel is being prepared.`,
            footer: '⚡ Mickey Glitch Sub',
            fallbackText: `⏳ *Creating ${plan} (${planSpecs.memo}MB) panel for ${username}...*\n\nPlease wait while the panel is being prepared.`,
            buttons: [
                { label: '⏳ In Progress', id: '.buy' },
                { label: '📖 Help', id: '.buy help' }
            ],
        });
        
        // ─── Create or get user ─────────────────────────────────────────
        let user;
        try {
            user = await createPterodactylUser(domain, apiKey, username, password);
        } catch (error) {
            if (error.message.includes("email has already been taken")) {
                user = await getExistingUser(domain, apiKey, username);
                if (!user) {
                    await sendStyledCard(ctx, {
                        title: '⚠️ Username Conflict',
                        body: '❌ *User exists but cannot retrieve!*\n\nTry a different username.',
                        footer: '⚡ Mickey Glitch Sub',
                        fallbackText: '❌ *User exists but cannot retrieve!*\n\nTry a different username.',
                    });
                    return null;
                }
            } else {
                await sendStyledCard(ctx, {
                    title: '❌ Creation Failed',
                    body: `❌ *User Creation Failed*\n\n${error.message}`,
                    footer: '⚡ Mickey Glitch Sub',
                    fallbackText: `❌ *User Creation Failed*\n\n${error.message}`,
                });
                return null;
            }
        }
        
        // ─── Fetch egg ──────────────────────────────────────────────────
        let eggData;
        try {
            eggData = await fetchEggData(domain, apiKey, nestId, eggId);
        } catch (error) {
            await sendStyledCard(ctx, {
                title: '❌ Egg Fetch Failed',
                body: `❌ *Egg Fetch Failed*\n\n${error.message}`,
                footer: '⚡ Mickey Glitch Sub',
                fallbackText: `❌ *Egg Fetch Failed*\n\n${error.message}`,
            });
            return null;
        }
        
        const startupCmd = eggData.startup || "npm start";
        
        // ─── Send credentials ──────────────────────────────────────────
        await sendSuperButtons(ctx, targetJid, username, password, domain);
        
        // ─── Create server ──────────────────────────────────────────────
        let server;
        try {
            server = await createPterodactylServer(
                domain, apiKey, user.id, username, eggId, locationId,
                startupCmd, planSpecs.memo, planSpecs.cpu, planSpecs.disk, description
            );
        } catch (error) {
            await sendStyledCard(ctx, {
                title: '❌ Server Creation Failed',
                body: `❌ *Server Creation Failed*\n\n${error.message}`,
                footer: '⚡ Mickey Glitch Sub',
                fallbackText: `❌ *Server Creation Failed*\n\n${error.message}`,
            });
            return null;
        }
        
        // ─── Success ────────────────────────────────────────────────────
        const result = {
            status: true,
            user: { id: user.id, username: user.username },
            server: { id: server.id, name: server.name, identifier: server.identifier },
            credentials: { username, password, domain, panel_url: `${domain}/server/${server.identifier}` },
            specs: { plan, memo: planSpecs.memo, cpu: planSpecs.cpu, disk: planSpecs.disk, price: planSpecs.price }
        };
        
        const panelBody =
            `🚀 *Panel Created Successfully!*\n\n` +
            `👤 Username: ${username}\n` +
            `🆔 User ID: ${user.id}\n` +
            `🖥️ Server ID: ${server.id}\n` +
            `📦 Plan: ${plan}\n` +
            `💾 RAM: ${planSpecs.memo} MB\n` +
            `🧠 CPU: ${planSpecs.cpu}%\n` +
            `💿 Disk: ${planSpecs.disk} MB\n\n` +
            `✅ Credentials sent to the target number.`;

        const panelDetails =
            `🚀 *Panel Details*\n\n` +
            `👤 Username: ${username}\n` +
            `🔑 Password: ${password}\n` +
            `🌐 Panel URL: ${domain}/server/${server.identifier}\n\n` +
            `⚡ Keep these credentials safe.`;

        await sendStyledCard(ctx, {
            title: '🛠️ Full Panel Data Card',
            body: panelBody,
            footer: '⚡ Mickey Glitch Sub',
            fallbackText: panelDetails,
            buttons: [
                { label: '📋 Copy Username', id: `copy:${username}` },
                { label: '🔑 Copy Password', id: `copy:${password}` },
                { label: '🌐 Open Panel', id: `${domain}/server/${server.identifier}` },
                { label: '🧾 View Details', id: `details:${encodeURIComponent(panelDetails)}` }
            ],
            targetJid,
        });
        
        return result;
        
    } catch (error) {
        const formatted = formatPanelError(error, 'CREATE_PANEL');
        console.error('[CREATEPANEL ERROR]', JSON.stringify(formatted, null, 2));
        await sendStyledCard(ctx, {
            title: '❌ Panel Creation Failed',
            body: `❌ *Failed to create panel.*\n\n${formatted.message || 'Unknown error occurred while creating the server.'}`,
            footer: '⚡ Mickey Glitch Sub',
            fallbackText: `❌ *Failed to create panel.*\n\n${formatted.message || 'Unknown error occurred while creating the server.'}`,
            buttons: [
                { label: '🔁 Try Again', id: '.buy' },
                { label: '📞 Contact Admin', id: '.owner' }
            ],
        });
        return null;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 6. COMMAND EXPORT
// ─── ──────────────────────────────────────────────────────────────────────

module.exports = {
    name: 'buy',
    aliases: ['1gb', 'buy1gb', 'purchase', 'order', 'panel', 'create'],
    category: 'panel',
    permissions: { owner: true },
    
    code: async (ctx) => {
        try {
            const raw = Array.isArray(ctx.args) 
                ? ctx.args.join(' ').trim() 
                : String(ctx.args || '').trim();

            // ─── SHOW HELP ──────────────────────────────────────────────
            if (!raw || raw === 'help' || raw === 'menu') {
                const helpButton = new ButtonV2(ctx.core || ctx.sock || ctx)
                    .setTitle('🛒 Panel Purchase System')
                    .setBody(
                        `*Commands:*\n\n` +
                        `📌 *Basic:*\n` +
                        `.buy <username>\n` +
                        `.buy <plan> <username>\n\n` +
                        `📌 *With Target:*\n` +
                        `.buy <username> <number>\n` +
                        `.buy <plan> <username> <number>\n\n` +
                        `📌 *Examples:*\n` +
                        `.buy mickey\n` +
                        `.buy 1gb mickey\n` +
                        `.buy mickey 255612130873\n` +
                        `.buy 2gb mickey 255612130873\n\n` +
                        `📌 *Plans:*\n` +
                        `• 1gb - TSh 5,000\n` +
                        `• 2gb - TSh 8,000\n` +
                        `• 5gb - TSh 15,000\n` +
                        `• 10gb - TSh 25,000\n` +
                        `• unlimited - TSh 50,000\n\n` +
                        `💡 Reply to a user's message to target them.`
                    )
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail(CONFIG.thumbnail)
                    .addButton('📦 1GB', '.buy 1gb')
                    .addButton('📦 2GB', '.buy 2gb')
                    .addButton('📦 5GB', '.buy 5gb')
                    .addButton('📦 10GB', '.buy 10gb')
                    .addButton('🚀 Unlimited', '.buy unlimited');

                return await helpButton.send(ctx.chatId || ctx.chat || ctx.from, { quoted: ctx._msg, fallbackText: '🛒 Panel Purchase System' });
            }

            // ─── CREATE PANEL ────────────────────────────────────────────
            await sendStyledCard(ctx, {
                title: '🟢 Creating Panel',
                body: '🟢 *Creating panel...*',
                footer: '⚡ Mickey Glitch Sub',
                fallbackText: '🟢 *Creating panel...*',
            });
            
            const result = await createPanel(ctx);

            if (result && result.status === true) {
                await sendStyledCard(ctx, {
                    title: '✅ Panel Created',
                    body:
                        `✅ *Panel Created Successfully!*\n\n` +
                        `👤 Username: ${result.credentials.username}\n` +
                        `🆔 User ID: ${result.user.id}\n` +
                        `🖥️ Server: ${result.server.id}\n` +
                        `📦 Plan: ${result.specs.plan}\n` +
                        `🧠 RAM: ${result.specs.memo} MB\n` +
                        `📌 Panel: ${result.credentials.panel_url}\n\n` +
                        `> ⚡ Mickey Glitch Sub`,
                    footer: '⚡ Mickey Glitch Sub',
                    fallbackText:
                        `✅ *Panel Created Successfully!*\n\n` +
                        `👤 Username: ${result.credentials.username}\n` +
                        `🆔 User ID: ${result.user.id}\n` +
                        `🖥️ Server: ${result.server.id}\n` +
                        `📦 Plan: ${result.specs.plan}\n` +
                        `🧠 RAM: ${result.specs.memo} MB\n` +
                        `📌 Panel: ${result.credentials.panel_url}\n\n` +
                        `> ⚡ Mickey Glitch Sub`,
                });
            } else {
                await sendStyledCard(ctx, {
                    title: '❌ Panel Failed',
                    body:
                        `❌ *Failed to Create Panel*\n\n` +
                        `📌 ${result?.message || 'Unknown error'}\n\n` +
                        `💡 Please try again later.`,
                    footer: '⚡ Mickey Glitch Sub',
                    fallbackText:
                        `❌ *Failed to Create Panel*\n\n` +
                        `📌 ${result?.message || 'Unknown error'}\n\n` +
                        `💡 Please try again later.`,
                });
            }

        } catch (error) {
            console.error('[BUY ERROR]', error);
            await sendStyledCard(ctx, {
                title: '❌ Command Failed',
                body: `❌ *Command Failed*\n\n${error.message || 'Unknown error'}`,
                footer: '⚡ Mickey Glitch Sub',
                fallbackText: `❌ *Command Failed*\n\n${error.message || 'Unknown error'}`,
            });
        }
    }
};

// ─── EXPOSE CREATE PANEL ──────────────────────────────────────────────────
module.exports.createPanel = createPanel;