/**
 * owner.js - Simple Owner Profile with AIRich
 */

const { AIRich, ButtonV2, createCtx } = require('../lib/messageBuilder');

const CONFIG = {
    OWNER: {
        NAME: 'Mickdady',
        TITLE: 'Base Developer',
        LOCATION: 'Tanzania 🇹🇿',
        PHONE_1: '255615944741',
        PHONE_2: '255612130873',
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

        await ctx.reply('⏳ _Loading profile..._');

        const rich = new AIRich(sock)
            .setTitle('👑 Owner Profile')
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
                `› 📱 **Phone 1** : ${CONFIG.OWNER.PHONE_1}\n` +
                `› 📱 **Phone 2** : ${CONFIG.OWNER.PHONE_2}\n` +
                `› 📧 **Email** : ${CONFIG.OWNER.EMAIL || 'N/A'}`
            )
            .addText(
                `## ◈ Links\n\n` +
                `› 🌐 **Website** : ${CONFIG.OWNER.WEBSITE}\n` +
                `› 🐙 **GitHub** : ${CONFIG.OWNER.GITHUB}`
            )
            .addTable([
                ['📊 Metric', '📌 Value'],
                ['━━━━━━━━', '━━━━━━━━'],
                ['Name', CONFIG.OWNER.NAME],
                ['Title', CONFIG.OWNER.TITLE],
                ['Location', CONFIG.OWNER.LOCATION],
                ['Phone 1', CONFIG.OWNER.PHONE_1],
                ['Phone 2', CONFIG.OWNER.PHONE_2]
            ])
            .addTip(`💡 Contact ${CONFIG.OWNER.NAME} via buttons below`)
            .addSuggest(['Call owner', 'Visit website', 'View GitHub']);

        await rich.send(chatId, {
            quoted: message,
            forwarded: false,
            fallbackText: `👑 ${CONFIG.OWNER.NAME}\n📱 ${CONFIG.OWNER.PHONE_1}`
        });

        const button = new ButtonV2(sock)
            .setBody('📋 *Contact Options*')
            .setFooter(`⚡ ${CONFIG.OWNER.NAME}`)
            .addButton({
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`,
                    id: 'call_1'
                })
            })
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Number',
                    copy_code: CONFIG.OWNER.PHONE_1,
                    id: 'copy_phone'
                })
            })
            .addButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Website',
                    url: CONFIG.OWNER.WEBSITE,
                    webview_interaction: false
                })
            })
            .addButton({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '💬 Chat',
                    id: 'chat_owner'
                })
            });

        await button.send(chatId, {
            quoted: message,
            fallbackText: `📱 ${CONFIG.OWNER.PHONE_1}`
        });

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