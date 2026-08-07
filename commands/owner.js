/**
 * owner.js - Optimized Owner Profile with Lice Photo Implementation
 */

const { Carousel, ButtonV2, Button, createCtx } = require('../lib/messageBuilder');
const {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} = require('baileys');

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

// ─── IMAGE CONFIGURATION ────────────────────────────────────────────────
const IMAGE_URLS = [
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
];

// ─── HELPER: SEND IMAGE WITH LICE PHOTO ────────────────────────────────
async function sendLicePhoto(sock, chatId, imageUrl, caption, quoted) {
    try {
        // Prepare image message
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        // Generate message with context info
        const msg = generateWAMessageFromContent(
            chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    caption: caption,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0
                    }
                }
            },
            { quoted }
        );

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id
        });

        return msg;
    } catch (error) {
        console.error('[LICE PHOTO ERROR]', error?.message || error);
        return null;
    }
}

// ─── HELPER: SEND VCARD ──────────────────────────────────────────────────
function buildVCard() {
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
}

// ─── BUILD PROFILE TEXT ──────────────────────────────────────────────────
function getProfileText() {
    return (
        `👑 *OWNER PROFILE*\n\n` +
        `*Name:* ${ownerData.get('NAME')}\n` +
        `*Role:* ${ownerData.get('TITLE')}\n\n` +
        `_Use the buttons below to contact or visit links._`
    );
}

// ─── MAIN OWNER COMMAND ──────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);
        const randomImage = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];
        const isPrivate = String(chatId || '').endsWith('@s.whatsapp.net');
        const profileText = getProfileText();

        // ─── SEND VCARD IN PRIVATE CHAT ────────────────────────────────────
        if (isPrivate) {
            try {
                await sock.sendMessage(chatId, {
                    contacts: {
                        displayName: ownerData.get('NAME'),
                        contacts: [{ vcard: buildVCard() }],
                    },
                }, { quoted: message });
            } catch (contactError) {
                console.error('[VCARD ERROR]', contactError?.message || contactError);
            }
        }

        // ─── PRIMARY: SEND LICE PHOTO WITH BUTTONS ────────────────────────
        try {
            // Send image with lice photo implementation
            const imageMsg = await sendLicePhoto(
                sock,
                chatId,
                randomImage,
                profileText,
                message
            );

            if (imageMsg) {
                // Build button message separately or use Button class
                const button = new Button(sock)
                    .setTitle('👑 Owner')
                    .setBody(profileText)
                    .setFooter(`⚡ ${ownerData.get('NAME')}`)
                    .addCall('Call', `call_${ownerData.get('PHONE_1')}`)
                    .addUrl('Website', ownerData.get('WEBSITE'))
                    .addCopy('Email', ownerData.get('EMAIL'))
                    .addUrl('GitHub', ownerData.get('GITHUB'));

                await button.send(chatId, {
                    quoted: message,
                    fallbackText: profileText,
                });
                return;
            }
        } catch (liceError) {
            console.error('[LICE PHOTO ERROR]', liceError?.message || liceError);
        }

        // ─── FALLBACK 1: BUTTONV2 ──────────────────────────────────────────
        try {
            const button = new ButtonV2(sock)
                .setTitle('👑 Owner')
                .setSubtitle(ownerData.get('NAME'))
                .setBody(profileText)
                .setFooter(`⚡ ${ownerData.get('NAME')}`)
                .setThumbnail(randomImage)
                .addButton('Call', `call_${ownerData.get('PHONE_1')}`)
                .addButton('Website', 'visit_website')
                .addButton('Email', 'copy_email');

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

// ─── EXPORTS ─────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;