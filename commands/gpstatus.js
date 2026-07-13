const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: "groupstatus",
    aliases: ["gpstatus", "gcsw", "swgc", "upgcsw"],
    category: "group",
    permissions: {
        admin: true, // Lazima awe admin wa group
        group: true  // Inafanya kazi kwenye group pekee
    },
    code: async (ctx) => {
        const sock = ctx.sock; // Pata WhatsApp socket kutoka kwenye context
        const chatId = ctx.id || ctx.msg.key.remoteJid;

        // 1. Kamata maandishi (args/caption) na Quoted Message
        const args = ctx.args || [];
        const contextInfo = ctx.msg.message?.extendedTextMessage?.contextInfo;
        const input = ctx.text || ctx.quoted?.body;

        // Angalia kama kuna help ya haraka
        if (args[0] === 'help' || args[0] === '--help') {
            const helpText = `📢 *GPSTATUS COMMAND HELP*\n\n` +
                             `*Usage:* Reply to media na:\n` +
                             `• \`${ctx.used}\` - Post kwenye Official WA Status\n` +
                             `• \`${ctx.used} viewonce\` - Tuma kama view once status`;
            return await ctx.reply(helpText);
        }

        // 2. Angalia kama amereply media (image/video)
        if (!contextInfo || !contextInfo.quotedMessage) {
            return await ctx.reply(
                `📸 *Matumizi:* Reply picha/video ukizindikiza na command \`${ctx.used}\` ili kupost kwenye WhatsApp Stories.\n\n` +
                `📌 *Options:*\n` +
                `• \`${ctx.used} viewonce\` - Post kama view once Story\n` +
                `• \`${ctx.used} help\` - Maelezo zaidi`
            );
        }

        const quotedMessage = contextInfo.quotedMessage;
        const mediaMessage = quotedMessage.imageMessage || quotedMessage.videoMessage;

        if (!mediaMessage) {
            return await ctx.reply("❌ Tafadhali reply ujumbe wa picha au video pekee.");
        }

        const mediaType = quotedMessage.imageMessage ? 'image' : 'video';
        const isViewOnce = args.some(arg => arg.toLowerCase() === 'viewonce');

        try {
            // 3. Download Media
            await ctx.reply("⏳ *Inaprocess...* Inadownload media kutoka kwenye chat.");
            
            const mediaBuffer = await downloadMediaMessage(
                { 
                    key: { 
                        remoteJid: chatId, 
                        id: contextInfo.stanzaId, 
                        participant: contextInfo.participant 
                    }, 
                    message: quotedMessage 
                },
                'buffer',
                {},
                { logger: console }
            );

            if (!mediaBuffer) throw new Error("Mchakato wa kudownload media umefeli.");

            const caption = input || mediaMessage.caption || '';

            // --- Tuma Kwenye Official WhatsApp Status ---
            const statusPayload = mediaType === 'image'
                ? { image: mediaBuffer, caption: caption || '📸 Status', viewOnce: isViewOnce }
                : { video: mediaBuffer, caption: caption || '🎥 Status', gifPlayback: false, seconds: 30 };
            
            await sock.sendMessage('status@broadcast', statusPayload);

            // 4. Mrejesho wa Mwisho (Final Response)
            await ctx.reply("✅ *Official WA Stories:* Status imetumwa kikamilifu!");

        } catch (error) {
            // Tumia error handler ya bot ya kwanza kama ipo, la sivyo reply kawaida
            if (tools?.cmd?.handleError) {
                await tools.cmd.handleError(ctx, error, false);
            } else {
                await ctx.reply(`❌ *Error:* ${error.message}`);
            }
        }
    }
};
