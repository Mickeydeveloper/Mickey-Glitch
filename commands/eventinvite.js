const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const settings = require('../settings');
const { getSudoList } = require('../lib/index');

const THUMBNAIL_URL = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/chatbot.png';

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

        const image = Buffer.from(await response.arrayBuffer());
        if (image.length > MAX_THUMBNAIL_BYTES) {
            throw new Error('Thumbnail exceeds the 2 MB limit');
        }
        if (!image.length) {
            throw new Error('Thumbnail response was empty');
        }

        const thumbnail = await sharp(image, { limitInputPixels: 16000000 })
            .rotate()
            .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        if (thumbnail.length > MAX_THUMBNAIL_BYTES) {
            throw new Error('Converted JPEG thumbnail exceeds the 2 MB limit');
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