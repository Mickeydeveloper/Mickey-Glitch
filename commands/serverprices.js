const { Button } = require('../lib/messageBuilder');
const config = require('../config');

module.exports = {
    name: 'serverprices',
    aliases: ['sprice', 'prices', 'serverlist'],
    category: 'panel',
    permissions: { coin: 0 },
    code: async (ctx) => {
        try {
            const ownerNumber = config?.owner?.id || '255636756591';
            const groupLink = config?.bot?.groupLink || 'https://chat.whatsapp.com/JgHII0iCl42JD2mGoJSwji';
            const footer = config?.msg?.footer || `© ${config?.bot?.name || 'BIGST4CK'}`;

            const plans = [];
            const prices = [1500, 2500, 3500, 5000, 6500, 8000, 9500, 11000, 13000];
            const cpus = [50, 100, 150, 200, 250, 300, 350, 400, 450];
            const disks = [5, 10, 15, 20, 25, 30, 35, 40, 45];

            for (let i = 1; i <= 9; i++) {
                plans.push({
                    name: `${i} GB`,
                    ram: `${i} GB`,
                    cpu: `${cpus[i - 1]}%`,
                    disk: `${disks[i - 1]} GB`,
                    price: `${prices[i - 1].toLocaleString()} TZS`
                });
            }

            plans.push({
                name: 'Unlimited',
                ram: '∞',
                cpu: '∞',
                disk: '∞',
                price: '25,000 TZS'
            });

            let fullDetails = `» *SERVER PLANS (Monthly)*\n\n`;
            plans.forEach((p, i) => {
                fullDetails += `${i + 1}. › *${p.name}*\n`;
                fullDetails += `   › RAM: ${p.ram}\n`;
                fullDetails += `   › CPU: ${p.cpu}\n`;
                fullDetails += `   › Disk: ${p.disk}\n`;
                fullDetails += `   › Price: ${p.price}\n\n`;
            });
            fullDetails += `» *CONTACT US*\n`;
            fullDetails += `› Telegram: t.me/bigmanj09\n`;
            fullDetails += `› WhatsApp: wa.me/255636756591\n`;
            fullDetails += `› Email: bigmanj.tech@gmail.com\n\n`;
            fullDetails += `_Contact us to order or for custom quotes._`;

            const outerBody =
                `» *Server Hosting Plans*\n\n` +
                `› 1 GB to Unlimited plans available\n` +
                `› Affordable monthly pricing\n` +
                `› Reliable & secure hosting\n\n` +
                `_Tap the button below for full details._`;

            const chatId = ctx.chatId || ctx.chat || ctx.from || ctx._msg?.key?.remoteJid;
            const button = new Button(ctx.core || ctx.sock || ctx)
                .setTitle('🖥️ Server Plans')
                .setBody(outerBody)
                .setFooter(footer)
                .setImage('https://files.catbox.moe/54sbu9.png')
                .addCopy('📧 Copy Email', 'bigmanj.tech@gmail.com')
                .addCopy('📲 Copy WhatsApp', '255636756591')
                .addUrl('🌐 Open Panel', groupLink, false);

            await button.send(chatId, {
                quoted: ctx._msg,
                fallbackText: fullDetails,
            });

            if (!button) {
                await ctx.reply(fullDetails);
            }

        } catch (error) {
            console.error('[serverprices] Error:', error?.message || error);
            await ctx.reply('❌ Failed to load server prices.');
        }
    }
};
