module.exports = {
    name: "groupstatus",
    aliases: ["gcsw", "swgc", "upgcsw", "upswgc", "togroupstatus", "statusgroup", "togcstatus"],
    category: "group",
    permissions: {
        admin: true,
        group: true
    },
    code: async (ctx) => {
        const input = ctx.text || ctx.quoted?.body;
        const quoted = ctx.quoted;
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // NO INPUT - Show Usage
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (!input && !quoted)
            return await ctx.reply(
                `📢 *Group Status*\n\n` +
                `📌 *Usage:*\n` +
                `• ${ctx.used.prefix}${ctx.used.command} <text>\n` +
                `• Reply to image/video/audio/document/sticker with ${ctx.used.prefix}${ctx.used.command} <caption>\n` +
                `• Or just ${ctx.used.prefix}${ctx.used.command} to forward quoted media\n\n` +
                `📝 *Examples:*\n` +
                `${ctx.used.prefix}${ctx.used.command} hello, world!\n` +
                `${ctx.used.prefix}${ctx.used.command} Check this out! (reply to image)\n\n` +
                `⚠️ *Note:* Video must be 30 seconds or shorter`
            );

        try {
            let content;
            const type = ctx.isMedia(["image", "video"]);

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // IMAGE OR VIDEO
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            if (["image", "video"].includes(type)) {
                // Check video duration
                if (type === "video") {
                    const videoMsg = ctx.msg.message?.videoMessage || quoted?.message?.videoMessage;
                    if (videoMsg?.seconds > 30) {
                        return await ctx.reply("⚠️ Video must be 30 seconds or shorter.");
                    }
                }
                
                const buffer = await ctx.msg.media.download() || await quoted.media.download();
                content = {
                    [type]: buffer,
                    caption: input
                };
                
                // Add video seconds if available
                if (type === "video") {
                    const videoMsg = ctx.msg.message?.videoMessage || quoted?.message?.videoMessage;
                    if (videoMsg?.seconds) {
                        content.seconds = videoMsg.seconds;
                    }
                }
            }
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // AUDIO
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            else if (ctx.isMedia(["audio"])) {
                const buffer = await ctx.msg.media.download() || await quoted.media.download();
                content = {
                    audio: buffer,
                    mimetype: ctx.msg.message?.audioMessage?.mimetype || quoted?.message?.audioMessage?.mimetype || "audio/mpeg"
                };
            }
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // DOCUMENT
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            else if (ctx.isMedia(["document"])) {
                const buffer = await ctx.msg.media.download() || await quoted.media.download();
                content = {
                    document: buffer,
                    mimetype: ctx.msg.message?.documentMessage?.mimetype || quoted?.message?.documentMessage?.mimetype,
                    fileName: ctx.msg.message?.documentMessage?.fileName || quoted?.message?.documentMessage?.fileName || "file"
                };
            }
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // STICKER
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            else if (ctx.isMedia(["sticker"])) {
                const buffer = await ctx.msg.media.download() || await quoted.media.download();
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
            await ctx.reply({
                ...content,
                contextInfo: {
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: ctx.sender.pushName,
                        listEmoji: "🏷️"
                    }
                },
                groupStatus: true
            });

            // React with success emoji
            await ctx.replyReact("✅");
            
            await ctx.reply(ctx.format.info("Group status sent successfully!"));

        } catch (error) {
            console.error('[GROUPSTATUS] Error:', error);
            await ctx.replyReact("❌");
            await ctx.helper.handleError(ctx, error, false);
        }
    }
};