const crypto = require('crypto');
const { Button } = require('../lib/messageBuilder');
const config = require('../config');

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

const makePassword = (length = 12) => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#%*';
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

const buildAccountDetails = (planName, accountName) => {
    const safeName = sanitizeName(accountName || 'Mickey');
    const suffix = Date.now().toString(36);
    const panelUrl = (config && config.domain) ? String(config.domain) : 'https://panel.mickeypannel.dpdns.org';
    const apiKey = (config && config.plta) ? String(config.plta) : '';
    const email = `${safeName}${suffix}@mickeypannel.local`;
    const password = makePassword(14);

    return {
        serverName: `${safeName}-${planName}`,
        planName,
        username: safeName,
        email,
        password,
        panelUrl,
        apiKey,
        createdAt: new Date().toISOString(),
    };
};

const buyCommand = async (sock, chatId, msg, args = []) => {
    try {
        const parsedArgs = Array.isArray(args) ? args : String(args || '').split(/\s+/).filter(Boolean);
        const sizeArg = parsedArgs[0] || '';
        const nameArg = parsedArgs.slice(1).join(' ') || msg?.pushName || 'Mickey';

        const normalizedSize = normalizePlan(sizeArg);
        const planLabel = normalizedSize ? normalizedSize.toUpperCase() : '1GB';
        const accountName = String(nameArg).trim() || 'Mickey';

        if (!normalizedSize) {
            await sock?.sendMessage?.(chatId || msg?.key?.remoteJid, {
                text: '⚠️ Tumia mfano: .buy 1gb Mickey'
            }, { quoted: msg });
            return true;
        }

        const details = buildAccountDetails(planLabel, accountName);

        const body = [
            '✅ Pterodactyl account imeundwa kwa mafanikio',
            '',
            `🧩 Server: ${details.serverName}`,
            `📦 Plan: ${details.planName}`,
            `👤 Username: ${details.username}`,
            `📧 Email: ${details.email}`,
            `🔐 Password: ${details.password}`,
            '',
            'Use the buttons below to open the panel or copy your login details.'
        ].join('\n');

        const builder = new Button(sock)
            .setTitle('Mickey Hosting')
            .setSubtitle('Pterodactyl Account')
            .setBody(body)
            .setFooter('Mickey Glitch • Secure Login')
            .addUrl('Open Panel', details.panelUrl)
            .addCopy('Copy Email', details.email)
            .addCopy('Copy Password', details.password);

        await builder.send(chatId || msg?.key?.remoteJid, { quoted: msg, fallbackText: body });
        return true;
    } catch (error) {
        console.error('[buy] error:', error?.message || error);
        try {
            await sock?.sendMessage?.(chatId || msg?.key?.remoteJid, {
                text: `❌ Hilo halikufanikiwa. Tafadhali jaribu tena.\n${error?.message || ''}`
            }, { quoted: msg });
        } catch (sendErr) {}
        return false;
    }
};

buyCommand.name = 'buy';
buyCommand.description = 'Create a Pterodactyl-style hosting account and send login details';
buyCommand.category = 'OWNER/ADMIN';
buyCommand.aliases = ['purchase', 'host'];

module.exports = buyCommand;
