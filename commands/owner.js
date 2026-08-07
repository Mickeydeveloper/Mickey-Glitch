/**
 * owner.js - Complete Owner Profile with Buttons & Media
 */

// ─── REQUIRE MODULES SAFELY ──────────────────────────────────────────
let Button, ButtonV2, createCtx, prepareWAMessageMedia, generateWAMessageFromContent;

try {
    const mb = require('../lib/messageBuilder');
    Button = mb.Button;
    ButtonV2 = mb.ButtonV2;
    createCtx = mb.createCtx;
} catch (e) {
    console.log('[OWNER] messageBuilder not found');
}

try {
    const b = require('baileys');
    prepareWAMessageMedia = b.prepareWAMessageMedia;
    generateWAMessageFromContent = b.generateWAMessageFromContent;
} catch (e) {
    console.log('[OWNER] baileys functions not found');
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
    },
    {
        name: 'developer_info',
        description: 'Information about the bot developer'
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

// ─── SEND LICE PHOTO WITH BUTTONS ────────────────────────────────────
async function sendLicePhotoWithButtons(sock, chatId, imageUrl, quoted) {
    if (!prepareWAMessageMedia || !generateWAMessageFromContent) {
        console.log('[LICE] Functions not available');
        return false;
    }

    try {
        // 1. Prepare image
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        // 2. Create caption with owner info
        const caption =
            `👑 *OWNER PROFILE*\n\n` +
            `*Name:* ${ownerData.get('NAME')}\n` +
            `*Role:* ${ownerData.get('TITLE')}\n` +
            `*Phone:* ${ownerData.get('PHONE_1')}\n` +
            `*Email:* ${ownerData.get('EMAIL')}\n` +
            `*Website:* ${ownerData.get('WEBSITE')}\n` +
            `*GitHub:* ${ownerData.get('GITHUB')}\n\n` +
            `_Tap buttons below to interact._`;

        // 3. Generate message with buttons
        const msg = generateWAMessageFromContent(
            chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    caption: caption,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0,
                        additionalNodes: additionalNodes,
                        // Buttons in context info
                        forwardingContext: {
                            forwardingSource: 1
                        }
                    }
                }
            },
            { quoted }
        );

        // 4. Send the message
        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id
        });

        return true;
    } catch (error) {
        console.error('[LICE PHOTO ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND BUTTONS VIA MESSAGEBUILDER ─────────────────────────────────
async function sendButtonsViaBuilder(sock, chatId, imageUrl, quoted) {
    if (!Button) {
        console.log('[BUTTONS] Button class not available');
        return false;
    }

    try {
        const profileText =
            `👑 *Owner: ${ownerData.get('NAME')}*\n` +
            `📱 *Phone:* ${ownerData.get('PHONE_1')}\n` +
            `📧 *Email:* ${ownerData.get('EMAIL')}`;

        const button = new Button(sock)
            .setTitle('👑 Owner')
            .setBody(profileText)
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .setImage(imageUrl)
            .addCall('📞 Call', `call_${ownerData.get('PHONE_1')}`)
            .addUrl('🌐 Website', ownerData.get('WEBSITE'))
            .addCopy('📧 Email', ownerData.get('EMAIL'))
            .addUrl('🐙 GitHub', ownerData.get('GITHUB'));

        await button.send(chatId, {
            quoted: quoted,
            fallbackText: profileText,
        });
        return true;
    } catch (error) {
        console.error('[BUTTONS ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND VCARD ────────────────────────────────────────────────────────
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

// ─── SEND PLAIN TEXT ──────────────────────────────────────────────────
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
        console.log('[OWNER] Executing for:', chatId);
        
        const isPrivate = chatId.endsWith('@s.whatsapp.net');
        const randomImage = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];

        // ─── STEP 1: Send VCard (Private only) ────────────────────────────
        if (isPrivate) {
            await sendVCard(sock, chatId, message);
        }

        // ─── STEP 2: Try Lice Photo with Buttons ──────────────────────────
        const liceSent = await sendLicePhotoWithButtons(
            sock, 
            chatId, 
            randomImage, 
            message
        );

        // ─── STEP 3: If Lice fails, try Buttons via Builder ──────────────
        if (!liceSent) {
            console.log('[OWNER] Lice failed, trying buttons...');
            await sendButtonsViaBuilder(sock, chatId, randomImage, message);
        }

        // ─── STEP 4: Always send text as backup ──────────────────────────
        // Send plain text after 2 seconds as backup
        setTimeout(async () => {
            await sendPlainText(sock, chatId, message);
        }, 2000);

        console.log('[OWNER] Command completed');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);
        
        // Ultimate fallback
        try {
            await sendPlainText(sock, chatId, message);
        } catch (e) {
            console.error('[FATAL]', e.message);
            try {
                await sock.sendMessage(chatId, { 
                    text: `👑 Owner: ${ownerData.get('NAME')}\n📱 Phone: ${ownerData.get('PHONE_1')}` 
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
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about', 'developer', 'admin'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;
module.exports.additionalNodes = additionalNodes;