/**
 * buy.js - Complete Panel Purchase System
 * All-in-one file with createPanel, handlers, helpers, and command
 * Usage: .buy <username> [plan] [target]
 */

const moment = require("moment-timezone");
const axios = require("axios");
const { Button, createCtx } = require('../lib/messageBuilder');

// ─── ──────────────────────────────────────────────────────────────────────
// 1. CONFIG
// ─── ──────────────────────────────────────────────────────────────────────
const CONFIG = {
    timeout: 15000,
    retries: 2,
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

// ─── ──────────────────────────────────────────────────────────────────────
// 2. HELPERS
// ─── ──────────────────────────────────────────────────────────────────────

// ─── SAFE SEND ──────────────────────────────────────────────────────────────
async function safeSend(ctx, target, content) {
    try {
        if (ctx && typeof ctx.sendMessage === "function") {
            return await ctx.sendMessage(target, content);
        }
        if (ctx?.core && typeof ctx.core.sendMessage === "function") {
            return await ctx.core.sendMessage(target, content);
        }
        if (ctx?.sock && typeof ctx.sock.sendMessage === "function") {
            return await ctx.sock.sendMessage(target, content);
        }
        if (ctx && typeof ctx.reply === "function") {
            return await ctx.reply(content.text || content);
        }
        if (ctx?._msg?.key?.remoteJid) {
            const jid = ctx._msg.key.remoteJid;
            if (ctx.core?.sendMessage) {
                return await ctx.core.sendMessage(jid, content);
            }
            if (ctx.sock?.sendMessage) {
                return await ctx.sock.sendMessage(jid, content);
            }
        }
        console.error("[SAFE SEND] No valid send method found");
        return null;
    } catch (error) {
        console.error("[SAFE SEND ERROR]", error.message);
        return null;
    }
}

// ─── SAFE REPLY ─────────────────────────────────────────────────────────────
async function safeReply(ctx, text) {
    try {
        if (ctx && typeof ctx.reply === "function") {
            return await ctx.reply(text);
        }
        if (ctx?._msg?.key?.remoteJid) {
            const jid = ctx._msg.key.remoteJid;
            if (ctx.core?.sendMessage) {
                return await ctx.core.sendMessage(jid, { text });
            }
            if (ctx.sock?.sendMessage) {
                return await ctx.sock.sendMessage(jid, { text });
            }
        }
        console.error("[SAFE REPLY] No valid reply method found");
        return null;
    } catch (error) {
        console.error("[SAFE REPLY ERROR]", error.message);
        return null;
    }
}

// ─── EXTRACT USER INFO ──────────────────────────────────────────────────────
function extractUserInfo(ctx, args) {
    const result = { username: "", targetJid: null, plan: "1gb", error: null };

    try {
        const text = ctx.text || (Array.isArray(args) ? args.join(" ") : "") || "";
        let parts = text.split("-").map(p => p.trim());
        
        // Check for plan in args
        const planMatch = text.match(/\b(\d+gb|unlimited)\b/i);
        if (planMatch) {
            result.plan = planMatch[0].toLowerCase();
            // Remove plan from parts
            parts = parts.filter(p => !p.match(/\d+gb|unlimited/i));
        }
        
        // ─── CASE 1: Quoted message ──────────────────────────────────────
        if (ctx.quoted) {
            result.targetJid = ctx.quoted.sender || ctx.quoted.key?.participant;
            result.username = parts[0] || "user";
            return result;
        }
        
        // ─── CASE 2: username-number format ──────────────────────────────
        if (parts.length >= 2 && parts[1].match(/^[0-9]+$/)) {
            result.username = parts[0] || "user";
            result.targetJid = parts[1].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            return result;
        }
        
        // ─── CASE 3: Mentioned JID ────────────────────────────────────────
        if (ctx.mentionedJid && ctx.mentionedJid.length > 0) {
            result.username = parts[0] || "user";
            result.targetJid = ctx.mentionedJid[0];
            return result;
        }
        
        // ─── CASE 4: Just username ────────────────────────────────────────
        if (parts[0] && parts[0].length > 0) {
            result.username = parts[0];
            result.targetJid = ctx.sender || ctx._msg?.key?.participant || ctx._msg?.key?.remoteJid;
            return result;
        }
        
        result.error = "No valid user data found";
        return result;
        
    } catch (error) {
        result.error = error.message;
        return result;
    }
}

// ─── GET CONFIG ─────────────────────────────────────────────────────────────
function getConfig() {
    const domain = global.PTERODACTYL?.domain || global.domain;
    const apiKey = global.PTERODACTYL?.apiKey || global.plta;
    const eggId = global.PTERODACTYL?.eggId || global.eggs || CONFIG.defaultEgg;
    const locationId = global.PTERODACTYL?.locationId || global.locc || CONFIG.defaultLocation;
    const nestId = global.PTERODACTYL?.nestId || global.nestId || CONFIG.defaultNest;
    const timezone = global.PTERODACTYL?.timezone || global.TIMEZONE || CONFIG.timezone;
    return { domain, apiKey, eggId, locationId, nestId, timezone };
}

// ─── PLAN TO SPECS ──────────────────────────────────────────────────────────
function getPlanSpecs(plan) {
    const plans = {
        '1gb': { memo: 1024, cpu: 100, disk: 5120, price: "TSh 5,000" },
        '2gb': { memo: 2048, cpu: 150, disk: 10240, price: "TSh 8,000" },
        '5gb': { memo: 5120, cpu: 250, disk: 20480, price: "TSh 15,000" },
        '10gb': { memo: 10240, cpu: 400, disk: 40960, price: "TSh 25,000" },
        'unlimited': { memo: 20480, cpu: 800, disk: 102400, price: "TSh 50,000" }
    };
    return plans[plan] || plans['1gb'];
}

// ─── ──────────────────────────────────────────────────────────────────────
// 3. PTERODACTYL API FUNCTIONS
// ─── ──────────────────────────────────────────────────────────────────────

// ─── CREATE USER ────────────────────────────────────────────────────────────
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

// ─── GET EXISTING USER ──────────────────────────────────────────────────────
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

// ─── FETCH EGG DATA ─────────────────────────────────────────────────────────
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

// ─── CREATE SERVER ──────────────────────────────────────────────────────────
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

// ─── SEND CREDENTIALS ──────────────────────────────────────────────────────
async function sendCredentials(ctx, targetJid, username, password, domain) {
    const panelBody =
        `🚀 *PTERODACTYL PANEL DATA*\n\n` +
        `👤 *Username:* ${username}\n` +
        `🔑 *Password:* ${password}\n` +
        `🌐 *Server URL:* ${domain}\n\n` +
        `_Hifadhi taarifa hizi kwa usalama._`;

    try {
        if (typeof Button !== 'undefined') {
            const button = new Button(ctx.core || ctx.sock || ctx)
                .setTitle("Panel Credentials")
                .setBody(panelBody)
                .setImage(CONFIG.thumbnail)
                .setFooter("© MICKEY GLITCH TECH")
                .addCopy("📋 Copy Username", username)
                .addCopy("🔑 Copy Password", String(password))
                .addUrl("🌐 Open Panel", domain, false);
            await button.send(targetJid);
            return true;
        }
    } catch (error) {
        console.log("[CREDENTIALS] Button failed, sending plain text...");
    }
    try {
        await safeSend(ctx, targetJid, { text: panelBody });
        return true;
    } catch (error) {
        console.error("[CREDENTIALS] Failed to send:", error.message);
        return false;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. MAIN CREATE PANEL FUNCTION
// ─── ──────────────────────────────────────────────────────────────────────

async function createPanel(ctx, options = {}) {
    try {
        const context = ctx._msg ? ctx : createCtx(ctx.core || ctx.sock, ctx.chatId, ctx._msg);
        const args = ctx.args || options.args || [];
        const userInfo = extractUserInfo(ctx, args);
        
        if (userInfo.error) {
            await safeReply(ctx,
                `❌ *Muundo Sio Sahihi!*\n\n` +
                `1️⃣ Ku-reply mtu: Reply ujumbe wake kisha andika:\n` +
                `   \`.buy username\`\n\n` +
                `2️⃣ Kwa namba: Andika:\n` +
                `   \`.buy username-255712345678\``
            );
            return null;
        }
        
        const { username, targetJid, plan } = userInfo;
        if (!username) {
            await safeReply(ctx, "❌ Tafadhali andika username.");
            return null;
        }
        if (!targetJid) {
            await safeReply(ctx, "❌ Imeshindwa kupata namba ya mtumiaji.");
            return null;
        }
        
        const planSpecs = getPlanSpecs(plan);
        const { domain, apiKey, eggId, locationId, nestId, timezone } = getConfig();
        
        if (!domain || !apiKey) {
            await safeReply(ctx, "❌ Panel configuration missing. Contact admin.");
            return null;
        }
        
        const password = `@${username}${Math.floor(Math.random() * 1000)}@`;
        const description = moment().tz(timezone).format("dddd, D MMMM - YYYY");
        
        await safeReply(ctx, `⏳ *Creating ${plan} (${planSpecs.memo}MB) panel for ${username}...*`);
        
        // ─── CREATE USER ──────────────────────────────────────────────────
        let user;
        try {
            user = await createPterodactylUser(domain, apiKey, username, password);
        } catch (error) {
            console.error("[CREATE USER ERROR]", error.message);
            if (error.message.includes("The email has already been taken")) {
                user = await getExistingUser(domain, apiKey, username);
                if (!user) {
                    await safeReply(ctx, `❌ User "${username}" already exists but cannot retrieve.`);
                    return null;
                }
            } else {
                await safeReply(ctx, `❌ *User Creation Failed*\n\n${error.message}`);
                return null;
            }
        }
        
        // ─── FETCH EGG ────────────────────────────────────────────────────
        let eggData;
        try {
            eggData = await fetchEggData(domain, apiKey, nestId, eggId);
        } catch (error) {
            console.error("[EGG FETCH ERROR]", error.message);
            await safeReply(ctx, `❌ *Egg Fetch Failed*\n\n${error.message}`);
            return null;
        }
        
        const startupCmd = eggData.startup || "npm start";
        
        // ─── SEND CREDENTIALS ────────────────────────────────────────────
        await sendCredentials(ctx, targetJid, username, password, domain);
        
        // ─── CREATE SERVER ────────────────────────────────────────────────
        let server;
        try {
            server = await createPterodactylServer(
                domain, apiKey, user.id, username, eggId, locationId,
                startupCmd, planSpecs.memo, planSpecs.cpu, planSpecs.disk, description
            );
        } catch (error) {
            console.error("[SERVER CREATION ERROR]", error.message);
            await safeReply(ctx, `❌ *Server Creation Failed*\n\n${error.message}`);
            return null;
        }
        
        const result = {
            status: true,
            message: "Panel created successfully",
            user: { id: user.id, username: user.username, email: user.email },
            server: { id: server.id, name: server.name, identifier: server.identifier },
            credentials: { username, password, domain, panel_url: `${domain}/server/${server.identifier}` },
            specs: { plan, memo: planSpecs.memo, cpu: planSpecs.cpu, disk: planSpecs.disk, price: planSpecs.price }
        };
        
        await safeReply(ctx,
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
        await safeReply(ctx, `❌ *Panel Creation Failed*\n\n${error.message}`);
        return null;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. COMMAND EXPORT
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
                return await ctx.reply(
                    `🛒 *Buy Panel*\n\n` +
                    `📌 *Usage:*\n` +
                    `.buy <username> [plan] [target]\n\n` +
                    `📌 *Examples:*\n` +
                    `.buy mickey\n` +
                    `.buy mickey-255612130873\n` +
                    `.buy mickey 2gb\n` +
                    `.buy mickey-255612130873 5gb\n\n` +
                    `📌 *Plans:*\n` +
                    `• 1gb - TSh 5,000 (Default)\n` +
                    `• 2gb - TSh 8,000\n` +
                    `• 5gb - TSh 15,000\n` +
                    `• 10gb - TSh 25,000\n` +
                    `• unlimited - TSh 50,000\n\n` +
                    `💡 Reply to a message to target that user.`
                );
            }

            // ─── CREATE PANEL ────────────────────────────────────────────
            await ctx.reply(`⏳ _Creating panel..._`);
            
            const result = await createPanel(ctx);

            if (result && result.status === true) {
                await ctx.reply(
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
                await ctx.reply(
                    `❌ *Failed to Create Panel*\n\n` +
                    `📌 ${result?.message || 'Unknown error'}\n\n` +
                    `💡 Please try again later.`
                );
            }

        } catch (error) {
            console.error('[BUY COMMAND ERROR]', error);
            
            if (ctx.tools?.cmd?.handleError) {
                await ctx.tools.cmd.handleError(ctx, error, true);
            } else {
                await ctx.reply(
                    `❌ *Command Failed*\n\n` +
                    `📌 ${error.message || 'Unknown error'}\n\n` +
                    `💡 Please try again later.`
                );
            }
        }
    }
};

// ─── EXPOSE CREATE PANEL FOR OTHER COMMANDS ──────────────────────────────
module.exports.createPanel = createPanel;