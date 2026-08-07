/**
 * owner.js - Optimized Owner Profile with Lice Photo Implementation
 */

// ─── FIX: Badili jina la module ──────────────────────────────────────
// const { Button, createCtx } = require('../lib/messagebuilder'); // ← HII ILIKOSA
const { Button, createCtx } = require('../lib/messageBuilder'); // ← HII SAHIHI

const {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} = require('baileys');

// ─── CONFIGURATION ─────────────────────────────────────────────────────
const ownerData = new Map([
    ['NAME', 'Mickdady'],
    ['TITLE', 'Developer'],
    ['PHONE_1', '255636756591'],
    ['PHONE_2', '255636756591'],
    ['EMAIL', 'dev@mickdady.com'],
    ['WEBSITE', 'https://mickdady.com'],
    ['GITHUB', 'https://github.com/Mickeymozy']
]);

const IMAGE_URLS = [
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
    'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
];

// ─── BUILD VCARD ──────────────────────────────────────────────────────
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

// ─── SEND IMAGE WITH LICE PHOTO ──────────────────────────────────────
async function sendImageWithLice(sock, chatId, imageUrl, caption, quoted) {
    try {
        // Prepare image
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        // Generate message
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

        // Send message
        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id
        });

        return true;
    } catch (error) {
        console.error('[LICE PHOTO ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND BUTTONS ──────────────────────────────────────────────────────
async function sendButtons(sock, chatId, text, imageUrl, quoted) {
    try {
        const button = new Button(sock)
            .setTitle('👑 Owner')
            .setBody(text)
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .setImage(imageUrl)
            .addCall('📞 Call', `call_${ownerData.get('PHONE_1')}`)
            .addUrl('🌐 Website', ownerData.get('WEBSITE'))
            .addCopy('📧 Email', ownerData.get('EMAIL'))
            .addUrl('🐙 GitHub', ownerData.get('GITHUB'));

        await button.send(chatId, {
            quoted: quoted,
            fallbackText: text,
        });
        return true;
    } catch (error) {
        console.error('[BUTTONS ERROR]', error?.message || error);
        return false;
    }
}

// ─── MAIN COMMAND ──────────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);
        const randomImage = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];
        const isPrivate = chatId.endsWith('@s.whatsapp.net');

        const profileText =
            `👑 *OWNER PROFILE*\n\n` +
            `*Name:* ${ownerData.get('NAME')}\n` +
            `*Role:* ${ownerData.get('TITLE')}\n\n` +
            `_Use buttons below to contact me._`;

        // ─── SEND VCARD (Private Chat Only) ──────────────────────────────
        if (isPrivate) {
            try {
                await sock.sendMessage(chatId, {
                    contacts: {
                        displayName: ownerData.get('NAME'),
                        contacts: [{ vcard: buildVCard() }],
                    },
                }, { quoted: message });
            } catch (contactError) {
                console.error('[VCARD ERROR]', contactError?.message);
            }
        }

        // ─── SEND LICE PHOTO ──────────────────────────────────────────────
        const imageSent = await sendImageWithLice(
            sock,
            chatId,
            randomImage,
            profileText,
            message
        );

        // ─── SEND BUTTONS ──────────────────────────────────────────────────
        if (imageSent) {
            // Tuma buttons tofauti baada ya picha
            await sendButtons(sock, chatId, profileText, randomImage, message);
        } else {
            // Fallback: Tuma buttons peke yake
            await sendButtons(sock, chatId, profileText, randomImage, message);
        }

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);
        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply(`❌ *Error:* ${error.message}`);
        } catch (e) {
            console.error('[FATAL]', e.message);
        }
    }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;