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

    try {
        // ─── Try ButtonV2 first ──────────────────────────────────────────
        const button = new ButtonV2(ctx.core || ctx.sock || ctx)
            .setTitle("🎯 Panel Credentials")
            .setBody(panelBody)
            .setFooter("© MICKEY GLITCH TECH")
            .setThumbnail(CONFIG.thumbnail)
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Username',
                    copy_code: username,
                    id: 'copy_user'
                })
            })
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '🔑 Copy Password',
                    copy_code: String(password),
                    id: 'copy_pass'
                })
            })
            .addButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Open Panel',
                    url: domain,
                    webview_interaction: false
                })
            });
        
        await button.send(targetJid);
        return true;
        
    } catch (error) {
        console.log("[BUTTON] Failed, trying fallback...");
        try {
            // ─── Try Button (V1) ──────────────────────────────────────────
            const buttonV1 = new Button(ctx.core || ctx.sock || ctx)
                .setTitle("Panel Credentials")
                .setBody(panelBody)
                .setImage(CONFIG.thumbnail)
                .setFooter("© MICKEY GLITCH TECH")
                .addCopy("📋 Copy Username", username)
                .addCopy("🔑 Copy Password", String(password))
                .addUrl("🌐 Open Panel", domain, false);
            
            await buttonV1.send(targetJid);
            return true;
            
        } catch (error2) {
            console.log("[BUTTON V1] Failed, sending plain text...");
            await superSend(ctx, targetJid, { text: panelBody });
            return true;
        }
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. PTERODACTYL API FUNCTIONS
// ─── ──────────────────────────────────────────────────────────────────────

async function createPterodactylUser(domain, apiKey, username, password) {
    const email = `${username}@gmail.com`;
    const response = await axios.post(
        `${domain}/api/application/users`,
        {
            email,
            username,
            first_name: username,
            last_name: username,
            language: "en",
            password: String(password)
        },
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            timeout: CONFIG.timeout
        }
    );
    if (response.data.errors) {
        throw new Error(response.data.errors.map(e => e.detail || JSON.stringify(e)).join("\n"));
    }
    return response.data.attributes;
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
    const response = await axios.post(
        `${domain}/api/application/servers`,
        {
            name: username,
            description: description,
            user: userId,
            egg: parseInt(eggId),
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
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
                locations: [parseInt(locationId)],
                dedicated_ip: false,
                port_range: []
            }
        },
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            timeout: CONFIG.timeout
        }
    );
    if (response.data.errors) {
        throw new Error(response.data.errors.map(e => e.detail || JSON.stringify(e)).join("\n"));
    }
    return response.data.attributes;
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
            await superReply(ctx, "❌ *Tafadhali andika username!*\n\n📌 Example: `.buy 1gb mickey`");
            return null;
        }
        
        if (!targetJid) {
            await superReply(ctx, "❌ *Imeshindwa kupata namba!*\n\n📌 Reply ujumbe wa mtu au weka namba: `.buy 1gb mickey-255712345678`");
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
            await superReply(ctx, "❌ *Panel configuration missing!*\n\nContact admin to set up PTERODACTYL config.");
            return null;
        }
        
        // ─── Generate password ──────────────────────────────────────────
        const password = `@${username}${Math.floor(Math.random() * 9999)}@`;
        const description = moment().tz(timezone).format("dddd, D MMMM - YYYY");
        
        // ─── Send processing ────────────────────────────────────────────
        await superReply(ctx, `⏳ *Creating ${plan} (${planSpecs.memo}MB) panel for ${username}...*`);
        
        // ─── Create or get user ─────────────────────────────────────────
        let user;
        try {
            user = await createPterodactylUser(domain, apiKey, username, password);
        } catch (error) {
            if (error.message.includes("email has already been taken")) {
                user = await getExistingUser(domain, apiKey, username);
                if (!user) {
                    await superReply(ctx, `❌ *User exists but cannot retrieve!*\n\nTry a different username.`);
                    return null;
                }
            } else {
                await superReply(ctx, `❌ *User Creation Failed*\n\n${error.message}`);
                return null;
            }
        }
        
        // ─── Fetch egg ──────────────────────────────────────────────────
        let eggData;
        try {
            eggData = await fetchEggData(domain, apiKey, nestId, eggId);
        } catch (error) {
            await superReply(ctx, `❌ *Egg Fetch Failed*\n\n${error.message}`);
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
            await superReply(ctx, `❌ *Server Creation Failed*\n\n${error.message}`);
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
        
        await superReply(ctx,
            `🚀 *Panel Created Successfully!*\n\n` +
            `📋 *Details:*\n` +
            `├ Plan: ${plan}\n` +
            `├ Username: ${username}\n` +
            `├ User ID: ${user.id}\n` +
            `├ Server ID: ${server.id}\n` +
            `├ RAM: ${planSpecs.memo} MB\n` +
            `├ CPU: ${planSpecs.cpu}%\n` +
            `├ Disk: ${planSpecs.disk} MB\n` +
            `└ Price: ${planSpecs.price}\n\n` +
            `📌 *Panel URL:* ${domain}/server/${server.identifier}\n\n` +
            `✅ Credentials sent to ${targetJid}\n\n` +
            `> ⚡ Mickey Glitch Sub`
        );
        
        return result;
        
    } catch (error) {
        console.error("[CREATEPANEL ERROR]", error.message);
        await superReply(ctx, `❌ *Panel Creation Failed*\n\n${error.message}`);
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

                return await helpButton.send(ctx.chatId || ctx.chat || ctx.from, { quoted: ctx._msg });
            }

            // ─── CREATE PANEL ────────────────────────────────────────────
            await superReply(ctx, `🟢 *Creating panel...*`);
            
            const result = await createPanel(ctx);

            if (result && result.status === true) {
                await superReply(ctx,
                    `✅ *Panel Created Successfully!*\n\n` +
                    `👤 Username: ${result.credentials.username}\n` +
                    `🆔 User ID: ${result.user.id}\n` +
                    `🖥️ Server: ${result.server.id}\n` +
                    `📦 Plan: ${result.specs.plan}\n` +
                    `🧠 RAM: ${result.specs.memo} MB\n` +
                    `📌 Panel: ${result.credentials.panel_url}\n\n` +
                    `> ⚡ Mickey Glitch Sub`
                );
            } else {
                await superReply(ctx,
                    `❌ *Failed to Create Panel*\n\n` +
                    `📌 ${result?.message || 'Unknown error'}\n\n` +
                    `💡 Please try again later.`
                );
            }

        } catch (error) {
            console.error('[BUY ERROR]', error);
            await superReply(ctx, `❌ *Command Failed*\n\n${error.message || 'Unknown error'}`);
        }
    }
};

// ─── EXPOSE CREATE PANEL ──────────────────────────────────────────────────
module.exports.createPanel = createPanel;