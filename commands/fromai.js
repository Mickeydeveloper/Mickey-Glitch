/**
 * fromai.js - From AI Command using MessageBuilder
 * Creator: Ghost King
 * Description: Sends message with AI badge using MessageBuilder safely
 */

const { AIRich } = require('../lib/messageBuilder');

module.exports = {
    name: 'fromai',
    aliases: [],
    category: 'example',
    permissions: {
        coin: 0,
    },
    code: async (ctx) => {
        const botName = ctx.config?.bot?.name || ctx.config?.botName || ctx.config?.botname || 'MICKEY BOT';
        const text = 'Zero Tr4sh by Ghost King';
        
        // Kupata ID ya chat na kuangalia kama ni Group au DM
        const chatId = ctx._msg?.key?.remoteJid || ctx.chatId || '';
        const isGroup = chatId.endsWith('@g.us');

        try {
            // Kama ni Group au unachat na bot yako mwenyewe (Message yourself)
            if (isGroup || chatId === ctx.core?.user?.id?.split(':')[0] + '@s.whatsapp.net') {
                const builder = new AIRich(ctx.core)
                    .setTitle('AI Assistant')
                    .setFooter(botName)
                    .addText(text);

                await builder.send(chatId, {
                    quoted: ctx._msg,
                    forwarded: false,
                });
                console.log('[fromai] message sent via AIRich (Safe Chat)');
            } else {
                // Kama ni DM ya mtu mwingine, tumia reply ya kawaida ili KUZUIA error ya "Update WhatsApp"
                await ctx.reply(`✨ *[AI Assistant]*\n\n${text}\n\n_${botName}_`);
                console.log('[fromai] message sent via Text Fallback (To prevent DM error)');
            }
        } catch (error) {
            console.error('[fromai] Error:', error && error.message ? error.message : error);
            try {
                await ctx.reply(text);
            } catch (fallbackError) {
                console.error('[fromai] Fallback failed:', fallbackError);
                if (ctx.tools?.cmd?.handleError) {
                    await ctx.tools.cmd.handleError(ctx, error, true);
                }
            }
        }
    },
};
