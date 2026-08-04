const createPanel = require('../createPanel');

module.exports = {
    name: 'buy',
    aliases: ['1gb', 'buy1gb'],
    category: 'panel',
    permissions: { owner: true },
    code: async (ctx) => {
        try {
            const raw = Array.isArray(ctx.args) ? ctx.args.join(' ').trim() : String(ctx.args || '').trim();
            const sizeMatch = raw.match(/\d+gb/i);
            const plan = sizeMatch ? sizeMatch[0].toLowerCase() : '1gb';
            const userName = raw.replace(/\d+gb/i, '').trim() || ctx.senderId?.split('@')[0] || 'mickey';

            await createPanel(ctx, {
                plan,
                username: userName,
            });
        } catch (error) {
            if (ctx.tools?.cmd?.handleError) {
                await ctx.tools.cmd.handleError(ctx, error, true);
            } else {
                console.error('[BUY COMMAND ERROR]', error);
                await ctx.reply('❌ Imeshindwa kuanzisha panel.');
            }
        }
    },
};
