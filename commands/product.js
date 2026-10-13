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

            rich.addText(' _My product_');
            rich.addProduct([
                {
                    title: 'Mickey G;itch',
                    brand: 'Srcrpt',
                    price: 'TZ 45,000',
                    sale_price: 'TZ 50,000',
                    product_url: 'https://mickey-pterodacty.vercel.app/',
                    image_url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png'
                },
                {
                    title: 'PREMIUM G;ITCH',
                    brand: 'Premium',
                    price: '10,000',
                    image_url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
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