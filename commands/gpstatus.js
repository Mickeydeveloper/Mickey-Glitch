const { createCtx } = require('../lib/messageBuilder');
const {
    downloadContentFromMessage,
    downloadMediaMessage,
    normalizeMessageContent
} = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

const COMMANDS = [
    'gpstatus',
    'groupstatus',
    'gstatus',
    'togroupstatus',
    'statusgroup',
    'togcstatus'
];

/**
 * Get quoted message safely
 */
function getQuoted(ctx) {
    return ctx?.quoted || ctx?.msg?.msg?.contextInfo?.quotedMessage || null;
}

/**
 * Get text from quoted message
 */
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

/**
 * Remove the command itself.
 */
function cleanCommandText(text) {
    if (!text) return '';
    let value = String(text).trim();
    const commandRegex = new RegExp(
        `^[.!/#]?(${COMMANDS.join('|')})(?:\\s+|$)`,
        'i'
    );
    return value.replace(commandRegex, '').trim();
}

/**
 * Detect media from current message or quoted message
 */
function getMediaType(ctx) {
    const current = normalizeMessageContent(ctx?.msg?.message) || ctx?.msg?.message || {};
    const quotedRaw = ctx?.quoted?.message || ctx?.quoted || {};
    const quoted = normalizeMessageContent(quotedRaw) || quotedRaw;

    if (current.imageMessage || quoted.imageMessage) return 'image';
    if (current.videoMessage || quoted.videoMessage) return 'video';
    return null;
}

/**
 * Get the actual media message
 */
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

/**
 * Download media
 */
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

const gpStatusCommand = {
    name: 'gpstatus',
    aliases: ['groupstatus', 'gstatus', 'togroupstatus', 'statusgroup', 'togcstatus'],
    category: 'group',
    permissions: { group: true },
    description: 'Post text, image or video as WhatsApp Group Status',

    code: async (ctx) => {
        try {
            const chatId = ctx?.chatId || ctx?.msg?.key?.remoteJid || '';
            if (!chatId || !chatId.endsWith('@g.us')) {
                return ctx.reply('❌ Command hii inaweza kutumika ndani ya group tu.');
            }

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
                if (!buffer) return ctx.reply('❌ Imeshindikana kupakua media.');
            }

            if (!input && !buffer) {
                return ctx.reply(
                    '📤 *GROUP STATUS*\n\n' +
                    'Tuma text:\n' +
                    '.gpstatus Hello group\n\n' +
                    'Au reply *image/video* kisha tumia:\n' +
                    '.gpstatus'
                );
            }

            // Tengeneza Content ya Group Status
            let content;
            if (buffer && mediaType) {
                content = {
                    [mediaType]: buffer,
                    caption: input,
                    // Hii inafanya iwe Group Status
                    contextInfo: {
                        statusAudienceMetadata: {
                            audienceType: 1,
                            listName: ctx?.sender?.pushName || 'Group Status',
                            listEmoji: '🏷️'
                        }
                    }
                };
            } else {
                content = {
                    text: input,
                    contextInfo: {
                        statusAudienceMetadata: {
                            audienceType: 1,
                            listName: ctx?.sender?.pushName || 'Group Status',
                            listEmoji: '🏷️'
                        }
                    }
                };
            }

            // Tuma Group Status
            await ctx.sock.sendMessage(chatId, content);

            return ctx.reply('✅ Group status sent successfully!');

        } catch (error) {
            console.error('[GPSTATUS ERROR]', error);
            if (ctx?.helper && typeof ctx.helper.handleError === 'function') {
                return ctx.helper.handleError(ctx, error, false);
            }
            return ctx.reply('❌ Imeshindikana kuweka Group Status.');
        }
    }
};

module.exports = gpStatusCommand;