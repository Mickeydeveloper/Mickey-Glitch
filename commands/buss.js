const { randomBytes } = require('node:crypto');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const settings = require('../settings');
const { getSudoList } = require('../lib/index');

const IMAGE_URL = 'https://meguminzap.is-dev.me/u/I4nSz899Qk1pZWw24brRGT2o7k36llV0.jpg';

function normalizeNumber(value) {
    return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function bussCommand(sock, chatId, message) {
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
                console.debug('[buss] Could not resolve sender LID:', error?.message || error);
            }
        }
    }

    const isAuthorized = senderIds.some((senderId) =>
        !senderId.endsWith('@lid') && authorizedNumbers.has(normalizeNumber(senderId))
    );

    if (!isAuthorized) {
        return reply('Owner au sudo pekee anaweza kutumia command hii.');
    }

    const greeting = 'Hi Business';
    const contactNumber = normalizeNumber(settings.ownerNumber);
    const content = {
        extendedTextMessage: {
            text: 'wow',
            contextInfo: {
                externalAdReply: {
                    title: 'Megumin Dominada BUSI',
                    body: greeting,
                    mediaType: 1,
                    thumbnailUrl: IMAGE_URL,
                    thumbnail: Buffer.alloc(0),
                    sourceType: 'whatsapp',
                    sourceId: String(randomBytes(4).readUInt32BE(0)),
                    sourceUrl: `https://wa.me/${contactNumber}`,
                    containsAutoReply: false,
                    renderLargerThumbnail: false,
                    showAdAttribution: true,
                    originalImageUrl: IMAGE_URL,
                },
            },
        },
    };

    try {
        const generated = generateWAMessageFromContent(chatId, content, {
            userJid: sock.user?.id,
        });
        const messageId = await sock.relayMessage(chatId, generated.message, {
            messageId: generated.key.id,
        });

        return reply(`Greeting card imetumwa. ID: ${messageId || generated.key.id}`);
    } catch (error) {
        console.error('[buss] Failed to send greeting card:', error?.message || error);
        return reply('Imeshindikana kutuma greeting card. Angalia log za bot kwa maelezo.');
    }
}

bussCommand.description = 'Tuma WhatsApp Business greeting card';
bussCommand.category = 'OWNER';
bussCommand.aliases = [];

module.exports = bussCommand;