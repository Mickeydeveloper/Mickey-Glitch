/**
 * fromai.js - From AI Command using MessageBuilder
 * Creator: Ghost King
 * Description: Sends message with AI badge using MessageBuilder
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

        try {
            const builder = new AIRich(ctx.core)
                .setTitle('AI Assistant')
                .setFooter(botName)
                .addText(text);

            await builder.send(ctx._msg?.key?.remoteJid || ctx.chatId, {
                quoted: ctx._msg,
                forwarded: false,
                fallbackText: text,
            });

            console.log('[fromai] message sent via AIRich');
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