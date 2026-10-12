const { AIRich } = require('../lib/messageBuilder');

module.exports = {
    name: 'product',
    aliases: ['products'],
    category: 'utility',
    desc: 'Send a rich product showcase',
    code: async (ctx) => {
        const conn = ctx.core || ctx.sock;
        const chatId = ctx._msg?.key?.remoteJid || ctx.chatId;
        const message = ctx._msg || ctx.msg;

        try {
            const rich = new AIRich(conn);

            rich.addText('test product:');
            rich.addProduct([
                {
                    title: 'Txra-md',
                    brand: 'Srcrpt',
                    price: 'USD 1.500.000',
                    sale_price: 'USD 1.200.000',
                    product_url: 'https://shop.example.com/nike',
                    image_url: 'https://picsum.photos/id/10/300/300'
                },
                {
                    title: 'CEO OF TXRA-MD',
                    brand: 'Ghost King™',
                    price: 'USD 1.800.000',
                    image_url: 'https://picsum.photos/id/11/300/300'
                }
            ]);

            await rich.send(chatId, { quoted: message });
        } catch (error) {
            console.error('Product command error:', error);
            if (ctx.reply) {
                await ctx.reply('Imeshindikana kutuma product showcase. Tafadhali jaribu tena.');
            } else if (conn?.sendMessage && chatId) {
                await conn.sendMessage(chatId, {
                    text: 'Imeshindikana kutuma product showcase. Tafadhali jaribu tena.'
                }, { quoted: message });
            }
        }
    }
};