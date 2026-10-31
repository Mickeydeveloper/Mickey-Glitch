const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const path = require('path');

// Lazy import ya Catbox uploader (ES module)
let uploadFileCache = null;
async function getUploadFile() {
    if (!uploadFileCache) {
        const mod = await import('../lib/catboxUploader.js'); // badilisha path kama inahitajika
        uploadFileCache = mod.uploadFile;
    }
    return uploadFileCache;
}

async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg' };
    }
    if (m.videoMessage) {
        const stream = await downloadContentFromMessage(m.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4' };
    }
    if (m.audioMessage) {
        const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3' };
    }
    if (m.documentMessage) {
        const stream = await downloadContentFromMessage(m.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = m.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext };
    }
    if (m.stickerMessage) {
        const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.webp' };
    }
    return null;
}

async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

async function urlCommand(sock, chatId, message) {
    try {
        let media = await getMediaBufferAndExt(message);
        if (!media) media = await getQuotedMediaBufferAndExt(message);

        if (!media) {
            await sock.sendMessage(chatId, {
                text: 'Send or reply to a media (image, video, audio, sticker, document) to get a URL.'
            }, { quoted: message });
            return;
        }

        const uploadFile = await getUploadFile();
        const fileName = `${Date.now()}${media.ext}`;

        const res = await uploadFile(media.buffer, fileName);

        if (!res || !res.success || !res.url) {
            const reason = res?.mess ? ` (${res.mess})` : '';
            await sock.sendMessage(chatId, {
                text: `Failed to upload media${reason}.`
            }, { quoted: message });
            return;
        }

        const url = res.url;
        const sizeInfo = res.file?.fileSizeFormatted ? `\n📦 Size: ${res.file.fileSizeFormatted}` : '';
        const timeInfo = res.elapsedFormatted ? `\n⚡ Upload: ${res.elapsedFormatted}` : '';

        // CTA Button - Copy Link (native flow)
        const caption =
            `✅ *Upload Successful*\n\n` +
            `🔗 ${url}${sizeInfo}${timeInfo}\n\n` +
            `_Bonyeza button hapa chini kunakili link_`;

        await sock.sendMessage(chatId, {
            text: caption,
            footer: 'Catbox Uploader',
            buttons: [
                {
                    buttonId: 'copy_url',
                    buttonText: { displayText: '📋 Copy Link' },
                    type: 1,
                },
                {
                    buttonId: 'open_url',
                    buttonText: { displayText: '🌐 Open Link' },
                    type: 1,
                },
            ],
            headerType: 1,
            viewOnce: true,
        }, { quoted: message });

        // Pia tuma native flow button (copy) kwa support zaidi
        await sock.sendMessage(chatId, {
            text: `🔗 *Link yako iko tayari!*`,
            footer: 'Bonyeza kunakili',
            templateButtons: [
                {
                    index: 1,
                    urlButton: {
                        displayText: '🌐 Open in Browser',
                        url: url,
                    },
                },
                {
                    index: 2,
                    callButton: {
                        displayText: '📋 Copy URL',
                        phoneNumber: url, // trick: inaonekana kama call button, lakini URL ni text
                    },
                },
            ],
        }, { quoted: message });

    } catch (error) {
        console.error('[URL] error:', error?.message || error);
        await sock.sendMessage(chatId, { text: 'Failed to convert media to URL.' }, { quoted: message });
    }
}

module.exports = urlCommand;