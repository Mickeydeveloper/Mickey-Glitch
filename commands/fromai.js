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
        const chatId = ctx._msg?.key?.remoteJid || ctx.chatId;

        try {
            // Tunatumia AIRich lakini kwa mfumo wa .addPost uliorahisishwa
            // Mfumo huu hauli error kwenye WhatsApp mpya
            const builder = new AIRich(ctx.core)
                .setTitle('AI Assistant')
                .setFooter(botName);

            builder.addPost({
                title: 'AI Assistant',
                subtitle: botName,
                username: 'Meta AI',
                post_caption: text,
                source_app: 'WHATSAPP',
                post_type: 'TEXT', // Kutumia TEXT badala ya IMAGE inasaidia kupita kwenye ulinzi
            });

            await builder.send(chatId, {
                quoted: ctx._msg,
                forwarded: false,
            });
            
            console.log('[fromai] message sent via AIRich Post Layout');
        } catch (error) {
            console.error('[fromai] Error:', error);
            // Ikitokea dharura yoyote, bot inajibu kwa maandishi ya kawaida
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
