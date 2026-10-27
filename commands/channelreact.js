'use strict';

const API = process.env.REACT_API_URL || 'https://api.omegatech.app/api/Fun/Rch';
const DEFAULT_EMOJIS = ['😍', '🖤', '❤️', '💚', '💙', '💜'];
const EMOJI = /\p{Extended_Pictographic}(?:️|⃣)?(?:‍\p{Extended_Pictographic}️?)*/gu;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseTarget(text) {
    const channelLink = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)\/(\d+)/i.exec(text);
    if (channelLink) {
        return {
            invite: channelLink[1],
            serverId: channelLink[2],
            url: `https://whatsapp.com/channel/${channelLink[1]}/${channelLink[2]}`,
            rest: text.replace(channelLink[0], ' '),
        };
    }

    const newsletterId = /(\d{10,}@newsletter)\/(\d+)/i.exec(text);
    if (newsletterId) {
        return {
            jid: newsletterId[1],
            serverId: newsletterId[2],
            rest: text.replace(newsletterId[0], ' '),
        };
    }

    return null;
}

function getConnectedClients(core) {
    const clients = [{ name: 'main bot', client: core }];

    try {
        const subBots = require('../xmd/subBotManager').activeBots;
        if (subBots && typeof subBots.entries === 'function') {
            for (const [id, client] of subBots.entries()) {
                if (client && client.user && typeof client.newsletterReactMessage === 'function') {
                    clients.push({ name: `sub-bot ${id}`, client });
                }
            }
        }
    } catch (error) {
        // This build may not include sub-bot support.
    }

    const seen = new Set();
    return clients.filter(({ client }) => {
        const number = String(client?.user?.id || '').split(':')[0].split('@')[0];
        if (!number) return true;
        if (seen.has(number)) return false;
        seen.add(number);
        return true;
    });
}

