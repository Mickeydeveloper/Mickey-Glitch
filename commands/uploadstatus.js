const { createCtx } = require('../lib/messageBuilder');
const {
    downloadContentFromMessage,
    downloadMediaMessage,
    normalizeMessageContent
} = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

const COMMANDS = [
    'uploadstatus',
    'upload-status',
    'status',
    'sw',
    'story',
    'upswgc'
];

function getQuoted(ctx) {
    return ctx?.quoted || ctx?.msg?.msg?.contextInfo?.quotedMessage || null;
}

function getQuotedText(quoted) {
    if (!quoted) return '';
    const msg = quoted?.message || quoted;
    return String(
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption ||
        msg?.documentMessage?.caption ||
        msg?.audioMessage?.caption ||
        ''
    ).trim();
}

function cleanCommandText(text) {
    if (!text) return '';
    let value = String(text).trim();
    const commandRegex = new RegExp(
        `^[.!/#]?(${COMMANDS.join('|')})(?:\\s+|$)`,
        'i'
    );
    return value.replace(commandRegex, '').trim();
}

function getMediaType(ctx) {
    const current = normalizeMessageContent(ctx?.msg?.message) || ctx?.msg?.message || {};
    const quotedRaw = ctx?.quoted?.message || ctx?.quoted || {};
    const quoted = normalizeMessageContent(quotedRaw) || quotedRaw;

    if (current.imageMessage || quoted.imageMessage) return 'image';
    if (current.videoMessage || quoted.videoMessage) return 'video';
    return null;
}

function getMediaMessage(ctx, type) {
    if (!type) return null;
    const key = `${type}Message`;

    const currentContent = normalizeMessageContent(ctx?.msg?.message) || ctx?.msg?.message || {};
    const quotedRaw = ctx?.quoted?.message || ctx?.quoted || {};
    const quotedContent = normalizeMessageContent(quotedRaw) || quotedRaw;

    if (currentContent[key]) return currentContent[key];
    if (quotedContent[key]) return quotedContent[key];
    if (ctx?.quoted?.[key]) return ctx.quoted[key];
    return null;
}

async function downloadMedia(ctx, type) {
    let lastError = null;

    const downloadContent = async (mediaMessage) => {
        if (!mediaMessage) return null;
        const stream = await downloadContentFromMessage(mediaMessage, type);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return buffer.length > 0 ? buffer : null;
    };

    try {
        const mediaMessage = getMediaMessage(ctx, type);
        const buffer = await downloadContent(mediaMessage);
        if (buffer) return buffer;
    } catch (error) { lastError = error; }

    try {
        if (ctx?.msg?.media && typeof ctx.msg.media.download === 'function') {
            const buffer = await ctx.msg.media.download();
            if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) return buffer;
        }
    } catch (error) { lastError = error; }

    try {
        if (ctx?.quoted?.media && typeof ctx.quoted.media.download === 'function') {
            const buffer = await ctx.quoted.media.download();
            if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) return buffer;
        }
    } catch (error) { lastError = error; }

    try {
        if (ctx?.sock && typeof ctx.sock.downloadMediaMessage === 'function') {
            if (ctx?.msg?.message) {
                const buffer = await downloadMediaMessage(ctx.msg, 'buffer', {}, { logger: undefined });
                if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) return buffer;
            }
        }
    } catch (error) { lastError = error; }

    return null;
}

async function getStatusJidList(ctx) {
    try {
        const contacts = ctx?.sock?.store?.contacts || {};
        const list = Object.keys(contacts).filter(jid => jid.endsWith('@s.whatsapp.net'));
        if (list.length === 0 && ctx?.sock?.user?.id) {
            return [ctx.sock.user.id];
        }
        return list;
    } catch (e) {
        console.log('Could not fetch contacts for status list');
        return ctx?.sock?.user?.id ? [ctx.sock.user.id] : [];
    }
}

const uploadStatusCommand = {
    name: 'uploadstatus',
    aliases: ['upload-status', 'status', 'sw', 'story', 'upswgc'],
    category: 'owner',
    permissions: { owner: true },
    description: 'Post text, image or video as Bot WhatsApp Status Story',

    code: async (ctx) => {
        try {
            const senderId = ctx?.senderId || ctx?.msg?.key?.participant || '';
            const isSuperUser = isOwnerOrSudo(senderId, ctx?.sock);
            if (!isSuperUser) return ctx.reply('❌ Owner Only Command!');

            const commandText = cleanCommandText(ctx?.text || '');
            const quoted = getQuoted(ctx);
            const quotedText = getQuotedText(quoted);
            const input = commandText || quotedText || '';

            let mediaType = getMediaType(ctx);
            let buffer = null;

            if (mediaType) {
                const mediaMessage = getMediaMessage(ctx, mediaType);
                if (mediaType === 'video' && Number(mediaMessage?.seconds || 0) > 30) {
                    return ctx.reply('⚠️ Video must be 30 seconds or shorter.');
                }
                buffer = await downloadMedia(ctx, mediaType);
                if (!buffer) {
                    console.log('[UPLOADSTATUS] Media download failed');
                    return ctx.reply('❌ Failed to download media.');
                }
            }

            if (!input && !buffer) {
                return ctx.reply(
                    '📤 *BOT STATUS STORY*\n\n' +
                    'Send text:\n' +
                    '.uploadstatus Hello world\n\n' +
                    'Or reply to an *image/video* then use:\n' +
                    '.uploadstatus'
                );
            }

            const statusJidList = await getStatusJidList(ctx);

            let content;
            if (buffer && mediaType) {
                content = {
                    [mediaType]: buffer,
                    caption: input,
                    statusJidList: statusJidList,
                    backgroundColor: '#000000',
                    font: 3
                };
            } else {
                content = {
                    text: input,
                    backgroundColor: '#000000',
                    font: 3,
                    statusJidList: statusJidList
                };
            }

            // ✅ FIX: Send to 'status@broadcast'
            await ctx.sock.sendMessage('status@broadcast', content);

            return ctx.reply('✅ Bot status story sent successfully!');

        } catch (error) {
            console.error('[UPLOADSTATUS ERROR]', error);
            if (ctx?.helper && typeof ctx.helper.handleError === 'function') {
                return ctx.helper.handleError(ctx, error, false);
            }
            return ctx.reply('❌ Failed to set Bot Status Story.');
        }
    }
};

module.exports = uploadStatusCommand;