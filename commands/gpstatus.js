/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: groupstatus
 * @description: Posts text or media to WhatsApp Group Status
 */

module.exports = {
    name: "groupstatus",
    aliases: ["gcsw", "swgc", "upgcsw", "upswgc", "togroupstatus", "statusgroup", "togcstatus"],
    category: "group",
    permissions: {
        admin: true,
        group: true
    },
    code: async (ctx) => {
        try {
            // Safe handling ya prefix na command name kuzuia error ya undefined
            const prefix = ctx.used?.prefix || ctx.prefix || ".";
            const command = ctx.used?.command || ctx.command || "groupstatus";

            const input = ctx.text || ctx.quoted?.body || "";
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
                const sock = ctx.sock || ctx.client || ctx;
                const msg = ctx.m || ctx.msg || ctx;
                const targetChat = ctx.from || ctx.chatId || msg.key?.remoteJid;
                return await sock.sendMessage(targetChat, { text: usageText }, { quoted: msg });
            }

            let content;
            const isMedia = typeof ctx.isMedia === 'function' ? ctx.isMedia.bind(ctx) : () => false;
            const type = isMedia(["image", "video"]);

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // IMAGE OR VIDEO
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            if (["image", "video"].includes(type)) {
                // Check video duration
                if (type === "video") {
                    const videoMsg = ctx.msg?.message?.videoMessage || quoted?.message?.videoMessage;
                    if (videoMsg?.seconds > 30) {
                        return await ctx.reply("⚠️ Video must be 30 seconds or shorter.");
                    }
                }
                
                const buffer = await ctx.msg?.media?.download() || await quoted?.media?.download();
                content = {
                    [type]: buffer,
                    caption: input
                };
                
                // Add video seconds if available
                if (type === "video") {
                    const videoMsg = ctx.msg?.message?.videoMessage || quoted?.message?.videoMessage;
                    if (videoMsg?.seconds) {
                        content.seconds = videoMsg.seconds;
                    }
                }
            }
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // AUDIO
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            else if (isMedia(["audio"])) {
                const buffer = await ctx.msg?.media?.download() || await quoted?.media?.download();
                content = {
                    audio: buffer,
                    mimetype: ctx.msg?.message?.audioMessage?.mimetype || quoted?.message?.audioMessage?.mimetype || "audio/mpeg"
                };
            }
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // DOCUMENT
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            else if (isMedia(["document"])) {
                const buffer = await ctx.msg?.media?.download() || await quoted?.media?.download();
                content = {
                    document: buffer,
                    mimetype: ctx.msg?.message?.documentMessage?.mimetype || quoted?.message?.documentMessage?.mimetype,
                    fileName: ctx.msg?.message?.documentMessage?.fileName || quoted?.message?.documentMessage?.fileName || "file"
                };
            }
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STICKER
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            else if (isMedia(["sticker"])) {
                const buffer = await ctx.msg?.media?.download() || await quoted?.media?.download();
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
            const pushName = ctx.sender?.pushName || ctx.pushName || "User";

            await ctx.reply({
                ...content,
                contextInfo: {
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: pushName,
                        listEmoji: "🏷️"
                    }
                },
                groupStatus: true
            });

            // React with success emoji
            if (typeof ctx.replyReact === 'function') {
                await ctx.replyReact("✅");
            }
            
            const infoMsg = ctx.format?.info 
                ? ctx.format.info("Group status sent successfully!") 
                : "✅ *Group status sent successfully!*";

            await ctx.reply(infoMsg);

        } catch (error) {
            console.error('[GROUPSTATUS] Error:', error);

            if (typeof ctx.replyReact === 'function') {
                await ctx.replyReact("❌");
            }

            if (ctx.helper?.handleError) {
                await ctx.helper.handleError(ctx, error, false);
            } else {
                await ctx.reply(`❌ *Glitched Error:* ${error.message}`);
            }
        }
    }
};
