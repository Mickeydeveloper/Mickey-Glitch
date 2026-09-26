const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const COMMANDS = ['gpstatus', 'groupstatus', 'gstatus', 'togroupstatus', 'statusgroup', 'togcstatus'];

function cleanCommandText(text) {
    if (!text) return '';
    let value = String(text).trim();
    const commandRegex = new RegExp(`^[.!/#]?(${COMMANDS.join('|')})(?:\\s+|$)`, 'i');
    return value.replace(commandRegex, '').trim();
}

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
        ''
    ).trim();
}

function getMediaType(ctx) {
    const current = ctx?.msg?.message || {};
    const quoted = ctx?.quoted?.message || ctx?.quoted || {};
    if (current.imageMessage || quoted.imageMessage) return 'image';
    if (current.videoMessage || quoted.videoMessage) return 'video';
    if (current.audioMessage || quoted.audioMessage) return 'audio';
    if (current.documentMessage || quoted.documentMessage) return 'document';
    if (current.stickerMessage || quoted.stickerMessage) return 'sticker';
    return null;
}

function getMediaMessage(ctx, type) {
    if (!type) return null;
    const key = `${type}Message`;
    if (ctx?.msg?.message?.[key]) return ctx.msg.message[key];
    if (ctx?.quoted?.message?.[key]) return ctx.quoted.message[key];
    if (ctx?.quoted?.[key]) return ctx.quoted[key];
    return null;
}

async function downloadMediaToFile(ctx, type, tmpDir) {
    const mediaMessage = getMediaMessage(ctx, type);
    if (!mediaMessage) return null;

    const stream = await downloadContentFromMessage(mediaMessage, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (!buffer || buffer.length === 0) return null;

    const ext = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : type === 'sticker' ? 'webp' : 'bin';
    const filePath = path.join(tmpDir, `gcstatus-${Date.now()}.${ext}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

module.exports = {
    name: 'gpstatus',
    aliases: ['groupstatus', 'gstatus', 'togroupstatus', 'statusgroup', 'togcstatus'],
    category: 'group',
    permissions: { group: true },
    description: 'Post text, image or video as WhatsApp Group Status',

    code: async (ctx) => {
        const tmpDir = path.join(__dirname, '..', 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        let filePath = null;

        try {
            const chatId = ctx?.chatId || ctx?.msg?.key?.remoteJid || '';
            if (!chatId || !chatId.endsWith('@g.us')) {
                return ctx.reply('❌ This command can only be used inside a group.');
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
                if (mediaType === 'video') {
                    const mediaMsg = getMediaMessage(ctx, 'video');
                    if (Number(mediaMsg?.seconds || 0) > 30) {
                        return ctx.reply('⚠️ Video must be 30 seconds or shorter.');
                    }
                }
                filePath = await downloadMediaToFile(ctx, mediaType, tmpDir);
                if (!filePath) {
                    return ctx.reply('❌ Failed to download media. Try replying again.');
                }
            }

            if (!input && !filePath) {
                return ctx.reply(
                    '📤 *GROUP STATUS*\n\n' +
                    'Send text:\n' +
                    '.gpstatus Hello group\n\n' +
                    'Or reply to an *image/video* then use:\n' +
                    '.gpstatus'
                );
            }

            // Build content using the exact Baileys format
            let content;

            if (filePath && mediaType) {
                content = {
                    [mediaType]: { url: filePath },
                    caption: input || '',
                    groupStatus: true
                };
                // Add mimetype for video/audio/document
                const mediaMsg = getMediaMessage(ctx, mediaType);
                if (mediaMsg?.mimetype) {
                    content.mimetype = mediaMsg.mimetype;
                }
                if (mediaType === 'video' && mediaMsg?.seconds) {
                    content.seconds = mediaMsg.seconds;
                }
            } else {
                content = {
                    text: input,
                    groupStatus: true
                };
            }

            // ✅ This is the correct Baileys way to send Group Status
            await ctx.sock.sendMessage(chatId, content);

            return ctx.reply('✅ Posted to group status!');

        } catch (error) {
            console.error('[GPSTATUS ERROR]', error);
            if (ctx?.helper && typeof ctx.helper.handleError === 'function') {
                return ctx.helper.handleError(ctx, error, false);
            }
            return ctx.reply('❌ Failed to set Group Status: ' + error.message);
        } finally {
            if (filePath && fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {}
            }
        }
    }
};