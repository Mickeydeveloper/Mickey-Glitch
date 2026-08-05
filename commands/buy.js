/**
 * buy.js - Ultimate Pterodactyl System with MessageBuilder
 * Features: ButtonV2, CTA Copy, CTA URL, Booking Style UI
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
// 3. HELPERS
// ─── ──────────────────────────────────────────────────────────────────────

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

// ─── ──────────────────────────────────────────────────────────────────────
// 4. ULTIMATE CREDENTIALS SENDER (MessageBuilder Pro)
// ─── ──────────────────────────────────────────────────────────────────────

async function sendCredentialsPro(ctx, targetJid, username, password, plan, spec, domain, createDate) {
    const client = ctx.core || ctx.sock || ctx;
    const msgQuote = ctx._msg;

    // ─── BOOKING STYLE CARD ──────────────────────────────────────────────
    const bookingCard = {
        header: {
            title: `🚀 ${plan.toUpperCase()} Panel`,
            hasMediaAttachment: true,
            imageMessage: {
                url: PANEL_CONFIG.thumbnail,
                mimetype: 'image/png'
            }
        },
        body: {
            text: 
                `╭━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `│ 📋 *PANEL CREDENTIALS*\n` +
                `│━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `│\n` +
                `│ 👤 *Username:* ${username}\n` +
                `│ 🔑 *Password:* ${password}\n` +
                `│ 🌐 *Panel:* ${domain}\n` +
                `│\n` +
                `│━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `│ 📦 *Package Details*\n` +
                `│━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `│\n` +
                `│ 📊 *Plan:* ${plan.toUpperCase()}\n` +
                `│ 🧠 *RAM:* ${spec.ram} MB\n` +
                `│ 💻 *CPU:* ${spec.cpu}%\n` +
                `│ 💾 *Disk:* ${spec.disk} MB\n` +
                `│ 💰 *Price:* ${spec.price}\n` +
                `│\n` +
                `│━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `│ 📅 *Created:* ${createDate}\n` +
                `│\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> ⚡ Mickey Glitch Sub`
        },
        footer: {
            text: `⚡ ${plan.toUpperCase()} | ${new Date().toLocaleDateString()}`
        }
    };

    // ─── SEND CAROUSEL WITH BOOKING STYLE ──────────────────────────────
    try {
        const carousel = new Carousel(client);
        carousel
            .setTitle('🎯 Panel Credentials')
            .setBody('📋 *Your server credentials are ready!*')
            .setFooter('⚡ Mickey Glitch Sub')
            .addCard(bookingCard);

        await carousel.send(targetJid, { quoted: msgQuote });
    } catch (carouselError) {
        console.log('[CAROUSEL] Failed, trying ButtonV2...');
    }

    // ─── BUTTONV2 WITH CTA COPY & URL ──────────────────────────────────
    try {
        const button = new ButtonV2(client)
            .setTitle('🔐 Panel Credentials')
            .setBody(
                `📋 *Your ${plan.toUpperCase()} Panel is Ready!*\n\n` +
                `👤 Username: \`${username}\`\n` +
                `🔑 Password: \`${password}\`\n\n` +
                `📦 Plan: ${plan.toUpperCase()} (${spec.ram}MB RAM)\n` +
                `💰 Price: ${spec.price}\n\n` +
                `💡 *Click buttons below to copy credentials*`
            )
            .setFooter(`⚡ ${new Date().toLocaleDateString()}`)
            .setThumbnail(PANEL_CONFIG.thumbnail)

            // ─── CTA COPY ──────────────────────────────────────────────────
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

            // ─── CTA URL ──────────────────────────────────────────────────
            .addButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Open Panel',
                    url: domain,
                    webview_interaction: false
                })
            })

            // ─── QUICK REPLY ──────────────────────────────────────────────
            .addButton({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Menu',
                    id: '.menu'
                }
            )
        });

        await button.send(targetJid, { quoted: msgQuote });

    } catch (buttonError) {
        console.log('[BUTTON] Failed, trying fallback...');
        
        // ─── FALLBACK: Button V1 ──────────────────────────────────────────
        try {
            const fallback = new Button(client)
                .setTitle('🔐 Panel Credentials')
                .setBody(
                    `👤 Username: ${username}\n` +
                    `🔑 Password: ${password}\n` +
                    `🌐 Panel: ${domain}\n\n` +
                    `📦 Plan: ${plan.toUpperCase()} (${spec.ram}MB)`
                )
                .setFooter('⚡ Mickey Glitch Sub')
                .setImage(PANEL_CONFIG.thumbnail)
                .addCopy('📋 Copy Username', username)
                .addCopy('🔑 Copy Password', password)
                .addUrl('🌐 Open Panel', domain, false);

            await fallback.send(targetJid, { quoted: msgQuote });

        } catch (fallbackError) {
            // ─── ULTIMATE FALLBACK: Plain Text ────────────────────────────
            await client.sendMessage(targetJid, {
                text: `🔐 *Panel Credentials*\n\nUsername: ${username}\nPassword: ${password}\nPanel: ${domain}\n\n📦 Plan: ${plan.toUpperCase()} (${spec.ram}MB)`
            }, { quoted: msgQuote });
        }
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. MAIN CREATE PANEL
// ─── ──────────────────────────────────────────────────────────────────────

async function createPanel(ctx) {
    const { plan, username, targetJid } = parseInput(ctx);
    const spec = PLAN_SPECS[plan];
    const userPass = `@${username}${Math.floor(1000 + Math.random() * 9000)}`;
    const createDate = moment().tz(PANEL_CONFIG.timezone).format("DD-MM-YYYY HH:mm");
    const target = targetJid || ctx.sender;

    try {
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

        await ctx.reply(
            `❌ *Panel Creation Failed*\n\n` +
            `📌 ${errorDetail}\n\n` +
            `💡 Please try again later.`
        );
        return false;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 6. COMMAND EXPORT
// ─── ──────────────────────────────────────────────────────────────────────

module.exports = {
    name: 'buy',
    aliases: ['buygb', 'panel', 'createpanel', 'order'],
    category: 'panel',
    permissions: { owner: true },

    code: async (ctx) => {
        const argsText = Array.isArray(ctx.args) ? ctx.args.join(' ') : String(ctx.args || '');

        if (!argsText || argsText === 'help' || argsText === 'menu') {
            // ─── Help Menu with ButtonV2 ──────────────────────────────────
            const helpButton = new ButtonV2(ctx.core || ctx.sock || ctx)
                .setTitle('🛒 Panel Purchase System')
                .setBody(
                    `📌 *Usage:*\n` +
                    `.buy <plan> <username>\n\n` +
                    `📋 *Plans:*\n` +
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
    }
};

module.exports.createPanel = createPanel;