/**
 * fromai.js - From AI Command using MessageBuilder
 * Creator: Ghost King
 * Description: Sends message with AI badge using MessageBuilder
 */

const { Button, AIRich } = require('../lib/messageBuilder');

module.exports = {
    name: "fromai",
    aliases: [],
    category: "example",
    permissions: {
        coin: 0
    },
    code: async (ctx) => {
        try {
            const aiMessage = new AIRich(ctx.core)
                .setTitle('AI Assistant')
                .setBody('Zero Tr4sh by Ghost King')
                .setFooter(ctx.config?.bot?.name || 'MICKEY BOT');

            await aiMessage.send(ctx._msg?.key?.remoteJid || ctx.chatId, {
                quoted: ctx._msg,
                forwarded: false,
                isFromAI: true
            });

            console.log('[fromai] AI Rich Response sent successfully');

        } catch (error) {
            console.error('[fromai] Error:', error && error.message ? error.message : error);
            
            // Fallback to simple reply
            try {
                await ctx.reply('Zero Tr4sh by Ghost King');
            } catch (fallbackError) {
                console.error('[fromai] Fallback failed:', fallbackError);
                if (ctx.tools?.cmd?.handleError) {
                    await ctx.tools.cmd.handleError(ctx, error, true);
                }
            }
        }
    }
};