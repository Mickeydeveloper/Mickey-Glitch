/**
 * owner.js - Owner Profile with AIRich
 */

const { AIRich, ButtonV2, createCtx } = require('../lib/messageBuilder');

const CONFIG = {
    OWNER: {
        NAME: 'Mickdady',
        TITLE: 'Base Developer',
        LOCATION: 'Tanzania 🇹🇿',
        PHONE_1: '255615944741',
        PHONE_2: '255612130873',
        EMAIL: 'mickey@example.com',
        GITHUB: 'https://github.com/Mickeydeveloper',
        WEBSITE: 'https://mickey-glitch.vercel.app'
    },
    IMAGES: [
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
    ]
};

async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // ─── SEND WITH AIRICH ──────────────────────────────────────────────
        try {
            const rich = new AIRich(sock)
                .setTitle('👑 Owner Profile')
                .setBody(`📋 *${CONFIG.OWNER.NAME} - ${CONFIG.OWNER.TITLE}*`)
                .addProduct({
                    title: CONFIG.OWNER.NAME,
                    brand: CONFIG.OWNER.TITLE,
                    price: CONFIG.OWNER.PHONE_1,
                    sale_price: CONFIG.OWNER.LOCATION,
                    product_url: CONFIG.OWNER.WEBSITE,
                    image_url: randomImage,
                    icon_url: randomImage
                })
                .addText(
                    `## ◈ Contact Info\n\n` +
                    `› 📱 **Phone 1:** ${CONFIG.OWNER.PHONE_1}\n` +
                    `› 📱 **Phone 2:** ${CONFIG.OWNER.PHONE_2}\n` +
                    `› 📧 **Email:** ${CONFIG.OWNER.EMAIL}`
                )
                .addText(
                    `## ◈ Links\n\n` +
                    `› 🌐 **Website:** ${CONFIG.OWNER.WEBSITE}\n` +
                    `› 🐙 **GitHub:** ${CONFIG.OWNER.GITHUB}`
                )
                .addTable([
                    ['📊 METRIC', '📌 VALUE'],
                    ['━━━━━━━━', '━━━━━━━━'],
                    ['👤 Name', CONFIG.OWNER.NAME],
                    ['💼 Title', CONFIG.OWNER.TITLE],
                    ['📍 Location', CONFIG.OWNER.LOCATION],
                    ['📱 Phone 1', CONFIG.OWNER.PHONE_1],
                    ['📱 Phone 2', CONFIG.OWNER.PHONE_2],
                    ['📧 Email', CONFIG.OWNER.EMAIL],
                    ['🌐 Website', CONFIG.OWNER.WEBSITE],
                    ['🐙 GitHub', CONFIG.OWNER.GITHUB]
                ])
                .addTip(`💡 Click buttons below to contact ${CONFIG.OWNER.NAME}`)
                .addSuggest([
                    'Call owner',
                    'Visit website',
                    'View GitHub'
                ]);

            await rich.send(chatId, {
                quoted: message,
                forwarded: false,
                notification: false,
                fallbackText: `👑 ${CONFIG.OWNER.NAME}\n📱 ${CONFIG.OWNER.PHONE_1}`
            });

            console.log('[OWNER] Sent with AIRich');

        } catch (richError) {
            console.error('[AIRICH ERROR]', richError.message);
            
            // ─── FALLBACK ──────────────────────────────────────────────────
            const fallbackText = 
                `👑 *${CONFIG.OWNER.NAME}*\n\n` +
                `📱 ${CONFIG.OWNER.PHONE_1}\n` +
                `📱 ${CONFIG.OWNER.PHONE_2}\n` +
                `🌐 ${CONFIG.OWNER.WEBSITE}\n` +
                `🐙 ${CONFIG.OWNER.GITHUB}\n\n` +
                `> ⚡ Mickey Glitch Sub`;

            await ctx.reply(fallbackText);
        }

    } catch (error) {
        console.error('[OWNER ERROR]', error.message);
        const ctx = createCtx(sock, chatId, message);
        await ctx.reply(`❌ Error: ${error.message}`);
    }
}

module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;