/**
 * owner.js - Owner Profile with ctx and fallback
 * Usage: .owner
 */

const { AIRich, ButtonV2, createCtx } = require('../lib/messageBuilder');

// ─── OWNER CONFIG ──────────────────────────────────────────────────────────
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

// ─── MAIN OWNER COMMAND ──────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);

        // ─── RANDOM IMAGE ──────────────────────────────────────────────────
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // ─── BUILD PROFILE TEXT ──────────────────────────────────────────
        const profileText = 
            `👑 *Owner Profile*\n\n` +
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
            `> ⚡ Mickey Glitch Sub`;

        // ─── TRY AIRICH ──────────────────────────────────────────────────
        try {
            const rich = new AIRich(sock)
                .setTitle('👑 Owner Profile')
                .setBody(`📋 *${CONFIG.OWNER.NAME} - ${CONFIG.OWNER.TITLE}*`)
                .addText(
                    `👤 **Name:** ${CONFIG.OWNER.NAME}\n` +
                    `💼 **Title:** ${CONFIG.OWNER.TITLE}\n` +
                    `📍 **Location:** ${CONFIG.OWNER.LOCATION}\n` +
                    `📧 **Email:** ${CONFIG.OWNER.EMAIL}`
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
                .addTip('💡 Click buttons below to contact the owner')
                .addSuggest(['Call owner', 'Visit website', 'View GitHub']);

            await rich.send(chatId, {
                quoted: message,
                forwarded: false,
                notification: false,
                fallbackText: profileText
            });

            console.log('[OWNER] Sent with AIRich');

        } catch (richError) {
            console.error('[AIRICH ERROR]', richError.message);
            
            // ─── FALLBACK 1: BUTTONV2 ──────────────────────────────────
            try {
                const button = new ButtonV2(sock)
                    .setTitle('👑 Owner Profile')
                    .setBody(profileText)
                    .setFooter(`⚡ ${CONFIG.OWNER.NAME}`)
                    .setThumbnail(randomImage)
                    .addButton({
                        name: 'cta_call',
                        buttonParamsJson: JSON.stringify({
                            display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`,
                            id: 'call_1'
                        })
                    })
                    .addButton({
                        name: 'cta_call',
                        buttonParamsJson: JSON.stringify({
                            display_text: `📞 Call ${CONFIG.OWNER.PHONE_2}`,
                            id: 'call_2'
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
                            display_text: '💬 Chat Owner',
                            id: 'chat_owner'
                        })
                    });

                await button.send(chatId, {
                    quoted: message,
                    fallbackText: profileText
                });

                console.log('[OWNER] Sent with ButtonV2');

            } catch (buttonError) {
                console.error('[BUTTONV2 ERROR]', buttonError.message);
                
                // ─── FALLBACK 2: PLAIN TEXT ──────────────────────────────
                await ctx.reply(profileText);
                console.log('[OWNER] Sent with Plain Text');
            }
        }

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