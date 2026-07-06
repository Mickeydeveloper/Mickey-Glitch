module.exports = {
    name: "fromai",
    aliases: [],
    category: "example",
    permissions: {
        coin: 0
    },
    code: async (ctx) => {
        try {
            await ctx.reply('Zero Tr4sh by Ghost King');
        } catch (error) {
            await tools.cmd.handleError(ctx, error, true);
        }
    }
};
