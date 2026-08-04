const moment = require('moment-timezone');
const axios = require('axios');
const { Button } = require('./lib/messageBuilder');

function generateRandomPassword(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
}

async function createPanel(ctx, { plan = '1gb', username = null } = {}) {
    if (!ctx || !ctx.sock) {
        throw new Error('Invalid context passed to createPanel');
    }

    const args = Array.isArray(ctx.args) ? ctx.args : [];
    const planArg = plan || args[0] || '1gb';
    const sizeArg = String(planArg).toLowerCase();
    const seedName = username || args.slice(sizeArg ? 1 : 0).join(' ').trim() || ctx.senderId?.split('@')[0] || 'mickey';
    const userName = seedName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'mickey';
    const targetJid = (ctx.quoted && ctx.quoted.sender) ? ctx.quoted.sender : ctx.senderId || ctx.chatId;
    const email = `${userName}.${Date.now()}@gmail.com`;
    const password = generateRandomPassword(10);
    const selectedPlan = ['1gb', '2gb', '4gb'].includes(sizeArg) ? sizeArg : '1gb';

    const panelDomain = global.domain || global.PTERODACTYL?.domain;
    const panelKey = global.plta || global.PTERODACTYL?.apiKey;
    const nestId = global.nestId || global.PTERODACTYL?.nestId || '1';
    const eggId = global.eggs || global.PTERODACTYL?.eggId;
    const locationId = global.locc || global.PTERODACTYL?.locationId;
    const timezone = global.TIMEZONE || global.PTERODACTYL?.timezone || 'Africa/Nairobi';

    if (!panelDomain || !panelKey) {
        return await ctx.reply('❌ Pterodactyl panel configuration haijatolewa. Tafadhali angalia config.');
    }

    const planSettings = {
        '1gb': { memo: '1150', cpu: '30', disk: '1150' },
        '2gb': { memo: '2048', cpu: '50', disk: '5120' },
        '4gb': { memo: '4096', cpu: '80', disk: '10240' },
    };

    const selected = planSettings[selectedPlan] || planSettings['1gb'];

    const panelDomain = global.domain || global.PTERODACTYL?.domain;
    const panelKey = global.plta || global.PTERODACTYL?.apiKey;
    const eggId = global.eggs || global.PTERODACTYL?.eggId;
    const locationId = global.locc || global.PTERODACTYL?.locationId;
    const timezone = global.TIMEZONE || global.PTERODACTYL?.timezone || 'Africa/Nairobi';

    if (!panelDomain || !panelKey) {
        return await ctx.reply('❌ Pterodactyl panel configuration haijatolewa. Tafadhali angalia config.');
    }

    const planSettings = {
        '1gb': { memo: memo || '1150', cpu: cpu || '30', disk: disk || '1150' },
        '2gb': { memo: memo || '2048', cpu: cpu || '50', disk: disk || '5120' },
        '4gb': { memo: memo || '4096', cpu: cpu || '80', disk: disk || '10240' },
    };

    const selected = planSettings[type] || planSettings['1gb'];

    await ctx.reply('_Kwa sasa tunaendelea kuunda server yako... Tafadhali subiri_');

    let userId;
    try {
        const userRes = await axios.post(`${panelDomain}/api/application/users`, {
            email,
            username: userName,
            first_name: userName,
            last_name: userName,
            language: 'en',
            password,
        }, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${panelKey}`,
            },
            timeout: 15000,
        });

        if (userRes.data && userRes.data.attributes && userRes.data.attributes.id) {
            userId = userRes.data.attributes.id;
        } else if (userRes.data && userRes.data.errors) {
            const err = userRes.data.errors[0];
            throw new Error(err.detail || err.title || 'Failed to create panel user');
        } else {
            throw new Error('Failed to create panel user');
        }
    } catch (error) {
        const existing = String(error.response?.data || error.message || error).toLowerCase();
        if (existing.includes('email') && existing.includes('already') || existing.includes('username') && existing.includes('already')) {
            await ctx.reply('❗ Userame au email tayari zipo kwenye panel. Inatumika account iliyopo.');
        } else {
            console.error('[createPanel] user creation error:', error.response?.data || error.message || error);
            throw new Error('Failed to create panel user. Check Panel API and config.');
        }
    }

    let eggData;
    try {
        const eggRes = await axios.get(`${panelDomain}/api/application/nests/1/eggs/${eggId}`, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${panelKey}`,
            },
            timeout: 15000,
        });
        eggData = eggRes.data?.attributes;
        if (!eggData || !eggData.startup) {
            throw new Error('Invalid egg data received from panel');
        }
    } catch (error) {
        console.error('[createPanel] egg fetch error:', error.response?.data || error.message || error);
        throw new Error('Failed to fetch egg configuration. Please verify egg ID and panel API.');
    }

    const startupCmd = eggData.startup || 'npm start';
    const serverName = `${userName}-${type}-${Date.now()}`;

    let server;
    try {
        const resServer = await axios.post(`${panelDomain}/api/application/servers`, {
            name: serverName,
            user: userId,
            egg: parseInt(eggId, 10),
            docker_image: eggData.docker_image || 'ghcr.io/parkervcp/yolks:nodejs_18',
            startup: startupCmd,
            environment: {
                INST: 'npm',
                USER_UPLOAD: '0',
                AUTO_UPDATE: '0',
                CMD_RUN: 'npm start',
                JS_FILE: 'index.js',
                MAIN_FILE: 'index.js',
            },
            limits: {
                memory: parseInt(selected.memo, 10),
                swap: 0,
                disk: parseInt(selected.disk, 10),
                io: 500,
                cpu: parseInt(selected.cpu, 10),
            },
            feature_limits: {
                databases: 0,
                backups: 0,
            },
            deploy: {
                locations: [parseInt(locationId, 10)],
                dedicated_ip: false,
                port_range: [],
            },
        }, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${panelKey}`,
            },
            timeout: 30000,
        });

        if (resServer.data && resServer.data.attributes) {
            server = resServer.data.attributes;
        } else if (resServer.data && resServer.data.errors) {
            const err = resServer.data.errors[0];
            throw new Error(err.detail || err.title || 'Failed to create server');
        } else {
            throw new Error('Failed to create server');
        }
    } catch (error) {
        console.error('[createPanel] server creation error:', error.response?.data || error.message || error);
        throw new Error('Failed to create server. Check Panel API and server settings.');
    }

    try {
        await new Button(ctx.core)
            .setTitle('📋 Panel Data')
            .setBody(
                `*SERVER CREATED SUCCESSFULLY!*

` +
                `• Username: ${userName}
` +
                `• Password: ${password}
` +
                `• Panel: ${panelDomain}
` +
                `• Server Name: ${server.name || serverName}
` +
                `• Status: ${server.relationships?.allocation?.attributes?.is_active ? 'ACTIVE' : 'PENDING'}

` +
                `Keep this information safe.`
            )
            .setImage('https://i.pinimg.com/736x/e9/84/8e/e9848e90f9a4cc57c839c6e579472169.jpg')
            .addCopy('📋 Copy Username', userName)
            .addCopy('🔑 Copy Password', password)
            .addUrl('🌐 Open Panel', panelDomain, false)
            .send(targetJid, { quoted: ctx.msg });
    } catch (error) {
        console.error('[createPanel] button send error:', error.message || error);
        await ctx.reply(
            `📋 *Server created successfully!*
` +
            `• Username: ${userName}
` +
            `• Password: ${password}
` +
            `• Panel: ${panelDomain}
` +
            `• Server Name: ${server.name || serverName}
`
        );
    }

    return server;
}

module.exports = createPanel;
