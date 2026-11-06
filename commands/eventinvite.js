const { randomUUID } = require('node:crypto');
const settings = require('../settings');
const { getSudoList } = require('../lib/index');

const THUMBNAIL_URL = 'https://cdn.ornzora.eu.cc/4d4f3591-1c3e-4e1b-b1c2-45faeb91b781-fiora.jpg';
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

function normalizeNumber(value) {
    return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function eventInviteCommand(sock, chatId, message) {
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });
    const messageKey = message?.key || {};
    const senderIds = [
        messageKey.participant,
        messageKey.remoteJid,
        messageKey.participantAlt,
        messageKey.remoteJidAlt,
    ].filter((value) => typeof value === 'string' && value);
    const authorizedNumbers = new Set([
        normalizeNumber(settings.ownerNumber),
        ...(await getSudoList()).map(normalizeNumber),
    ].filter(Boolean));

    if (typeof sock?.signalRepository?.lidMapping?.getPNForLID === 'function') {
        for (const senderId of senderIds.filter((value) => value.endsWith('@lid'))) {
            try {
                const phoneJid = await sock.signalRepository.lidMapping.getPNForLID(senderId);
                if (phoneJid) senderIds.push(phoneJid);
            } catch (error) {
                console.debug('[eventinvite] Could not resolve sender LID:', error?.message || error);
            }
        }
    }

    const isAuthorized = senderIds.some((senderId) =>
        !senderId.endsWith('@lid') && authorizedNumbers.has(normalizeNumber(senderId))
    );

    if (!isAuthorized) {
        return reply('Owner au sudo pekee anaweza kutumia command hii.');
    }

    try {
        const response = await fetch(THUMBNAIL_URL, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`Thumbnail fetch failed (${response.status})`);

        const thumbnail = Buffer.from(await response.arrayBuffer());
        if (thumbnail.length > MAX_THUMBNAIL_BYTES) {
            throw new Error('Thumbnail exceeds the 2 MB limit');
        }
        if (thumbnail.length < 3 || thumbnail[0] !== 0xff || thumbnail[1] !== 0xd8 || thumbnail[2] !== 0xff) {
            throw new Error('Thumbnail is not a valid JPEG image');
        }

        const result = await sock.relayMessage(chatId, {
            eventInviteMessage: {
                eventId: randomUUID(),
                eventTitle: 'nixcode',
                jpegThumbnail: thumbnail,
                startTime: Math.floor(Date.now() / 1000),
            },
        }, {
            additionalNodes: [{
                tag: 'meta',
                attrs: { context_source: 'event_invitation' },
            }],
        });

        return reply(`Event invite imetumwa. ID: ${result || 'imetumwa'}`);
    } catch (error) {
        console.error('[eventinvite] Failed to send event invite:', error?.message || error);
        return reply(`Imeshindikana kutuma event invite: ${error?.message || 'angalia log za bot.'}`);
    }
}

eventInviteCommand.description = 'Tuma WhatsApp event invitation';
eventInviteCommand.category = 'OWNER';
eventInviteCommand.aliases = ['eventinv'];

module.exports = eventInviteCommand;