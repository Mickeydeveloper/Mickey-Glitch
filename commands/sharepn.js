const settings = require('../settings');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { getSudoList } = require('../lib/index');

const MAX_MESSAGES = 3;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

async function sharePhoneNumberCommand(sock, chatId, message, args = []) {
    const messageKey = message?.key || {};
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });
    const normalizeNumber = (value) => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
    const authorizedNumbers = new Set([
        normalizeNumber(settings.ownerNumber),
        ...(await getSudoList()).map(normalizeNumber),
    ].filter(Boolean));
    const senderIds = [
        messageKey.participant,
        messageKey.remoteJid,
        messageKey.participantAlt,
        messageKey.remoteJidAlt,
        message?.participant,
        message?.sender,
    ].filter((value) => typeof value === 'string' && value);

    if (typeof sock?.signalRepository?.lidMapping?.getPNForLID === 'function') {
        for (const senderId of senderIds.filter((value) => value.endsWith('@lid'))) {
            try {
                const phoneJid = await sock.signalRepository.lidMapping.getPNForLID(senderId);
                if (phoneJid) senderIds.push(phoneJid);
            } catch (error) {
                console.debug('[sharepn] Could not resolve sender LID:', error?.message || error);
            }
        }
    }

    const isAuthorized = senderIds.some((senderId) => {
        if (senderId.endsWith('@lid')) return false;
        return authorizedNumbers.has(normalizeNumber(senderId));
    });

    if (!isAuthorized) {
        return reply('Owner au sudo pekee anaweza kutumia command hii.');
    }

    const isPrivateChat = chatId?.endsWith('@s.whatsapp.net') || chatId?.endsWith('@lid');
    if (!isPrivateChat || !senderIds.includes(chatId)) {
        return reply('Command hii inafanya kazi kwenye DM yako binafsi pekee, si kwenye group au chat ya mtu mwingine.');
    }

    const values = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
    const amount = Number.parseInt(values[0], 10);
    const target = values[1] || 'here';
    const requestedDelay = values[2] === undefined ? 1000 : Number.parseInt(values[2], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MESSAGES || target !== 'here') {
        return reply(`Matumizi: .sharepn <1-${MAX_MESSAGES}> [here] [delay-ms]\nTarget za nje haziruhusiwi.`);
    }

    if (!Number.isInteger(requestedDelay) || requestedDelay < 0) {
        return reply('Delay lazima iwe namba isiyo hasi ya milliseconds.');
    }

    const delay = Math.min(Math.max(requestedDelay, MIN_DELAY_MS), MAX_DELAY_MS);
    const protocol = { protocolMessage: { type: 11 } };
    let sent = 0;
    let lastMessageId = '';

    try {
        for (let index = 0; index < amount; index++) {
            const generated = generateWAMessageFromContent(chatId, protocol, {
                userJid: sock.user?.id,
            });
            const relayResult = await sock.relayMessage(chatId, generated.message, {
                messageId: generated.key.id,
                additionalAttributes: { expiration: '7776000' },
            });
            sent++;

            const messageId = typeof relayResult === 'string' ? relayResult : generated.key.id;
            lastMessageId = messageId;
            console.log(`[sharepn] Relayed protocol message ${messageId} to ${chatId}`);

            if (index < amount - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        return reply(`Baileys ime-relay protocol ${sent}/${amount}. ID: ${lastMessageId}. Protocol hii haina maandishi ya bubble ya kawaida.`);
    } catch (error) {
        console.error('[sharepn] Failed to relay protocol message:', error?.message || error);
        return reply(`Imeshindikana: zimetumwa ${sent}/${amount}.`);
    }
}

sharePhoneNumberCommand.description = 'Tuma Share Phone Number protocol message ya majaribio kwenye DM yako';
sharePhoneNumberCommand.category = 'OWNER';
sharePhoneNumberCommand.aliases = ['sp', 'sharephonenumber'];

module.exports = sharePhoneNumberCommand;