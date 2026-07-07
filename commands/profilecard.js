const { Button, AIRich, createCtx } = require('../lib/messageBuilder');

module.exports = {
    name: 'profilecard',
    aliases: ['profile'],
    category: 'utility',
    code: async (ctx) => {
        try {
            const input = Array.isArray(ctx.args) ? ctx.args.join(' ').trim() : (ctx.args || '').toString().trim();
            const [
                title = 'ᗰ𝒾匚кⓔ𝕐',
                subtitle = 'View details',
                profileUrl = 'https://telegra.ph/file/6f714e30054a1dbd65fb4.png',
                caption = 'Hi! This is Mickey Glitch.'
            ] = input.split('|').map((part) => part.trim()).filter(Boolean);

            const config = ctx.config || {};
            const botName = config.bot?.name || config.botName || config.botname || 'MICKEY BOT';

            await new Button(ctx.core)
                .setTitle(botName)
                .setBody(`${title}\n${subtitle}\n\n${caption}`)
                .addButton('inapp_signup', {
                    signup_id: '1885845738738391',
                    subscription_timestamp: String(Math.floor(Date.now() / 1000)),
                    promo_code: 'PROMO123'
                })
                .send(ctx._msg?.key?.remoteJid || ctx.chatId, { quoted: ctx._msg });

           
            const fallbackText = [
                `📱 ${title}`,
                subtitle,
                '',
                caption,
                '',
                `🖼️ ${profileUrl}`,
            ].filter(Boolean).join('\n');

            await richBuilder.send(ctx._msg?.key?.remoteJid || ctx.chatId, {
                quoted: ctx._msg,
                forwarded: false,
                fallbackText,
            });
        } catch (error) {
            console.error('Profile card error:', error);
            await ctx.reply('❌ WhatsApp could not render this profile card. Please try again with a different image URL.');
        }
    },
};