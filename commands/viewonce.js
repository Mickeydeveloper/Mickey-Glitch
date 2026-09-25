const { downloadContentFromMessage, downloadMediaMessage } = require('@whiskeysockets/baileys');

function resolveQuotedMedia(message) {
    const candidates = [];

    const directQuoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (directQuoted) {
        candidates.push(directQuoted);
        if (directQuoted.viewOnceMessage?.message) candidates.push(directQuoted.viewOnceMessage.message);
        if (directQuoted.viewOnceMessageV2?.message) candidates.push(directQuoted.viewOnceMessageV2.message);
        if (directQuoted.viewOnceMessageV2Extension?.message) candidates.push(directQuoted.viewOnceMessageV2Extension.message);
    }

    const viewOnce = message?.message?.viewOnceMessage?.message;
    if (viewOnce) candidates.push(viewOnce);

    const viewOnceV2 = message?.message?.viewOnceMessageV2?.message;
    if (viewOnceV2) candidates.push(viewOnceV2);

    const viewOnceV2Extension = message?.message?.viewOnceMessageV2Extension?.message;
    if (viewOnceV2Extension) candidates.push(viewOnceV2Extension);

    const ephemeral = message?.message?.ephemeralMessage?.message;
    if (ephemeral) candidates.push(ephemeral);

    const topLevel = message?.message;
    if (topLevel?.imageMessage || topLevel?.videoMessage) candidates.push(topLevel);

    for (const candidate of candidates) {
        if (candidate?.viewOnceMessage?.message) {
            candidates.push(candidate.viewOnceMessage.message);
        }
        if (candidate?.viewOnceMessageV2?.message) {
            candidates.push(candidate.viewOnceMessageV2.message);
        }
        if (candidate?.viewOnceMessageV2Extension?.message) {
            candidates.push(candidate.viewOnceMessageV2Extension.message);
        }
        if (candidate?.ephemeralMessage?.message) {
            candidates.push(candidate.ephemeralMessage.message);
        }

        for (const type of ['image', 'video', 'audio', 'document', 'sticker']) {
            const media = candidate?.[`${type}Message`];
            if (media) {
                return {
                    type,
                    mediaMessage: candidate,
                    caption: media.caption || '',
                    mimetype: media.mimetype,
                    fileName: media.fileName || ''
                };
            }
        }
    }

    return null;
}

async function downloadMediaBuffer(message, mediaMessage, mediaType) {
    const strategies = [];

    strategies.push(async () => {
        const content = mediaMessage?.[`${mediaType}Message`] || mediaMessage;
        const stream = await downloadContentFromMessage(content, mediaType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    });

    if (typeof downloadMediaMessage === 'function') {
        strategies.push(async () => {
            const wrappedMessage = {
                key: message?.key || mediaMessage?.key,
                message: mediaMessage
            };
            return await downloadMediaMessage(wrappedMessage, 'buffer', {});
        });
    }

    let lastError = null;
    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('Unable to download media');
}

function getStatusCaption(message) {
    const text = String(
        message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || ''
    ).trim();
    return text.replace(/^[.!/#]?viewonce\s*/i, '').trim();
}

async function viewonceCommand(sock, chatId, message) {
    const mediaInfo = resolveQuotedMedia(message);

    if (!mediaInfo) {
        await sock.sendMessage(chatId, { text: '❌ Tafadhali reply picha, video, audio, document au sticker.' }, { quoted: message });
        return;
    }

    try {
        const buffer = await downloadMediaBuffer(message, mediaInfo.mediaMessage, mediaInfo.type);
        const caption = getStatusCaption(message) || mediaInfo.caption || '';

        await sock.sendMessage(chatId, {
            [mediaInfo.type]: buffer,
            ...(mediaInfo.mimetype
                ? { mimetype: mediaInfo.mimetype }
                : {}),
            ...(caption ? { caption } : {}),
            ...(mediaInfo.fileName ? { fileName: mediaInfo.fileName } : {}),
            groupStatus: true
        });
    } catch (err) {
        console.error('Group status media download failed:', err);
        await sock.sendMessage(chatId, {
            text: '❌ Media hii haikuweza kuwekwa kwenye group status. Jaribu tena baadaye.'
        }, { quoted: message });
    }
}

module.exports = viewonceCommand;