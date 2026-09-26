/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: uploadstatus / upsw
 * @description: Uploads text or media directly to Bot's WhatsApp Story / Status
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const uploadstatusCommand = async (ctx, chatId, m, args) => {
    try {
        const sock = ctx.sock || ctx.client || ctx;
        const msg = ctx.m || ctx.msg || m || ctx;
        const targetChat = chatId || ctx.from || ctx.chatId || msg.key?.remoteJid;

        const prefix = ctx.used?.prefix || ctx.prefix || ".";
        const command = ctx.used?.command || ctx.command || "upsw";

        // Maandishi kutoka kwa user
        const input = ctx.text || (args ? args.join(' ') : '') || '';

        // Angalia kama kuna quoted message au current message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const currentMsg = msg.message;

        // Tambua ujumbe wenye media
        const mediaMsg = currentMsg?.imageMessage || currentMsg?.videoMessage || currentMsg?.audioMessage || currentMsg?.stickerMessage || currentMsg?.documentMessage 
            ? currentMsg 
            : (quotedMsg ? quotedMsg : null);

        // Tambua aina ya media
        let mediaType = null;
        if (mediaMsg?.imageMessage) mediaType = 'image';
        else if (mediaMsg?.videoMessage) mediaType = 'video';
        else if (mediaMsg?.audioMessage) mediaType = 'audio';
        else if (mediaMsg?.stickerMessage) mediaType = 'sticker';
        else if (mediaMsg?.documentMessage) mediaType = 'document';

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // IKIWA HAKUNA TEXT WALA MEDIA
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (!input && !mediaType) {
            const usageText = 
                `📢 *Upload Bot Status*\n\n` +
                `📌 *Matumizi:*\n` +
                `• ${prefix}${command} <maandishi>\n` +
                `• Reply picha/video/audio ukiandika ${prefix}${command} <caption (sio lazima)>\n` +
                `• Au reply tu ${prefix}${command} kupost media uliyotag\n\n` +
                `📝 *Mifano:*\n` +
                `${prefix}${command} Habari za leo!\n` +
                `${prefix}${command} Angalia hii (reply kwenye picha)\n\n` +
                `⚠️ *Zingatia:* Video isiwe ndefu kuliko sekunde 30.`;

            if (typeof ctx.reply === 'function') {
                return await ctx.reply(usageText);
            }
            return await sock.sendMessage(targetChat, { text: usageText }, { quoted: msg });
        }

        let content = {};

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SHUGHULIKIA MEDIA
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (mediaType) {
            if (mediaType === 'video') {
                const seconds = mediaMsg.videoMessage?.seconds || 0;
                if (seconds > 30) {
                    const warnText = "⚠️ Video inatakiwa iwe ya sekunde 30 au chini yake.";
                    if (typeof ctx.reply === 'function') return await ctx.reply(warnText);
                    return await sock.sendMessage(targetChat, { text: warnText }, { quoted: msg });
                }
            }

            // Download media buffer
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
                console.error("Media Download Error:", err);
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
            // MAANDISHI PEKEE (TEXT STATUS)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            content = { text: input };
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // TUMA KWENYE BOT STATUS (status@broadcast)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const statusJid = 'status@broadcast';

        await sock.sendMessage(statusJid, content);

        if (typeof ctx.replyReact === 'function') {
            await ctx.replyReact("✅");
        }

        const successText = "✅ *Status imewekwa kikamilifu kwenye WhatsApp Story ya Bot!*";

        if (typeof ctx.reply === 'function') {
            await ctx.reply(successText);
        } else {
            await sock.sendMessage(targetChat, { text: successText }, { quoted: msg });
        }

    } catch (error) {
        console.error('[UPLOADSTATUS] Error:', error);

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
// 📤 EXPORTS
// ==============================================
module.exports = uploadstatusCommand;
module.exports.name = "uploadstatus";
module.exports.aliases = ["upsw", "swup", "botstatus", "tobotstatus", "swbot"];
module.exports.category = "OWNER";
module.exports.description = "Uploads text or media to Bot's WhatsApp Story.";
