/**
 * buy.js - Ultimate Pterodactyl Server Creator
 * Features: Real User Creation, Server Deployment, Credentials Sending
 * Usage: .buy <plan> <username>
 */

const crypto = require('crypto');
const axios = require('axios');
const { Button, ButtonV2, Carousel, createCtx } = require('../lib/messageBuilder');
const config = require('../config');

// ─── ──────────────────────────────────────────────────────────────────────
// 1. PANEL CONFIGURATION
// ─── ──────────────────────────────────────────────────────────────────────

const PANEL_CONFIG = {
    baseUrl: config?.domain || 'https://panel.mickeypannel.dpdns.org',
    apiKey: config?.plta || 'ptla_Lkp1S3qISOERsFvYfmu4k3G7efrkY8vffL6854NcJ0k',
    eggId: 15,
    locationId: 1,
    nestId: 5,
    timezone: 'Africa/Nairobi',
    thumbnail: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/connection.jpg'
};

const PLAN_SPECS = {
    '1gb': { ram: 1024, cpu: 100, disk: 5120, swap: 0, price: 'TSh 5,000', label: '1GB' },
    '2gb': { ram: 2048, cpu: 150, disk: 10240, swap: 512, price: 'TSh 8,000', label: '2GB' },
    '5gb': { ram: 5120, cpu: 250, disk: 20480, swap: 1024, price: 'TSh 15,000', label: '5GB' },
    '10gb': { ram: 10240, cpu: 400, disk: 40960, swap: 2048, price: 'TSh 25,000', label: '10GB' },
    'unlimited': { ram: 20480, cpu: 800, disk: 102400, swap: 4096, price: 'TSh 50,000', label: 'UNLIMITED' }
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
    timeout: 30000
});

// ─── ──────────────────────────────────────────────────────────────────────
// 3. HELPERS
// ─── ──────────────────────────────────────────────────────────────────────

const normalizePlan = (value) => {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    const compact = normalized.replace(/[^a-z0-9]/g, '');
    return compact;
};

const sanitizeName = (value) => {
    const raw = String(value || '').trim();
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleaned) return 'mickey';
    return cleaned.length > 20 ? cleaned.slice(0, 20) : cleaned;
};

const makePassword = (length = 14) => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#%*+';
    const all = upper + lower + digits + special;
    const chars = [];

    chars.push(upper[crypto.randomInt(0, upper.length)]);
    chars.push(lower[crypto.randomInt(0, lower.length)]);
    chars.push(digits[crypto.randomInt(0, digits.length)]);
    chars.push(special[crypto.randomInt(0, special.length)]);

    while (chars.length < length) {
        chars.push(all[crypto.randomInt(0, all.length)]);
    }

    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
};

const generateUsername = (name) => {
    const base = sanitizeName(name || 'mickey');
    const suffix = Date.now().toString(36).slice(-6);
    return `${base}${suffix}`;
};

const generateEmail = (username) => {
    return `${username}@mickeypannel.local`;
};

// ─── ──────────────────────────────────────────────────────────────────────
// 4. PTERODACTYL API FUNCTIONS (REAL USER & SERVER CREATION)
// ─── ──────────────────────────────────────────────────────────────────────

// 4.1 CREATE USER
async function createPterodactylUser(username, email, password) {
    try {
        const response = await panelApi.post('/users', {
            email: email,
            username: username,
            first_name: username,
            last_name: 'Client',
            language: 'en',
            password: password
        });

        if (response.data && response.data.data) {
            return response.data.data.attributes;
        }
        throw new Error('Failed to create user');
    } catch (error) {
        const errorDetail = error?.response?.data?.errors?.[0]?.detail || error.message;
        
        // Check if user already exists
        if (errorDetail.includes('email has already been taken') || 
            errorDetail.includes('username has already been taken')) {
            try {
                const searchRes = await panelApi.get(`/users?filter[email]=${email}`);
                if (searchRes.data.data && searchRes.data.data.length > 0) {
                    return searchRes.data.data[0].attributes;
                }
            } catch (searchError) {
                console.error('[SEARCH USER ERROR]', searchError.message);
            }
        }
        throw new Error(`User creation failed: ${errorDetail}`);
    }
}

