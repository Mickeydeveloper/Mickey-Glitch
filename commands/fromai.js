/**
 * fromai.js - From AI Command using MessageBuilder
 * Creator: Ghost King
 * Description: Sends message with AI badge and a V2 suggest button safely
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
        const chatId = ctx._msg?.key?.remoteJid || ctx.chatId;

        try {
            const builder = new AIRich(ctx.core)
                .setTitle('AI Assistant')
                .setFooter(botName);

            // 1. Kadi kuu ya ujumbe (Salama kwa Group na Private)
            builder.addPost({
                title: 'AI Assistant',
                subtitle: botName,
                username: 'Meta AI',
                post_caption: text,
                source_app: 'WHATSAPP',
                post_type: 'TEXT', 
            });

            // 2. Kuongeza button ya haraka (Suggested Pill) chini ya kadi
            // Mtumiaji akibofya hii, itatuma amri ya ".menu" au maandishi uliyoweka
            builder.addSuggest(['📜 Angalia Menu'], { scroll: true });

            // 3. Kutuma ujumbe
            await builder.send(chatId, {
                quoted: ctx._msg,
                forwarded: false,
            });
            
            console.log('[fromai] message sent via AIRich with Suggest Button');
        } catch (error) {
            console.error('[fromai] Error:', error);
            try {
                await ctx.reply(`✨ *[AI Assistant]*\n\n${text}\n\n_${botName}_`);
            } catch (fallbackError) {
                if (ctx.tools?.cmd?.handleError) {
                    await ctx.tools.cmd.handleError(ctx, error, true);
                }
            }
        }
    },
};
