const settings = require('../settings');

const MAX_MESSAGES = 3;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

function normalizeNumber(value) {
    return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function sharePhoneNumberCode(ctx) {
    const { sock, chatId, senderId, msg, args = [] } = ctx;
    const reply = (text) => ctx.reply(text);
    const ownerNumber = normalizeNumber(settings.ownerNumber);
    const senderIds = [
        senderId,
        msg?.key?.participant,
        msg?.key?.remoteJid,
        msg?.key?.participantAlt,
        msg?.key?.remoteJidAlt,
    ].filter((value) => typeof value === 'string' && value);

    if (typeof sock?.signalRepository?.lidMapping?.getPNForLID === 'function') {
        for (const id of senderIds.filter((value) => value.endsWith('@lid'))) {
            try {
                const phoneJid = await sock.signalRepository.lidMapping.getPNForLID(id);
                if (phoneJid) senderIds.push(phoneJid);
            } catch (error) {
                console.debug('[sharepn] Could not resolve sender LID:', error?.message || error);
            }
        }
    }

    const isOwner = ownerNumber && senderIds.some((id) =>
        !id.endsWith('@lid') && normalizeNumber(id) === ownerNumber
    );
    if (!isOwner) return reply(global.action?.owneronly || 'Owner only');

    const values = Array.isArray(args)
        ? args.map(String).filter(Boolean)
        : String(args || '').trim().split(/\s+/).filter(Boolean);
    const amount = Number.parseInt(values[0], 10);
    const targetInput = values[1] || 'here';
    const delayInput = values[2] === undefined ? 1000 : Number.parseInt(values[2], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MESSAGES) {
        return reply(`Matumizi: ${ctx.prefix || '.'}${ctx.command || 'sp'} <1-${MAX_MESSAGES}> [here|namba yako] [delay-ms]`);
    }
    if (!Number.isInteger(delayInput) || delayInput < 0) {
        return reply('Delay lazima iwe namba isiyo hasi ya milliseconds.');
    }

    let sendTo;
    if (targetInput.toLowerCase() === 'here') {
        const isPrivateChat = chatId.endsWith('@s.whatsapp.net') || chatId.endsWith('@lid');
        if (!isPrivateChat || !senderIds.includes(chatId)) {
            return reply('Target "here" inaruhusiwa kwenye DM yako binafsi pekee.');
        }
        sendTo = chatId;
    } else {
        const targetNumber = normalizeNumber(targetInput);
        if (!targetNumber || targetNumber !== ownerNumber) {
            return reply('Target maalum lazima iwe namba yako ya owner.');
        }
        sendTo = `${ownerNumber}@s.whatsapp.net`;
    }

    const delayMs = Math.min(Math.max(delayInput, MIN_DELAY_MS), MAX_DELAY_MS);
    const protocol = { protocolMessage: { type: 11 } };
    const messageKey = msg?.key;
    let sent = 0;

    if (messageKey) {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: messageKey } }).catch(() => {});
    }

    try {
        for (let index = 0; index < amount; index++) {
            await sock.relayMessage(sendTo, protocol, {
                additionalAttributes: { expiration: '7776000' },
            });
            sent++;

            if (index < amount - 1) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        return reply(`Baileys ime-relay protocol ${sent}/${amount} kwenye ${sendTo}. Kumbuka: protocol hii haina bubble ya maandishi ya kawaida.`);
    } catch (error) {
        console.error('[sharepn] Relay failed:', error?.message || error);
        return reply(`Imeshindikana: zimetumwa ${sent}/${amount}. ${error?.message || ''}`.trim());
    } finally {
        if (messageKey) {
            await sock.sendMessage(chatId, { react: { text: '', key: messageKey } }).catch(() => {});
        }
    }
}

module.exports = {
    name: 'sharepn',
    aliases: ['sp', 'sharephonenumber'],
    description: 'Tuma Share Phone Number protocol message ya majaribio',
    category: 'OWNER',
    code: sharePhoneNumberCode,
};
