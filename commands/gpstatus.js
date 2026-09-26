/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: groupstatus / gpstatus
 * @description: Posts text or media to WhatsApp Group Status
 */

const gpstatusCommand = async (ctx, chatId, m, args) => {
    try {
        // Handle parameters if ctx is context or socket directly
        const sock = ctx.sock || ctx.client || ctx;
        const msg = ctx.m || ctx.msg || m || ctx;
        const targetChat = chatId || ctx.from || ctx.chatId || msg.key?.remoteJid;

        // Prefix and Command safe fallback
        const prefix = ctx.used?.prefix || ctx.prefix || ".";
        const command = ctx.used?.command || ctx.command || "gpstatus";

        const input = ctx.text || (args ? args.join(' ') : '') || ctx.quoted?.body || "";
        const quoted = ctx.quoted;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // NO INPUT - Show Usage
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (!input && !quoted) {
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

        let content;
        const isMedia = typeof ctx.isMedia === 'function' ? ctx.isMedia.bind(ctx) : () => false;
        const type = isMedia(["image", "video"]);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // IMAGE OR VIDEO
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (["image", "video"].includes(type)) {
            if (type === "video") {
                const videoMsg = msg.message?.videoMessage || quoted?.message?.videoMessage;
                if (videoMsg?.seconds > 30) {
                    const warnText = "⚠️ Video must be 30 seconds or shorter.";
                    if (typeof ctx.reply === 'function') return await ctx.reply(warnText);
                    return await sock.sendMessage(targetChat, { text: warnText }, { quoted: msg });
                }
            }

            const buffer = await msg.media?.download() || await quoted?.media?.download();
            content = {
                [type]: buffer,
                caption: input
            };

            if (type === "video") {
                const videoMsg = msg.message?.videoMessage || quoted?.message?.videoMessage;
                if (videoMsg?.seconds) {
                    content.seconds = videoMsg.seconds;
                }
            }
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // AUDIO
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        else if (isMedia(["audio"])) {
            const buffer = await msg.media?.download() || await quoted?.media?.download();
            content = {
                audio: buffer,
                mimetype: msg.message?.audioMessage?.mimetype || quoted?.message?.audioMessage?.mimetype || "audio/mpeg"
            };
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // DOCUMENT
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        else if (isMedia(["document"])) {
            const buffer = await msg.media?.download() || await quoted?.media?.download();
            content = {
                document: buffer,
                mimetype: msg.message?.documentMessage?.mimetype || quoted?.message?.documentMessage?.mimetype,
                fileName: msg.message?.documentMessage?.fileName || quoted?.message?.documentMessage?.fileName || "file"
            };
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STICKER
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        else if (isMedia(["sticker"])) {
            const buffer = await msg.media?.download() || await quoted?.media?.download();
            content = {
                sticker: buffer
            };
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // TEXT ONLY
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        else {
            content = {
                text: input
            };
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

        // React with success emoji
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

// ==============================================
// 📤 EXPORTS (MUUNDO WA COMMANDS ZINGINE)
// ==============================================
module.exports = gpstatusCommand;
module.exports.name = "groupstatus";
module.exports.aliases = ["gcsw", "swgc", "upgcsw", "upswgc", "togroupstatus", "statusgroup", "togcstatus", "gpstatus"];
module.exports.category = "GROUP";
module.exports.description = "Posts text or media to WhatsApp Group Status.";