async function reactViaApi(ctx, target, emojis, count) {
    if (!target.url) {
        return ctx.reply('❌ The API needs the channel post link (https://whatsapp.com/channel/.../123), not a channel ID.');
    }

    const params = new URLSearchParams({ action: 'react', url: target.url, emoji: emojis.join(',') });
    if (count) params.set('count', count);
    const formattedCount = count && Number.isSafeInteger(Number(count))
        ? Number(count).toLocaleString('en-US')
        : count;
    await ctx.reply(`💥 Sending ${formattedCount ? `${formattedCount} reactions ` : 'reactions '}${emojis.join(' ')} ...`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    let response;
    let result;

    try {
        response = await fetch(`${API}?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });
        const body = await response.text();
        try {
            result = JSON.parse(body);
        } catch (error) {
            result = { message: body.slice(0, 160) };
        }
    } catch (error) {
        const reason = error.name === 'AbortError' ? 'timed out' : error.message;
        return ctx.reply(`❌ Could not reach the reaction API (${reason}).`);
    } finally {
        clearTimeout(timer);
    }

    const data = result?.data || {};
    const explicitlyAccepted = result?.success === true || data.ok === true;
    if (explicitlyAccepted && response.status >= 200 && response.status < 300) {
        return ctx.reply(
            '✅ *API accepted the request*\n\n' +
            (data.message ? `📝 ${data.message}\n` : '') +
            `😀 ${data.emojis || emojis.join(', ')}\n` +
            (count ? `🔢 Requested: ${formattedCount}\n` : '') +
            (data.task_id ? `🆔 ${data.task_id}\n` : '') +
            '\n_This confirms queue acceptance only, not that reactions were delivered._'
        );
    }

    const reason = data.message || result?.message ||
        (typeof result?.error === 'string' ? result.error : result?.error?.message) ||
        (response.status >= 200 && response.status < 300
            ? 'The API did not confirm that the request was accepted.'
            : `HTTP ${response.status}`);
    return ctx.reply(`❌ The reaction API refused: ${String(reason).slice(0, 200)}`);
}

async function reactViaOwnAccounts(ctx, target, emojis, wanted) {
    const core = ctx.core;
    let channelId = target.jid;
    if (!channelId) {
        try {
            const metadata = await core.newsletterMetadata('invite', target.invite);
            channelId = metadata?.id;
        } catch (error) {
            // Report the invalid or inaccessible channel below.
        }
    }

    if (!channelId) {
        return ctx.reply('❌ I could not open that channel. Check the post link; it must end with a number.');
    }

    let accounts = getConnectedClients(core);
    if (Number.isFinite(wanted)) accounts = accounts.slice(0, Math.max(1, wanted));
    await ctx.reply(`💥 Reacting from *${accounts.length}* account${accounts.length === 1 ? '' : 's'} with ${emojis.join(' ')} ...`);

    const sent = {};
    const failed = [];
    let succeeded = 0;

    for (let index = 0; index < accounts.length; index++) {
        const { name, client } = accounts[index];
        const emoji = emojis[index % emojis.length];
        try {
            if (typeof client.newsletterReactMessage !== 'function') {
                throw new Error('This client does not support channel reactions');
            }
            await client.newsletterReactMessage(channelId, target.serverId, emoji);
            succeeded++;
            sent[emoji] = (sent[emoji] || 0) + 1;
        } catch (error) {
            failed.push(`${name}: ${String(error?.message || error).slice(0, 60)}`);
        }

        if (index < accounts.length - 1) await sleep(1000 + Math.random() * 1500);
    }

    const sentSummary = Object.entries(sent).map(([emoji, count]) => `${emoji} ${count}`).join('   ');
    return ctx.reply(
        `${succeeded ? '✅' : '❌'} *${succeeded}/${accounts.length}* reactions sent\n` +
        (sentSummary ? `${sentSummary}\n` : '') +
        (failed.length ? `\n⚠️ Failed:\n${failed.slice(0, 5).map((failure) => `• ${failure}`).join('\n')}` : '') +
        '\n\n_One account = one reaction._'
    );
}

module.exports = {
    name: 'channelreact',
    aliases: ['creact', 'boostreact', 'chreact'],
    category: 'group',
    permissions: { owner: true, coin: 0 },
    description: 'Boost reactions on a WhatsApp channel post',
    usage: '.channelreact <channel post link> <emojis> [count]',
    code: async (ctx) => {
        const ownerNumber = String(ctx.config?.ownerNumber || '').replace(/\D/g, '');
        const senderNumber = String(ctx.senderId || '').split(':')[0].split('@')[0].replace(/\D/g, '');
        if (!ctx.msg?.key?.fromMe && (!ownerNumber || senderNumber !== ownerNumber)) {
            return ctx.reply('❌ This command is only available to the owner.');
        }

        const prefix = '.';
        let text = (Array.isArray(ctx.args) ? ctx.args.join(' ') : String(ctx.text || '')).trim();
        const ownAccounts = /^own\b/i.test(text);
        if (ownAccounts) text = text.replace(/^own\b/i, ' ').trim();

        const target = parseTarget(text);
        if (!target) {
            return ctx.reply(
                '💥 *Channel reactions*\n\n' +
                'Send a channel post link (long-press the post > Share > Copy link), then emojis:\n\n' +
                `${prefix}channelreact https://whatsapp.com/channel/0029Vb.../2012 🤫 🤗 1000\n` +
                '(your emojis are used first; the list is filled to six)\n\n' +
                'Use only accounts connected to this bot:\n' +
                `${prefix}channelreact own <link> 😍 ❤️ 💜 [how many]`
            );
        }

        const mine = [...new Set(target.rest.match(EMOJI) || [])].slice(0, 6);
        const emojis = [...mine, ...DEFAULT_EMOJIS.filter((emoji) => !mine.includes(emoji))].slice(0, 6);
        const counts = target.rest.match(/\b\d+\b/g) || [];
        const count = counts.at(-1) || '';
        const numericCount = Number(count);

        if (ownAccounts) {
            return reactViaOwnAccounts(ctx, target, emojis, numericCount > 0 && Number.isSafeInteger(numericCount) ? numericCount : Infinity);
        }

        return reactViaApi(ctx, target, emojis, numericCount > 0 ? count : '');
    },
};