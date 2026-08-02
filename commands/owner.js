/**
 * owner.js - Owner Profile using MessageBuilder features
 * Usage: .owner
 */

const { Carousel, ButtonV2, Button, createCtx } = require('../lib/messageBuilder');

// ─── OWNER CONFIG ──────────────────────────────────────────────────────────
const CONFIG = {
    OWNER: {
        NAME: 'Mickdady',
        TITLE: 'Base Developer & Founder',
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

// ─── MAIN OWNER COMMAND ──────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        const profileText = 
            `👑 *OWNER PROFILE*\n\n` +
            `👤 *Name:* ${CONFIG.OWNER.NAME}\n` +
            `💼 *Title:* ${CONFIG.OWNER.TITLE}\n` +
            `📍 *Location:* ${CONFIG.OWNER.LOCATION}\n` +
            `📧 *Email:* ${CONFIG.OWNER.EMAIL}\n\n` +
            `📱 *Contacts:*\n` +
            `├ ${CONFIG.OWNER.PHONE_1}\n` +
            `└ ${CONFIG.OWNER.PHONE_2}\n\n` +
            `🔗 *Links:*\n` +
            `├ ${CONFIG.OWNER.GITHUB}\n` +
            `└ ${CONFIG.OWNER.WEBSITE}\n\n` +
            `> ⚡ Mickey Glitch Technology`;

        // ─── TRY CAROUSEL ──────────────────────────────────────────────────
        try {
            const carousel = new Carousel(sock);
            const card = {
                header: {
                    title: `👑 ${CONFIG.OWNER.NAME}`,
                    hasMediaAttachment: true,
                    imageMessage: {
                        url: randomImage,
                        mimetype: 'image/png'
                    }
                },
                body: { text: profileText },
                footer: { text: `⚡ ${CONFIG.OWNER.TITLE} | ${new Date().toLocaleDateString()}` }
            };

            carousel
                .setTitle('👑 Owner Profile')
                .setBody('📋 *Contact Information*')
                .setFooter('⚡ Mickey Glitch Sub')
                .addCard(card);

            await carousel.send(chatId, {
                quoted: message,
                fallbackText: profileText
            });
            console.log('[OWNER] Sent with Carousel');
            return;
        } catch (carouselError) {
            console.error('[CAROUSEL ERROR]', carouselError.message);
        }

        // ─── FALLBACK 1: BUTTONV2 ──────────────────────────────────────────
        try {
            const button = new ButtonV2(sock)
                .setTitle('👑 Owner Profile')
                .setSubtitle(CONFIG.OWNER.NAME)
                .setBody(profileText)
                .setFooter(`⚡ ${CONFIG.OWNER.NAME} | ${new Date().toLocaleDateString()}`)
                .setThumbnail(randomImage)
                .addButton('📞 Call 1', `call_${CONFIG.OWNER.PHONE_1}`)
                .addButton('📞 Call 2', `call_${CONFIG.OWNER.PHONE_2}`)
                .addButton('📋 Copy Number', 'copy_number')
                .addButton('🌐 Website', 'visit_website')
                .addButton('🐙 GitHub', 'visit_github');

            await button.send(chatId, {
                quoted: message,
                fallbackText: profileText
            });
            console.log('[OWNER] Sent with ButtonV2');
            return;
        } catch (buttonError) {
            console.error('[BUTTONV2 ERROR]', buttonError.message);
        }

        // ─── FALLBACK 2: BUTTON V1 ──────────────────────────────────────────
        try {
            const button = new Button(sock)
                .setTitle('👑 Owner Profile')
                .setBody(profileText)
                .setFooter(`⚡ ${CONFIG.OWNER.NAME}`)
                .setImage(randomImage)
                .addReply(`📞 Call ${CONFIG.OWNER.PHONE_1}`, 'call_1')
                .addReply(`📞 Call ${CONFIG.OWNER.PHONE_2}`, 'call_2')
                .addReply('📋 Copy Number', 'copy_number')
                .addReply('🌐 Website', 'visit_website')
                .addReply('🐙 GitHub', 'visit_github');

            await button.send(chatId, {
                quoted: message,
                fallbackText: profileText
            });
            console.log('[OWNER] Sent with Button V1');
            return;
        } catch (buttonV1Error) {
            console.error('[BUTTON V1 ERROR]', buttonV1Error.message);
        }

        // ─── FALLBACK 3: PLAIN TEXT ──────────────────────────────────────
        await ctx.reply(profileText);
        console.log('[OWNER] Sent with Plain Text');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);
        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply(`❌ *Error:* ${error.message}`);
        } catch (e) {
            console.error('[OWNER FATAL]', e.message);
        }
    }
}

module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;