/**
 * buy.js - Ultimate Pterodactyl System with Advanced Features
 * Features: ButtonV2, CTA Copy, CTA URL, Booking Style UI, Error Handling
 * Fixed: jidDecode error, user extraction, robust error handling
 */

const axios = require('axios');
const moment = require('moment-timezone');
const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');

// ─── ──────────────────────────────────────────────────────────────────────
// 1. PANEL CONFIG
// ─── ──────────────────────────────────────────────────────────────────────

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

// ─── ──────────────────────────────────────────────────────────────────────
// 2. AXIOS CLIENT
// ─── ──────────────────────────────────────────────────────────────────────

const panelApi = axios.create({
    baseURL: `${PANEL_CONFIG.baseUrl}/api/application`,
    headers: {
        'Authorization': `Bearer ${PANEL_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 15000
});

// ─── ──────────────────────────────────────────────────────────────────────
// 3. IMPROVED HELPERS - FIXED jidDecode ERROR
// ─── ──────────────────────────────────────────────────────────────────────

function extractTargetJid(ctx) {
    // SAFE extraction - no jidDecode dependency
    let targetJid = ctx.sender;
    
    // Check for quoted message
    if (ctx.quoted) {
        if (typeof ctx.quoted === 'object') {
            // Try different ways to get sender from quoted message
            targetJid = ctx.quoted.sender || 
                       ctx.quoted.participant || 
                       ctx.quoted.key?.participant ||
                       ctx.quoted.key?.remoteJid ||
                       ctx.quoted.from ||
                       ctx.sender;
        } else if (typeof ctx.quoted === 'string') {
            targetJid = ctx.quoted;
        }
    }
    
    // Check for mentioned JID
    if (ctx.mentionedJid && Array.isArray(ctx.mentionedJid) && ctx.mentionedJid.length > 0) {
        targetJid = ctx.mentionedJid[0];
    }
    
    // Ensure JID has @s.whatsapp.net suffix
    if (!targetJid.includes('@')) {
        targetJid = `${targetJid}@s.whatsapp.net`;
    }
    
    return targetJid;
}

function parseInput(ctx) {
    let rawArgs = ctx.args || [];
    if (typeof rawArgs === 'string') rawArgs = rawArgs.split(' ');
    
    // Handle text-based args
    if (ctx.text && rawArgs.length === 0) {
        const parts = ctx.text.trim().split(/\s+/);
        rawArgs = parts.slice(1);
    }

    let plan = '1gb';
    let username = '';
    let targetJid = extractTargetJid(ctx);

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
            try {
                const searchRes = await panelApi.get(`/users?filter[email]=${email}`);
                if (searchRes.data.data && searchRes.data.data.length > 0) {
                    return searchRes.data.data[0].attributes;
                }
            } catch (searchError) {
                console.log('[SEARCH ERROR]', searchError.message);
            }
        }
        throw error;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 4. ENHANCED CREDENTIALS SENDER WITH MULTIPLE FALLBACKS
// ─── ──────────────────────────────────────────────────────────────────────

async function sendCredentialsPro(ctx, targetJid, username, password, plan, spec, domain, createDate) {
    const client = ctx.core || ctx.sock || ctx;
    const msgQuote = ctx._msg;

    // Ensure targetJid is valid
    if (!targetJid || targetJid === 'undefined' || !targetJid.includes('@')) {
        targetJid = ctx.sender;
        if (!targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;
    }

    // ─── CREATE CREDENTIALS MESSAGE ──────────────────────────────
    const credentialsText = 
        `🔐 *PANEL CREDENTIALS*\n\n` +
        `👤 *Username:* ${username}\n` +
        `🔑 *Password:* ${password}\n` +
        `🌐 *Panel:* ${domain}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 *Package Details*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 *Plan:* ${plan.toUpperCase()}\n` +
        `🧠 *RAM:* ${spec.ram} MB\n` +
        `💻 *CPU:* ${spec.cpu}%\n` +
        `💾 *Disk:* ${spec.disk} MB\n` +
        `💰 *Price:* ${spec.price}\n` +
        `📅 *Created:* ${createDate}\n\n` +
        `⚡ *Mickey Glitch Sub*`;

    // ─── TRY BUTTONV2 FIRST ──────────────────────────────────────
    try {
        const button = new ButtonV2(client)
            .setTitle('🔐 Panel Credentials')
            .setBody(credentialsText)
            .setFooter(`⚡ ${new Date().toLocaleDateString()}`)
            .setThumbnail(PANEL_CONFIG.thumbnail)

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
                    copy_code: password,
                    id: 'copy_pass'
                })
            })
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy All',
                    copy_code: `Username: ${username}\nPassword: ${password}\nPanel: ${domain}`,
                    id: 'copy_all'
                })
            })
            .addRawButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Open Panel',
                    url: domain,
                    webview_interaction: false
                })
            })
            .addRawButton({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Menu',
                    id: '.menu'
                })
            });

        await button.send(targetJid, { quoted: msgQuote });
        return true;

    } catch (buttonError) {
        console.log('[BUTTONV2] Failed, trying Button V1...');
    }

    // ─── TRY BUTTON V1 ──────────────────────────────────────────────
    try {
        const fallback = new Button(client)
            .setTitle('🔐 Panel Credentials')
            .setBody(credentialsText)
            .setFooter('⚡ Mickey Glitch Sub')
            .setImage(PANEL_CONFIG.thumbnail)
            .addCopy('📋 Copy Username', username)
            .addCopy('🔑 Copy Password', password)
            .addUrl('🌐 Open Panel', domain, false);

        await fallback.send(targetJid, { quoted: msgQuote });
        return true;

    } catch (fallbackError) {
        console.log('[BUTTON] Failed, sending plain text...');
    }

    // ─── ULTIMATE FALLBACK: Plain Text ──────────────────────────────
    try {
        await client.sendMessage(targetJid, {
            text: credentialsText
        }, { quoted: msgQuote });
        return true;
    } catch (finalError) {
        console.log('[FINAL FALLBACK] Failed:', finalError.message);
        
        // Last resort - send to sender
        await ctx.reply(credentialsText);
        return false;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. MAIN CREATE PANEL WITH IMPROVED ERROR HANDLING
// ─── ──────────────────────────────────────────────────────────────────────

async function createPanel(ctx, { memo, cpu, disk } = {}) {
    try {
        const { plan, username, targetJid } = parseInput(ctx);
        const spec = PLAN_SPECS[plan];
        const userPass = `@${username}${Math.floor(1000 + Math.random() * 9000)}`;
        const createDate = moment().tz(PANEL_CONFIG.timezone).format("DD-MM-YYYY HH:mm");
        
        // Ensure targetJid is valid
        let target = targetJid || ctx.sender;
        if (!target || target === 'undefined') {
            target = ctx.sender;
        }
        if (!target.includes('@')) {
            target = `${target}@s.whatsapp.net`;
        }

        // ─── Send processing ────────────────────────────────────────────
        await ctx.reply(`⏳ *Creating ${plan.toUpperCase()} panel for ${username}...*`);

        // ─── Create user ──────────────────────────────────────────────────
        const createdUser = await getOrCreateUser(username, userPass);

        // ─── Create server ────────────────────────────────────────────────
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
            limits: {
                memory: spec.ram,
                swap: 0,
                disk: spec.disk,
                io: 500,
                cpu: spec.cpu
            },
            feature_limits: {
                databases: 0,
                backups: 0,
                allocations: 0
            },
            deploy: {
                locations: [PANEL_CONFIG.locationId],
                dedicated_ip: false,
                port_range: []
            }
        });

        // ─── Send credentials to target ──────────────────────────────────
        await sendCredentialsPro(
            ctx,
            target,
            createdUser.username,
            userPass,
            plan,
            spec,
            PANEL_CONFIG.baseUrl,
            createDate
        );

        // ─── Send confirmation to sender ──────────────────────────────────
        await ctx.reply(
            `✅ *Panel Created Successfully!*\n\n` +
            `📋 *Details:*\n` +
            `├ Plan: ${plan.toUpperCase()}\n` +
            `├ Username: ${username}\n` +
            `├ User ID: ${createdUser.id}\n` +
            `├ RAM: ${spec.ram} MB\n` +
            `├ CPU: ${spec.cpu}%\n` +
            `└ Price: ${spec.price}\n\n` +
            `📌 Credentials sent to ${target}\n\n` +
            `> ⚡ Mickey Glitch Sub`
        );

        return true;

    } catch (error) {
        const errorDetail = error?.response?.data?.errors?.[0]?.detail || error.message || 'API Connection Failed';
        console.error('[CREATEPANEL ERROR]', errorDetail);

        // Send user-friendly error
        await ctx.reply(
            `❌ *Panel Creation Failed*\n\n` +
            `📌 ${errorDetail}\n\n` +
            `💡 Please try again later or contact support.`
        );
        return false;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 6. COMMAND EXPORT WITH ENHANCED HELP
// ─── ──────────────────────────────────────────────────────────────────────

module.exports = {
    name: 'buy',
    aliases: ['buygb', 'panel', 'createpanel', 'order', 'purchase'],
    category: 'panel',
    permissions: { owner: true },

    code: async (ctx) => {
        try {
            const argsText = Array.isArray(ctx.args) ? ctx.args.join(' ') : String(ctx.args || '');

            if (!argsText || argsText === 'help' || argsText === 'menu') {
                // ─── Enhanced Help Menu ──────────────────────────────────
                const helpButton = new ButtonV2(ctx.core || ctx.sock || ctx)
                    .setTitle('🛒 Panel Purchase System')
                    .setBody(
                        `📌 *Usage:*\n` +
                        `.buy <plan> <username>\n\n` +
                        `📋 *Available Plans:*\n` +
                        `• 1gb - TSh 5,000 (1024MB RAM)\n` +
                        `• 2gb - TSh 8,000 (2048MB RAM)\n` +
                        `• 5gb - TSh 15,000 (5120MB RAM)\n` +
                        `• 10gb - TSh 25,000 (10240MB RAM)\n` +
                        `• unlimited - TSh 50,000 (20480MB RAM)\n\n` +
                        `📌 *Examples:*\n` +
                        `.buy 1gb mickey\n` +
                        `.buy 2gb mickey 255612130873\n\n` +
                        `💡 Reply to a user's message to target them.`
                    )
                    .setFooter('⚡ Mickey Glitch Sub')
                    .setThumbnail(PANEL_CONFIG.thumbnail)
                    .addButton('📦 1GB', '.buy 1gb')
                    .addButton('📦 2GB', '.buy 2gb')
                    .addButton('📦 5GB', '.buy 5gb')
                    .addButton('📦 10GB', '.buy 10gb')
                    .addButton('🚀 Unlimited', '.buy unlimited')
                    .addButton('📞 Owner', '.owner');

                return await helpButton.send(ctx.chatId || ctx.chat || ctx.from, { quoted: ctx._msg });
            }

            await createPanel(ctx);
            
        } catch (error) {
            console.error('[COMMAND ERROR]', error);
            await ctx.reply(
                `❌ *Command Error*\n\n` +
                `📌 ${error.message || 'An unexpected error occurred'}\n\n` +
                `💡 Please try again later.`
            );
        }
    }
};

module.exports.createPanel = createPanel;