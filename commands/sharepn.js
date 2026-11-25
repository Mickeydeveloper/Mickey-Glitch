const isOwnerOrSudo = require('../lib/isOwner');
const { createCtx } = require('../lib/messageBuilder');

const MAX_SENDS = 10;
const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 10000;
const DEFAULT_DELAY_MS = 500;
const EXPIRATION_SECONDS = '7776000';

async function run(ctx) {
    const message = ctx.msg;
    const m = createCtx(ctx.sock, ctx.chatId, message, {
        args: ctx.args,
        command: 'sharepn',
        prefix: ctx.prefix || '.',
        senderId: ctx.senderId,
    });
    m.q = m.args.join(' ').trim();
    m.isOwner = await isOwnerOrSudo(m.senderId, m.sock, m.chatId);
    const amount = /^\d+$/.test(args[0] || '') ? Number(args[0]) : NaN;
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_SENDS) {
        return m.sock.sendMessage(m.chatId, { react: { text, key: m.msg.key } });
    };

    if (!m.isOwner) {
        return m.reply('❌ Owner au sudo pekee anaweza kutumia command hii.');
    }

    const args = m.q.split(/\s+/).filter(Boolean);
    const amount = Number.parseInt(args[0], 10);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_SENDS) {
        return m.reply(`Matumizi: *${m.used.prefix}${m.used.command || 'sharepn'} <1-${MAX_SENDS}> [here|namba|JID] [delay-ms]*\nMfano: .sharepn 3 here 500`);
    }

    const targetInput = args[1] || 'here';
    let target;
    if (targetInput.toLowerCase() === 'here') {
        target = m.chatId;
    } else if (/^\d{8,16}$/.test(targetInput)) {
        target = `${targetInput}@s.whatsapp.net`;
    } else if (/^[^@\s]+@(s\.whatsapp\.net|g\.us|lid)$/.test(targetInput)) {
        target = targetInput;
    } else {
        return m.reply('Target si sahihi. Tumia `here`, namba ya WhatsApp, au JID halali.');
    }

    const requestedDelay = args[2] === undefined
        ? DEFAULT_DELAY_MS
        : /^\d+$/.test(args[2]) ? Number(args[2]) : NaN;
    if (!Number.isInteger(requestedDelay) || requestedDelay < MIN_DELAY_MS || requestedDelay > MAX_DELAY_MS) {
        return m.reply(`Delay iwe kati ya ${MIN_DELAY_MS} na ${MAX_DELAY_MS} ms.`);
    }

    const protocol = { protocolMessage: { type: 11 } };
    let sent = 0;

    try {
        await m.react('⏳');
        for (let index = 0; index < amount; index++) {
            await m.sock.relayMessage(target, protocol, {
                additionalAttributes: { expiration: EXPIRATION_SECONDS },
            });
            sent++;

            if (index < amount - 1) {
                await new Promise((resolve) => setTimeout(resolve, requestedDelay));
            }
        }

        console.log(`[sharepn] Sent ${sent}/${amount} protocol messages to ${target} (delay ${requestedDelay}ms)`);
        return m.reply(`✅ Share Phone Number protocol imetumwa ${sent}/${amount}× kwenda ${target}. Delay: ${requestedDelay}ms.`);
    } catch (error) {
        console.error('[sharepn] Failed:', error?.stack || error);
        return m.reply(`❌ Imeshindikana baada ya ${sent}/${amount}: ${error?.message || error}`);
    } finally {
        try {
            await m.react('');
        } catch {}
    }
}

module.exports = {
    name: 'sharepn',
    cmd: ['sp', 'sharepn', 'sharephonenumber'],
    aliases: ['sp', 'sharephonenumber'],
    category: 'owner',
    description: 'Send a Share Phone Number protocol message',
    help: ['sharepn <amount> [here|target] [delay-ms]'],
    owner: true,
    code: run,
};