const { createPanel } = require('./buy');

module.exports = {
    name: 'unli',
    aliases: ['unlimited'],
    category: 'panel',
    permissions: { premium: true },
    code: async (ctx) => {
        try {
            await createPanel(ctx, { memo: 0, cpu: 0, disk: 0 });
        } catch (error) {
            if (ctx.reply) {
                await ctx.reply(`❌ Error: ${error.message || error}`);
            }
        }
    }
};
