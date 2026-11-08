const settings = require('../settings');

const MAX_MESSAGES = 3;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

function normalizeNumber(value) {
    return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function withTimeout(promise, timeoutMs, label) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} imechukua muda mrefu.`)), timeoutMs);
        }),
    ]).finally(() => clearTimeout(timer));
}

function getContact(sock, jid) {
    const contacts = sock?.contacts || sock?.store?.contacts;
    if (contacts instanceof Map) return contacts.get(jid);
    return contacts?.[jid];
}

async function lookupNumber(ctx, rawNumber) {
    const { sock, reply } = ctx;
    const number = normalizeNumber(rawNumber);
    if (!/^\d{8,15}$/.test(number)) {
        return reply(`Tumia: ${ctx.prefix || '.'}${ctx.command || 'sharepn'} info <namba-yenye-country-code>`);
    }
    if (typeof sock?.onWhatsApp !== 'function') {
        return reply('Baileys hii haina onWhatsApp() ya kuthibitisha namba kwa sasa.');
    }

    await reply(`🔎 Nafanya lookup ya live kwa +${number}...`);

    try {
        const results = await withTimeout(sock.onWhatsApp(number), 15000, 'Lookup');
        const account = Array.isArray(results)
            ? results.find((entry) => entry?.exists && entry?.jid) || results[0]
            : null;

        if (!account?.exists || !account?.jid) {
            return reply(`📱 +${number}\nWhatsApp: haijasajiliwa au namba haikupatikana.`);
        }

        const jid = account.jid;
        let lid = account.lid || null;
        if (!lid && typeof sock?.signalRepository?.lidMapping?.getLIDForPN === 'function') {
            try {
                lid = await withTimeout(
                    sock.signalRepository.lidMapping.getLIDForPN(jid),
                    5000,
                    'LID lookup'
                );
            } catch (error) {
                console.debug('[sharepn] LID lookup unavailable:', error?.message || error);
            }
        }

        const contact = getContact(sock, jid) || {};
        const displayName = contact.name || contact.notify || contact.verifiedName || '';
        let pictureUrl = null;
        let business = null;

        if (typeof sock.profilePictureUrl === 'function') {
            try {
                pictureUrl = await withTimeout(sock.profilePictureUrl(jid, 'image'), 8000, 'Profile picture');
            } catch {}
        }
        if (typeof sock.getBusinessProfile === 'function') {
            try {
                business = await withTimeout(sock.getBusinessProfile(jid), 8000, 'Business profile');
            } catch {}
        }

        const lines = [
            `📱 *Taarifa za +${number}*`,
            'WhatsApp: ✅ imesajiliwa',
            `JID: ${jid}`,
        ];
        if (lid) lines.push(`LID: ${typeof lid === 'string' ? lid : lid?.lid || 'inapatikana'}`);
        if (displayName) lines.push(`Jina kwenye contacts: ${displayName}`);

        const businessFields = [
            ['Business description', business?.description],
            ['Business address', business?.address],
            ['Business email', business?.email],
            ['Business website', business?.website],
        ];
        const availableBusinessFields = businessFields.filter(([, value]) => typeof value === 'string' && value.trim());
        if (availableBusinessFields.length) {
            lines.push('', '*Business profile*');
            for (const [label, value] of availableBusinessFields) lines.push(`${label}: ${value.trim()}`);
        }

        if (pictureUrl) {
            try {
                await sock.sendMessage(ctx.chatId, {
                    image: { url: pictureUrl },
                    caption: lines.join('\n'),
                }, { quoted: ctx.msg });
                return;
            } catch (error) {
                console.debug('[sharepn] Could not send profile picture:', error?.message || error);
            }
        }
        return reply(lines.join('\n'));
    } catch (error) {
        console.error('[sharepn] Live number lookup failed:', error?.message || error);
        return reply(`Lookup ya +${number} imeshindikana: ${error?.message || 'jaribu tena baadaye.'}`);
    }
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
    const action = String(values[0] || '').toLowerCase();
    if (['info', 'lookup', 'check'].includes(action)) {
        return lookupNumber(ctx, values[1]);
    }
    if (values[0] && /^\+?\d{8,15}$/.test(values[0])) {
        return lookupNumber(ctx, values[0]);
    }

    const relayValues = action === 'relay' ? values.slice(1) : values;
    const amount = Number.parseInt(relayValues[0], 10);
    const targetInput = relayValues[1] || 'here';
    const delayInput = relayValues[2] === undefined ? 1000 : Number.parseInt(relayValues[2], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MESSAGES) {
        return reply(`Matumizi:\n${ctx.prefix || '.'}${ctx.command || 'sharepn'} info <namba>\n${ctx.prefix || '.'}${ctx.command || 'sharepn'} relay <1-${MAX_MESSAGES}> [here|namba yako] [delay-ms]`);
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
    description: 'Pata live WhatsApp info ya namba au tuma Share Phone Number protocol',
    category: 'OWNER',
    code: sharePhoneNumberCode,
};
