/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: groupstatus / gpstatus
 * @description: Posts text or media to WhatsApp Group Status
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const gpstatusCommand = async (ctx, chatId, m, args) => {
    try {
        const sock = ctx.sock || ctx.client || ctx;
        const msg = ctx.m || ctx.msg || m || ctx;
        const targetChat = chatId || ctx.from || ctx.chatId || msg.key?.remoteJid;

        const prefix = ctx.used?.prefix || ctx.prefix || ".";
        const command = ctx.used?.command || ctx.command || "gpstatus";

        // Extract input text
        const input = ctx.text || (args ? args.join(' ') : '') || '';

        // Extract quoted message or current message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const currentMsg = msg.message;

        // Determine media message object
        const mediaMsg = currentMsg?.imageMessage || currentMsg?.videoMessage || currentMsg?.audioMessage || currentMsg?.stickerMessage || currentMsg?.documentMessage 
            ? currentMsg 
            : (quotedMsg ? quotedMsg : null);

        // Determine media type
        let mediaType = null;
        if (mediaMsg?.imageMessage) mediaType = 'image';
        else if (mediaMsg?.videoMessage) mediaType = 'video';
        else if (mediaMsg?.audioMessage) mediaType = 'audio';
        else if (mediaMsg?.stickerMessage) mediaType = 'sticker';
        else if (mediaMsg?.documentMessage) mediaType = 'document';

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // NO INPUT & NO MEDIA - Show Usage
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (!input && !mediaType) {
            const usageText = 
                `📢 *Group Status*\n\n` +
                `📌 *Usage:*\n` +
                `• ${prefix}${command} <text>\n` +
                `• Reply to image/video/audio/document/sticker with ${prefix}${command} <caption>\n` +
                `• Or just ${prefix}${command} to forward quoted media\n\n` +
                `📝 *Examples:*\n` +
                `${prefix}${command} hello, world!\n` +
                `${prefix}${command} Check this out! (reply to image)\n\n` +
                `⚠️ *Note:* Video must be 30 seconds or shorter`;

            if (typeof ctx.reply === 'function') {
                return await ctx.reply(usageText);
            }
            return await sock.sendMessage(targetChat, { text: usageText }, { quoted: msg });
        }

        let content = {};

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // HANDLE MEDIA
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (mediaType) {
            // Check video length limit
            if (mediaType === 'video') {
                const seconds = mediaMsg.videoMessage?.seconds || 0;
                if (seconds > 30) {
                    const warnText = "⚠️ Video must be 30 seconds or shorter.";
                    if (typeof ctx.reply === 'function') return await ctx.reply(warnText);
                    return await sock.sendMessage(targetChat, { text: warnText }, { quoted: msg });
                }
            }

            // Download media buffer correctly from Baileys
            let buffer;
            try {
                if (typeof ctx.downloadMediaBuffer === 'function') {
                    buffer = await ctx.downloadMediaBuffer();
                } else if (msg.media?.download) {
                    buffer = await msg.media.download();
                } else if (ctx.quoted?.media?.download) {
                    buffer = await ctx.quoted.media.download();
                } else {
                    const messageToDownload = quotedMsg 
                        ? { message: quotedMsg, key: { remoteJid: targetChat } } 
                        : msg;
                    buffer = await downloadMediaMessage(messageToDownload, 'buffer', {});
                }
            } catch (err) {
                console.error("Download media error:", err);
            }

            if (!buffer) {
                throw new Error("Imeshindikana kupakua media uliyochagua!");
            }

            if (mediaType === 'image') {
                content = { image: buffer, caption: input };
            } else if (mediaType === 'video') {
                content = { 
                    video: buffer, 
                    caption: input, 
                    seconds: mediaMsg.videoMessage?.seconds 
                };
            } else if (mediaType === 'audio') {
                content = { 
                    audio: buffer, 
                    mimetype: mediaMsg.audioMessage?.mimetype || 'audio/mpeg',
                    ptt: mediaMsg.audioMessage?.ptt || false
                };
            } else if (mediaType === 'sticker') {
                content = { sticker: buffer };
            } else if (mediaType === 'document') {
                content = { 
                    document: buffer, 
                    mimetype: mediaMsg.documentMessage?.mimetype,
                    fileName: mediaMsg.documentMessage?.fileName || 'file'
                };
            }
        } else {
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // TEXT ONLY
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            content = { text: input };
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SEND TO GROUP STATUS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const pushName = ctx.sender?.pushName || msg.pushName || "User";

        const statusPayload = {
            ...content,
            contextInfo: {
                statusAudienceMetadata: {
                    audienceType: 1,
                    listName: pushName,
                    listEmoji: "🏷️"
                }
            },
            groupStatus: true
        };

        if (typeof ctx.reply === 'function') {
            await ctx.reply(statusPayload);
        } else {
            await sock.sendMessage(targetChat, statusPayload, { quoted: msg });
        }

        if (typeof ctx.replyReact === 'function') {
            await ctx.replyReact("✅");
        }

        const successText = ctx.format?.info 
            ? ctx.format.info("Group status sent successfully!") 
            : "✅ *Group status sent successfully!*";

        if (typeof ctx.reply === 'function') {
            await ctx.reply(successText);
        } else {
            await sock.sendMessage(targetChat, { text: successText }, { quoted: msg });
        }

    } catch (error) {
        console.error('[GROUPSTATUS] Error:', error);

        if (typeof ctx.replyReact === 'function') {
            await ctx.replyReact("❌");
        }

        const errorText = `❌ *Glitched Error:* ${error.message}`;
        if (typeof ctx.reply === 'function') {
            await ctx.reply(errorText);
        } else {
            const sock = ctx.sock || ctx.client || ctx;
            const targetChat = chatId || ctx.from || ctx.chatId;
            if (sock) await sock.sendMessage(targetChat, { text: errorText }, { quoted: m });
        }
    }
};

module.exports = gpstatusCommand;
module.exports.name = "groupstatus";
module.exports.aliases = ["gcsw", "swgc", "upgcsw", "upswgc", "togroupstatus", "statusgroup", "togcstatus", "gpstatus"];
module.exports.category = "GROUP";
module.exports.description = "Posts text or media to WhatsApp Group Status.";
