/**
 * owner.js - Optimized Owner Profile (Map implementation & Clean UI)
 */

const { Carousel, ButtonV2, Button, createCtx } = require('../lib/messageBuilder');

// ─── CONFIGURATION USING MAP ─────────────────────────────────────────────
const ownerData = new Map([
    ['NAME', 'Mickdady'],
    ['TITLE', 'Developer'],
    ['PHONE_1', '255636756591'],
    ['PHONE_2', '255636756591'],
    ['EMAIL', 'dev@mickdady.com'],
    ['WEBSITE', 'https://mickdady.com'],
    ['GITHUB', 'https://github.com/Mickeymozy']
]);

const IMAGES = [
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
];

// ─── MAIN OWNER COMMAND ──────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);
        const randomImage = IMAGES[Math.floor(Math.random() * IMAGES.length)];
        const isPrivate = String(chatId || '').endsWith('@s.whatsapp.net');

        // Maelezo machache (picha + maelezo ya msingi pekee)
        const profileText = 
            `👑 *OWNER PROFILE*\n\n` +
            `👤 *Name:* ${ownerData.get('NAME')}\n` +
            `💼 *Role:* ${ownerData.get('TITLE')}`;

        const buildVCard = () => {
            return [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${ownerData.get('NAME')}`,
                `ORG:${ownerData.get('TITLE')}`,
                `TEL;type=CELL;type=VOICE;waid=${ownerData.get('PHONE_1')}:${ownerData.get('PHONE_1')}`,
                `TEL;type=CELL;type=VOICE;waid=${ownerData.get('PHONE_2')}:${ownerData.get('PHONE_2')}`,
                `EMAIL:${ownerData.get('EMAIL')}`,
                `URL:${ownerData.get('WEBSITE')}`,
                `NOTE:${ownerData.get('GITHUB')}`,
                'END:VCARD',
            ].join('\n');
        };

        if (isPrivate) {
            try {
                await sock.sendMessage(chatId, {
                    contacts: {
                        displayName: ownerData.get('NAME'),
                        contacts: [{ vcard: buildVCard() }],
                    },
                }, { quoted: message });
            } catch (contactError) {
                console.error('[OWNER CONTACT ERROR]', contactError?.message || contactError);
            }
        }

        // ─── PRIMARY: BUTTON V1 WITH ACTIONS ───────────────────────────────
        try {
            const button = new Button(sock)
                .setTitle('👑 Bot Owner')
                .setBody(profileText)
                .setFooter(`⚡ ${ownerData.get('NAME')}`)
                .setImage(randomImage)
                .addCall('Call 1', ownerData.get('PHONE_1'))
                .addCall('Call 2', ownerData.get('PHONE_2'))
                .addUrl('Website', ownerData.get('WEBSITE'))
                .addUrl('GitHub', ownerData.get('GITHUB'))
                .addCopy('Email', ownerData.get('EMAIL'));

            await button.send(chatId, {
                quoted: message,
                fallbackText: profileText,
            });
            return;
        } catch (buttonError) {
            console.error('[OWNER BUTTON ERROR]', buttonError?.message || buttonError);
        }

        // ─── FALLBACK 1: BUTTONV2 ──────────────────────────────────────────
        try {
            const button = new ButtonV2(sock)
                .setTitle('👑 Bot Owner')
                .setSubtitle(ownerData.get('NAME'))
                .setBody(profileText)
                .setFooter(`⚡ ${ownerData.get('NAME')}`)
                .setThumbnail(randomImage)
                .addButton('📞 Call 1', `call_${ownerData.get('PHONE_1')}`)
                .addButton('📞 Call 2', `call_${ownerData.get('PHONE_2')}`)
                .addButton('🌐 Website', 'visit_website')
                .addButton('🐙 GitHub', 'visit_github');

            await button.send(chatId, {
                quoted: message,
                fallbackText: profileText,
            });
            return;
        } catch (buttonV2Error) {
            console.error('[BUTTONV2 ERROR]', buttonV2Error?.message || buttonV2Error);
        }

        // ─── FALLBACK 2: PLAIN TEXT ──────────────────────────────────────
        await ctx.reply(profileText);

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
