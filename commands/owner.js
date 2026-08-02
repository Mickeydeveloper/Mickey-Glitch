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
        const isPrivate = String(chatId || '').endsWith('@s.whatsapp.net');

        const profileText =
            `👑 *OWNER PROFILE*

` +
            `👤 ${CONFIG.OWNER.NAME}
` +
            `💼 ${CONFIG.OWNER.TITLE}
` +
            `📍 ${CONFIG.OWNER.LOCATION}

` +
            `📱 ${CONFIG.OWNER.PHONE_1}
` +
            `📱 ${CONFIG.OWNER.PHONE_2}

` +
            `✉️ ${CONFIG.OWNER.EMAIL}
` +
            `🌐 ${CONFIG.OWNER.WEBSITE}
` +
            `🐙 ${CONFIG.OWNER.GITHUB}`;

        const buildVCard = () => {
            const owner = CONFIG.OWNER;
            return [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${owner.NAME}`,
                `ORG:${owner.TITLE}`,
                `TEL;type=CELL;type=VOICE;waid=${owner.PHONE_1}:${owner.PHONE_1}`,
                `TEL;type=CELL;type=VOICE;waid=${owner.PHONE_2}:${owner.PHONE_2}`,
                `EMAIL:${owner.EMAIL}`,
                `URL:${owner.WEBSITE}`,
                `NOTE:${owner.GITHUB}`,
                'END:VCARD',
            ].join('\n');
        };

        if (isPrivate) {
            try {
                await sock.sendMessage(chatId, {
                    contacts: {
                        displayName: CONFIG.OWNER.NAME,
                        contacts: [{ vcard: buildVCard() }],
                    },
                }, { quoted: message });
                console.log('[OWNER] Shared contact card');
            } catch (contactError) {
                console.error('[OWNER CONTACT ERROR]', contactError?.message || contactError);
            }
        }

        // ─── PRIMARY: BUTTON V1 WITH ACTIONS ───────────────────────────────
        try {
            const button = new Button(sock)
                .setTitle('👑 Owner Profile')
                .setBody(profileText)
                .setFooter(`⚡ ${CONFIG.OWNER.NAME}`)
                .setImage(randomImage)
                .addCall(`📞 ${CONFIG.OWNER.PHONE_1}`, `call_${CONFIG.OWNER.PHONE_1}`)
                .addCall(`📞 ${CONFIG.OWNER.PHONE_2}`, `call_${CONFIG.OWNER.PHONE_2}`)
                .addUrl('🌐 Website', CONFIG.OWNER.WEBSITE)
                .addUrl('🐙 GitHub', CONFIG.OWNER.GITHUB)
                .addCopy('📧 Email', CONFIG.OWNER.EMAIL);

            await button.send(chatId, {
                quoted: message,
                fallbackText: profileText,
            });
            console.log('[OWNER] Sent with Button V1');
            return;
        } catch (buttonError) {
            console.error('[OWNER BUTTON ERROR]', buttonError?.message || buttonError);
        }

        // ─── FALLBACK 1: BUTTONV2 QUICK REPLIES ────────────────────────────
        try {
            const button = new ButtonV2(sock)
                .setTitle('👑 Owner Profile')
                .setSubtitle(CONFIG.OWNER.NAME)
                .setBody(profileText)
                .setFooter(`⚡ ${CONFIG.OWNER.NAME}`)
                .setThumbnail(randomImage)
                .addButton('📞 Call 1', `call_${CONFIG.OWNER.PHONE_1}`)
                .addButton('📞 Call 2', `call_${CONFIG.OWNER.PHONE_2}`)
                .addButton('🌐 Website', 'visit_website')
                .addButton('🐙 GitHub', 'visit_github');

            await button.send(chatId, {
                quoted: message,
                fallbackText: profileText,
            });
            console.log('[OWNER] Sent with ButtonV2');
            return;
        } catch (buttonV2Error) {
            console.error('[BUTTONV2 ERROR]', buttonV2Error?.message || buttonV2Error);
        }

        // ─── FALLBACK 2: PLAIN TEXT ──────────────────────────────────────
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