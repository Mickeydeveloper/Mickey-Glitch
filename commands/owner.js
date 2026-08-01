/**
 * owner.js - Owner Profile with Call & Copy Buttons
 * Uses ButtonV2 for interactive buttons
 */

const { ButtonV2, createCtx } = require('../lib/messageBuilder');

// ─── OWNER CONFIG ──────────────────────────────────────────────────────────
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

// ─── MAIN OWNER COMMAND ──────────────────────────────────────────────────
const ownerCommand = async (sock, chatId, message) => {
    try {
        const ctx = createCtx(sock, chatId, message);

        // ─── RANDOM IMAGE ──────────────────────────────────────────────────
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // ─── SHORT & CLEAN PROFILE TEXT ──────────────────────────────────
        const profileText = 
            `👑 *OWNER PROFILE*\n\n` +
            `👤 *Name:* ${CONFIG.OWNER.NAME}\n` +
            `💼 *Title:* ${CONFIG.OWNER.TITLE}\n` +
            `📍 *Location:* ${CONFIG.OWNER.LOCATION}\n\n` +
            `📱 *Contacts:*\n` +
            `├ ${CONFIG.OWNER.PHONE_1}\n` +
            `└ ${CONFIG.OWNER.PHONE_2}\n\n` +
            `🔗 *Links:*\n` +
            `├ GitHub: ${CONFIG.OWNER.GITHUB}\n` +
            `└ Website: ${CONFIG.OWNER.WEBSITE}\n\n` +
            `> ⚡ Mickey Glitch Technology`;

        // ─── CREATE BUTTONV2 ──────────────────────────────────────────────
        const button = new ButtonV2(sock)
            .setTitle('👑 Owner Profile')
            .setSubtitle(CONFIG.OWNER.NAME)
            .setBody(profileText)
            .setFooter(`⚡ ${CONFIG.OWNER.NAME} | ${new Date().toLocaleDateString()}`)
            .setThumbnail(randomImage)

            // ─── CALL BUTTONS ──────────────────────────────────────────────
            .addButton({
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`,
                    id: `call_${CONFIG.OWNER.PHONE_1}`
                })
            })
            .addButton({
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: `📞 Call ${CONFIG.OWNER.PHONE_2}`,
                    id: `call_${CONFIG.OWNER.PHONE_2}`
                })
            })

            // ─── COPY BUTTONS ──────────────────────────────────────────────
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Line 1',
                    copy_code: CONFIG.OWNER.PHONE_1,
                    id: 'copy_phone_1'
                })
            })
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Line 2',
                    copy_code: CONFIG.OWNER.PHONE_2,
                    id: 'copy_phone_2'
                })
            })

            // ─── URL BUTTONS ──────────────────────────────────────────────
            .addButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 GitHub',
                    url: CONFIG.OWNER.GITHUB,
                    webview_interaction: false
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

            // ─── QUICK REPLY ──────────────────────────────────────────────
            .addButton({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '💬 Chat Owner',
                    id: 'chat_owner'
                })
            });

        // ─── SEND ──────────────────────────────────────────────────────────
        await button.send(chatId, {
            quoted: message,
            fallbackText: `👑 Owner: ${CONFIG.OWNER.NAME}\n📱 ${CONFIG.OWNER.PHONE_1}`
        });

        console.log('[OWNER] Sent to:', chatId);

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);

        // ─── FALLBACK ────────────────────────────────────────────────────
        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply(`❌ *Error:* ${error.message}`);
        } catch (e) {
            console.error('[OWNER FATAL]', e.message);
        }
    }
};

module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;