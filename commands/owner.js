/**
 * owner.js - Owner Profile using MessageBuilder features
 * Usage: .owner
 */

const { Button, ButtonV2, Carousel, AIRich, createCtx } = require('../lib/messageBuilder');

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

        // ─── RANDOM IMAGE ──────────────────────────────────────────────────
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // ─── PROFILE TEXT ──────────────────────────────────────────────────
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
            `├ GitHub: ${CONFIG.OWNER.GITHUB}\n` +
            `└ Website: ${CONFIG.OWNER.WEBSITE}\n\n` +
            `> ⚡ Mickey Glitch Technology`;

        // ─── SEND WITH CAROUSEL ──────────────────────────────────────────
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
                body: {
                    text: profileText
                },
                footer: {
                    text: `⚡ ${CONFIG.OWNER.TITLE} | ${new Date().toLocaleDateString()}`
                }
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
                .addButton({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`,
                        id: `call_${CONFIG.OWNER.PHONE_1}`
                    })
                })
                .addButton({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: `📞 Call ${CONFIG.OWNER.PHONE_2}`,
                        id: `call_${CONFIG.OWNER.PHONE_2}`
                    })
                })
                .addButton({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Number',
                        id: 'copy_number'
                    })
                })
                .addButton({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 Website',
                        id: 'visit_website'
                    })
                })
                .addButton({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🐙 GitHub',
                        id: 'visit_github'
                    })
                });

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
                .addReply(`📞 Call ${CONFIG.OWNER.PHONE_1}`, `call_1`)
                .addReply(`📞 Call ${CONFIG.OWNER.PHONE_2}`, `call_2`)
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

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;