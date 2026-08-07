/**
 * owner.js - Optimized Owner Profile with Multiple Fallbacks
 */

// ─── FIX: Use try-catch for all requires ─────────────────────────────
let Button, createCtx, prepareWAMessageMedia, generateWAMessageFromContent;

try {
    const messageBuilder = require('../lib/messageBuilder');
    Button = messageBuilder.Button;
    createCtx = messageBuilder.createCtx;
} catch (e) {
    console.log('[OWNER] messageBuilder not found, using fallback');
    Button = null;
    createCtx = null;
}

try {
    const baileys = require('baileys');
    prepareWAMessageMedia = baileys.prepareWAMessageMedia;
    generateWAMessageFromContent = baileys.generateWAMessageFromContent;
} catch (e) {
    console.log('[OWNER] baileys functions not found');
    prepareWAMessageMedia = null;
    generateWAMessageFromContent = null;
}

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

// ─── ADDITIONAL NODES ──────────────────────────────────────────────────
const additionalNodes = [
    {
        name: 'owner_info',
        description: 'Get owner information and contact details'
    },
    {
        name: 'contact_owner',
        description: 'Contact the bot owner directly'
    }
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
    if (!prepareWAMessageMedia || !generateWAMessageFromContent) {
        console.log('[LICE] Functions not available');
        return false;
    }

    try {
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        const msg = generateWAMessageFromContent(
            chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    caption: caption,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0,
                        additionalNodes: additionalNodes // ← ADDITIONAL NODES
                    }
                }
            },
            { quoted }
        );

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
    if (!Button) {
        console.log('[BUTTONS] Button class not available');
        return false;
    }

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

// ─── SEND SIMPLE VCARD ────────────────────────────────────────────────
async function sendVCard(sock, chatId, quoted) {
    try {
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: ownerData.get('NAME'),
                contacts: [{ vcard: buildVCard() }],
            },
        }, { quoted: quoted });
        return true;
    } catch (error) {
        console.error('[VCARD ERROR]', error?.message);
        return false;
    }
}

// ─── SEND PLAIN TEXT WITH FORMATTING ─────────────────────────────────
async function sendPlainText(sock, chatId, quoted) {
    try {
        const text =
            `👑 *OWNER PROFILE*\n\n` +
            `*Name:* ${ownerData.get('NAME')}\n` +
            `*Role:* ${ownerData.get('TITLE')}\n` +
            `*Phone:* ${ownerData.get('PHONE_1')}\n` +
            `*Email:* ${ownerData.get('EMAIL')}\n` +
            `*Website:* ${ownerData.get('WEBSITE')}\n` +
            `*GitHub:* ${ownerData.get('GITHUB')}\n\n` +
            `_Contact me through any of the above channels._`;

        await sock.sendMessage(chatId, { text: text }, { quoted: quoted });
        return true;
    } catch (error) {
        console.error('[TEXT ERROR]', error?.message);
        return false;
    }
}

// ─── MAIN COMMAND ──────────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        console.log('[OWNER] Command executed for:', chatId);
        
        const isPrivate = chatId.endsWith('@s.whatsapp.net');
        const randomImage = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];
        
        // Get profile text
        const profileText =
            `👑 *OWNER PROFILE*\n\n` +
            `*Name:* ${ownerData.get('NAME')}\n` +
            `*Role:* ${ownerData.get('TITLE')}\n\n` +
            `_Use buttons below to contact me._`;

        // ─── STEP 1: Send VCard (Private Chat Only) ──────────────────────
        if (isPrivate) {
            await sendVCard(sock, chatId, message);
        }

        // ─── STEP 2: Try Lice Photo ──────────────────────────────────────
        const imageSent = await sendImageWithLice(
            sock,
            chatId,
            randomImage,
            profileText,
            message
        );

        // ─── STEP 3: Try Buttons ──────────────────────────────────────────
        if (imageSent) {
            await sendButtons(sock, chatId, profileText, randomImage, message);
        } else {
            // Try buttons without image
            await sendButtons(sock, chatId, profileText, null, message);
        }

        // ─── STEP 4: Final Fallback - Plain Text ─────────────────────────
        // If nothing worked, send plain text (this will always work)
        setTimeout(async () => {
            await sendPlainText(sock, chatId, message);
        }, 1000);

        // Log success
        console.log('[OWNER] Command completed successfully');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);
        
        // Ultimate fallback - try to send plain text
        try {
            await sendPlainText(sock, chatId, message);
        } catch (e) {
            console.error('[FATAL]', e.message);
            // Try one more time with simple text
            try {
                await sock.sendMessage(chatId, { 
                    text: `👑 Owner: ${ownerData.get('NAME')}\nPhone: ${ownerData.get('PHONE_1')}` 
                });
            } catch (final) {
                console.error('[FINAL ERROR]', final.message);
            }
        }
    }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about', 'developer'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;
module.exports.additionalNodes = additionalNodes; // ← Export additional nodes