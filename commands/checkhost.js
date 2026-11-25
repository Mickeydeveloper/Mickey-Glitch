const axios = require('axios');
const { createCtx } = require('../lib/messageBuilder');

const API_URL = 'https://prexzyapis.com/tools/hostcheck';

function normalizeDomain(input) {
    let value = String(input || '').trim();
    if (!value) return '';

    if (/^https?:\/\//i.test(value)) {
        try {
            value = new URL(value).hostname;
        } catch {
            return '';
        }
    }

    value = value.replace(/\.$/, '').toLowerCase();
    if (
        value.length > 253 ||
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)
    ) return '';

    return value;
}

function formatProviders(providers = []) {
    if (!Array.isArray(providers) || !providers.length) return 'None reported';
    return providers.slice(0, 5).map((provider) => {
        const name = provider.organization || provider.domain || 'Unknown provider';
        const country = provider.country ? ` (${provider.country})` : '';
        return `• ${name}${country}`;
    }).join('\n');
}

function formatHostReport(data, requestedDomain) {
    const domain = data.domain || data.original_domain || requestedDomain;
    const webServers = data.web_servers || {};
    const nameservers = data.nameservers || {};
    const mail = data.mail_servers || {};
    const ipv6 = data.ipv6_support || {};

    const ips = (webServers.ips || []).slice(0, 8).map((item) => {
        const location = item.location;
        const place = [location?.city, location?.country].filter(Boolean).join(', ');
        const provider = item.provider?.organization;
        return `• ${item.address}${place ? ` | ${place}` : ''}${provider ? ` | ${provider}` : ''}`;
    });

    const ns = (nameservers.servers || []).slice(0, 8).map((server) => {
        const addresses = (server.ips || []).map((ip) => ip.address).filter(Boolean).slice(0, 3);
        return `• ${server.domain || 'Unknown'}${addresses.length ? ` (${addresses.join(', ')})` : ''}`;
    });

    const checkedAt = data.summary?.checked_at
        ? new Date(data.summary.checked_at).toLocaleString('en-GB', { timeZone: 'UTC', timeZoneName: 'short' })
        : 'Unavailable';
    const lines = [
        `🌐 *HOST CHECK: ${domain}*`,
        '',
        `*Web servers:* ${webServers.total_ips ?? ips.length}`,
        ips.length ? ips.join('\n') : '• No web IPs reported',
        '',
        '*Web providers:*',
        formatProviders(webServers.providers),
        '',
        `*Nameservers:* ${nameservers.total_servers ?? ns.length}`,
        ns.length ? ns.join('\n') : '• None reported',
        '',
        '*Nameserver providers:*',
        formatProviders(nameservers.providers),
        '',
        `*Mail:* incoming ${mail.incoming?.total_servers ?? 0}, outgoing ${mail.outgoing?.total_ips ?? 0}`,
        `*IPv6:* web ${ipv6.web === null || ipv6.web === undefined ? 'unknown' : ipv6.web ? 'yes' : 'no'}, nameserver ${ipv6.nameserver === null || ipv6.nameserver === undefined ? 'unknown' : ipv6.nameserver ? 'yes' : 'no'}`,
        `*Checked:* ${checkedAt}`,
    ];

    return lines.join('\n').slice(0, 3800);
}

async function checkHostCode(ctx) {
    const message = ctx.msg;
    const commandCtx = createCtx(ctx.sock, ctx.chatId, message, {
        args: ctx.args,
        command: 'checkhost',
        prefix: ctx.prefix || '.',
        senderId: ctx.senderId,
    });
    const input = commandCtx.args.join(' ').trim();
    const domain = normalizeDomain(input);

    if (!domain) {
        return commandCtx.reply('Matumizi: `.checkhost <domain>`\nMfano: `.checkhost example.com`');
    }

    try {
        const response = await axios.get(API_URL, {
            params: { domain },
            timeout: 30000,
            headers: { Accept: 'application/json' },
        });
        const payload = response.data;
        if (payload?.status !== true) {
            throw new Error(payload?.message || 'Host check API haikurudisha matokeo.');
        }

        return commandCtx.reply(formatHostReport(payload, domain));
    } catch (error) {
        console.error('[checkhost] API request failed:', error?.stack || error);
        const status = error.response?.status;
        const details = status ? `HTTP ${status}` : error.message || 'Unknown error';
        return commandCtx.reply(`❌ Checkhost imeshindwa: ${details}`);
    }
}

module.exports = {
    name: 'checkhost',
    aliases: ['hostcheck'],
    description: 'Check public DNS, hosting providers, mail and IPv6 details for a domain',
    category: 'TOOLS',
    code: checkHostCode,
};