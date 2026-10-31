const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const path = require('path');

// Import Catbox uploader (ES module) - lazy load ndani ya function
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
        // Prefer current message media, else quoted media
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

        const sizeInfo = res.file?.fileSizeFormatted ? `\nSize: ${res.file.fileSizeFormatted}` : '';
        const timeInfo = res.elapsedFormatted ? `\nUpload time: ${res.elapsedFormatted}` : '';

        await sock.sendMessage(chatId, {
            text: `URL: ${res.url}${sizeInfo}${timeInfo}`
        }, { quoted: message });
    } catch (error) {
        console.error('[URL] error:', error?.message || error);
        await sock.sendMessage(chatId, { text: 'Failed to convert media to URL.' }, { quoted: message });
    }
}

module.exports = urlCommand;