// 4.2 CREATE SERVER
async function createPterodactylServer(userId, serverName, plan) {
    try {
        const spec = PLAN_SPECS[plan];
        if (!spec) throw new Error(`Invalid plan: ${plan}`);

        const response = await panelApi.post('/servers', {
            name: serverName,
            user: userId,
            egg: PANEL_CONFIG.eggId,
            docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
            startup: 'npm start',
            environment: {
                INST: 'npm',
                USER_UPLOAD: '0',
                AUTO_UPDATE: '0',
                CMD_RUN: 'npm start',
                MAIN_FILE: 'index.js',
                JS_FILE: 'index.js'
            },
            limits: {
                memory: spec.ram,
                swap: spec.swap || 0,
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

        if (response.data && response.data.data) {
            return response.data.data.attributes;
        }
        throw new Error('Failed to create server');
    } catch (error) {
        const errorDetail = error?.response?.data?.errors?.[0]?.detail || error.message;
        throw new Error(`Server creation failed: ${errorDetail}`);
    }
}

// 4.3 GET SERVER DETAILS
async function getServerDetails(serverId) {
    try {
        const response = await panelApi.get(`/servers/${serverId}`);
        if (response.data && response.data.data) {
            return response.data.data.attributes;
        }
        return null;
    } catch (error) {
        console.error('[GET SERVER ERROR]', error.message);
        return null;
    }
}

// 4.4 GET USER DETAILS
async function getUserDetails(userId) {
    try {
        const response = await panelApi.get(`/users/${userId}`);
        if (response.data && response.data.data) {
            return response.data.data.attributes;
        }
        return null;
    } catch (error) {
        console.error('[GET USER ERROR]', error.message);
        return null;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 5. SEND CREDENTIALS WITH REAL SERVER DETAILS
// ─── ──────────────────────────────────────────────────────────────────────

async function sendRealCredentials(sock, chatId, msg, userDetails, serverDetails, plan, password) {
    try {
        const spec = PLAN_SPECS[plan];
        const panelUrl = PANEL_CONFIG.baseUrl;

        // ─── BUILD CREDENTIALS TEXT ──────────────────────────────────────
        const credentialsText = 
            `🔐 *PANEL CREDENTIALS*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `✅ *Server Created Successfully!*\n\n` +
            `👤 *Username:* ${userDetails.username}\n` +
            `📧 *Email:* ${userDetails.email}\n` +
            `🔑 *Password:* ${password}\n` +
            `🆔 *User ID:* ${userDetails.id}\n` +
            `🆔 *Server ID:* ${serverDetails.id}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📦 *Server Details*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📊 *Plan:* ${plan.toUpperCase()}\n` +
            `🧠 *RAM:* ${spec.ram} MB\n` +
            `🔄 *Swap:* ${spec.swap || 0} MB\n` +
            `💻 *CPU:* ${spec.cpu}%\n` +
            `💾 *Disk:* ${spec.disk} MB\n` +
            `💰 *Price:* ${spec.price}\n` +
            `🌐 *Panel:* ${panelUrl}\n` +
            `⏳ *Created:* ${new Date().toLocaleString()}\n\n` +
            `📌 *Server Name:* ${serverDetails.name}\n` +
            `🔗 *Server Link:* ${panelUrl}/server/${serverDetails.id}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚡ *Mickey Glitch Sub*`;

        // ─── SEND WITH BUTTONV2 ──────────────────────────────────────────
        try {
            const button = new ButtonV2(sock)
                .setTitle('🔐 Server Credentials')
                .setSubtitle(`${plan.toUpperCase()} - ${userDetails.username}`)
                .setBody(credentialsText)
                .setFooter('⚡ Mickey Glitch Sub')
                .setThumbnail(PANEL_CONFIG.thumbnail)
                
                // CTA Copy Buttons
                .addButton({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '👤 Copy Username',
                        copy_code: userDetails.username,
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
                        display_text: '📧 Copy Email',
                        copy_code: userDetails.email,
                        id: 'copy_email'
                    })
                })
                
                // CTA URL Buttons
                .addRawButton({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 Open Panel',
                        url: panelUrl,
                        webview_interaction: false
                    })
                })
                .addRawButton({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🚀 Open Server',
                        url: `${panelUrl}/server/${serverDetails.id}`,
                        webview_interaction: false
                    })
                })
                
                // Quick Reply
                .addRawButton({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Menu',
                        id: '.source'
                    })
                });

            await button.send(chatId, { quoted: msg });
            return true;
        } catch (buttonError) {
            console.error('[BUTTONV2 ERROR]', buttonError.message);
        }

        // ─── FALLBACK: BUTTON V1 ──────────────────────────────────────────
        try {
            const fallback = new Button(sock)
                .setTitle('🔐 Server Credentials')
                .setBody(credentialsText)
                .setFooter('⚡ Mickey Glitch Sub')
                .setImage(PANEL_CONFIG.thumbnail)
                .addUrl('🌐 Open Panel', panelUrl)
                .addUrl('🚀 Open Server', `${panelUrl}/server/${serverDetails.id}`)
                .addCopy('👤 Copy Username', userDetails.username)
                .addCopy('🔑 Copy Password', password)
                .addCopy('📧 Copy Email', userDetails.email);

            await fallback.send(chatId, { quoted: msg });
            return true;
        } catch (fallbackError) {
            console.error('[FALLBACK ERROR]', fallbackError.message);
        }

        // ─── ULTIMATE FALLBACK: PLAIN TEXT ──────────────────────────────
        await sock.sendMessage(chatId, { text: credentialsText }, { quoted: msg });
        return true;

    } catch (error) {
        console.error('[SEND CREDENTIALS ERROR]', error.message);
        return false;
    }
}

// ─── ──────────────────────────────────────────────────────────────────────
// 6. MAIN BUY COMMAND
// ─── ──────────────────────────────────────────────────────────────────────

const buyCommand = async (sock, chatId, msg, args = []) => {
    try {
        const ctx = createCtx(sock, chatId, msg, { args });
        const parsedArgs = Array.isArray(args) ? args : String(args || '').split(/\s+/).filter(Boolean);
        
        // ─── Parse Arguments ──────────────────────────────────────────────
        const sizeArg = parsedArgs[0] || '';
        const nameArg = parsedArgs.slice(1).join(' ') || msg?.pushName || 'Mickey';

        const normalizedSize = normalizePlan(sizeArg);
        const planLabel = normalizedSize || '1gb';
        const accountName = String(nameArg).trim() || 'Mickey';

        // ─── Check Plan ────────────────────────────────────────────────────
        if (!normalizedSize) {
            await sock.sendMessage(chatId, {
                text: '⚠️ *Usage:* .buy <plan> <username>\n\n' +
                      '📋 *Available Plans:*\n' +
                      '• 1gb - TSh 5,000\n' +
                      '• 2gb - TSh 8,000\n' +
                      '• 5gb - TSh 15,000\n' +
                      '• 10gb - TSh 25,000\n' +
                      '• unlimited - TSh 50,000\n\n' +
                      '📌 *Example:* .buy 1gb Mickey'
            }, { quoted: msg });
            return true;
        }

        // ─── Check if plan exists ──────────────────────────────────────────
        if (!PLAN_SPECS[planLabel]) {
            await sock.sendMessage(chatId, {
                text: `❌ Plan "${planLabel}" haipatikani.\n` +
                      '📋 Plans: 1gb, 2gb, 5gb, 10gb, unlimited'
            }, { quoted: msg });
            return true;
        }

        // ─── Generate Credentials ──────────────────────────────────────────
        const username = generateUsername(accountName);
        const email = generateEmail(username);
        const password = makePassword(14);
        const serverName = `${username}-${planLabel}`;

        // ─── Send Processing Message ──────────────────────────────────────
        await sock.sendMessage(chatId, {
            text: `⏳ *Creating ${planLabel.toUpperCase()} server for ${accountName}...*\n\n` +
                  `👤 Username: ${username}\n` +
                  `📧 Email: ${email}\n` +
                  `📦 Plan: ${planLabel.toUpperCase()}\n\n` +
                  `🔄 Please wait...`
        }, { quoted: msg });

        // ─── Create User ──────────────────────────────────────────────────
        let userDetails;
        try {
            userDetails = await createPterodactylUser(username, email, password);
            console.log('[USER CREATED]', userDetails.id, userDetails.username);
        } catch (userError) {
            await sock.sendMessage(chatId, {
                text: `❌ *Failed to create user*\n\n` +
                      `📌 ${userError.message}\n\n` +
                      `💡 Please try again later.`
            }, { quoted: msg });
            return false;
        }

        // ─── Create Server ──────────────────────────────────────────────────
        let serverDetails;
        try {
            serverDetails = await createPterodactylServer(userDetails.id, serverName, planLabel);
            console.log('[SERVER CREATED]', serverDetails.id, serverDetails.name);
        } catch (serverError) {
            await sock.sendMessage(chatId, {
                text: `❌ *Failed to create server*\n\n` +
                      `📌 ${serverError.message}\n\n` +
                      `💡 User was created but server failed. Please contact support.`
            }, { quoted: msg });
            return false;
        }

        // ─── Get Real Server Details ──────────────────────────────────────
        try {
            const realServerDetails = await getServerDetails(serverDetails.id);
            if (realServerDetails) {
                serverDetails = realServerDetails;
            }
        } catch (detailError) {
            console.error('[GET DETAILS ERROR]', detailError.message);
        }

        // ─── Send Real Credentials ──────────────────────────────────────────
        await sendRealCredentials(
            sock,
            chatId,
            msg,
            userDetails,
            serverDetails,
            planLabel,
            password
        );

        // ─── Send Confirmation to Sender ──────────────────────────────────
        await sock.sendMessage(chatId, {
            text: `✅ *Server Created Successfully!*\n\n` +
                  `📋 *Summary:*\n` +
                  `├ Plan: ${planLabel.toUpperCase()}\n` +
                  `├ Username: ${userDetails.username}\n` +
                  `├ Server ID: ${serverDetails.id}\n` +
                  `├ RAM: ${PLAN_SPECS[planLabel].ram} MB\n` +
                  `├ CPU: ${PLAN_SPECS[planLabel].cpu}%\n` +
                  `└ Price: ${PLAN_SPECS[planLabel].price}\n\n` +
                  `📌 Credentials sent above.\n\n` +
                  `⚡ *Mickey Glitch Sub*`
        }, { quoted: msg });

        return true;

    } catch (error) {
        console.error('[BUY COMMAND ERROR]', error?.message || error);
        try {
            await sock.sendMessage(chatId, {
                text: `❌ *An error occurred*\n\n` +
                      `📌 ${error?.message || 'Unknown error'}\n\n` +
                      `💡 Please try again later.`
            }, { quoted: msg });
        } catch (sendErr) {
            console.error('[SEND ERROR]', sendErr.message);
        }
        return false;
    }
};

// ─── ──────────────────────────────────────────────────────────────────────
// 7. EXPORT
// ─── ──────────────────────────────────────────────────────────────────────

buyCommand.name = 'buy';
buyCommand.description = 'Create a real Pterodactyl server with user account';
buyCommand.category = 'PANEL';
buyCommand.aliases = ['purchase', 'host', 'server', 'create'];

module.exports = buyCommand;
module.exports.PLAN_SPECS = PLAN_SPECS;
module.exports.createPterodactylUser = createPterodactylUser;
module.exports.createPterodactylServer = createPterodactylServer;