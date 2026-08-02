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

        if (candidate?.imageMessage) {
            return {
                type: 'image',
                mediaMessage: candidate,
                caption: candidate.imageMessage.caption || '',
                fileName: 'media.jpg'
            };
        }

        if (candidate?.videoMessage) {
            return {
                type: 'video',
                mediaMessage: candidate,
                caption: candidate.videoMessage.caption || '',
                fileName: 'media.mp4'
            };
        }
    }

    return null;
}

async function downloadMediaBuffer(message, mediaMessage, mediaType) {
    const strategies = [];

    strategies.push(async () => {
        const stream = await downloadContentFromMessage(mediaMessage, mediaType);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    });

    if (typeof downloadMediaMessage === 'function') {
        strategies.push(async () => {
            const wrappedMessage = {
                key: message?.key || mediaMessage?.key,
                message: {
                    viewOnceMessage: {
                        message: mediaMessage
                    }
                }
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

async function viewonceCommand(sock, chatId, message) {
    const mediaInfo = resolveQuotedMedia(message);

    if (!mediaInfo) {
        await sock.sendMessage(chatId, { text: '❌ Tafadhali jibu picha au video ya view-once.' }, { quoted: message });
        return;
    }

    try {
        const buffer = await downloadMediaBuffer(message, mediaInfo.mediaMessage, mediaInfo.type);

        await sock.sendMessage(chatId, {
            [mediaInfo.type]: buffer,
            fileName: mediaInfo.fileName,
            caption: mediaInfo.caption || ''
        }, { quoted: message });
    } catch (err) {
        console.error('ViewOnce download failed:', err);
        await sock.sendMessage(chatId, {
            text: '❌ Media hii siwezi kupatikana kwa sasa. Jaribu tena baada ya muda mfupi.'
        }, { quoted: message });
    }
}

module.exports = viewonceCommand;
