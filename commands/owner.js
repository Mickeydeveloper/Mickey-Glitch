/**
 * owner.js - Owner Profile with Lice Photo & Buttons
 * Using @whiskeysockets/baileys
 */

// ─── REQUIRE MODULES ──────────────────────────────────────────────────
const { 
    prepareWAMessageMedia, 
    generateWAMessageFromContent 
} = require('@whiskeysockets/baileys');

// Import messageBuilder features
const messageBuilder = require('../lib/messageBuilder');
const { 
    Button, 
    ButtonV2, 
    Carousel, 
    createCtx,
    Template,
    List,
    Product
} = messageBuilder;

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

// ─── SEND LICE PHOTO ──────────────────────────────────────────────────
async function sendLicePhoto(sock, chatId, imageUrl, quoted) {
    try {
        console.log('[LICE] Preparing image...');
        
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        const caption = 
            `👑 *${ownerData.get('NAME')}*\n` +
            `📱 *${ownerData.get('PHONE_1')}*`;

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

        console.log('[LICE] Photo sent successfully!');
        return msg;
    } catch (error) {
        console.error('[LICE PHOTO ERROR]', error?.message || error);
        return null;
    }
}

// ─── SEND BUTTON V1 (Original) ──────────────────────────────────────
async function sendButtonV1(sock, chatId, quoted) {
    try {
        console.log('[BUTTON V1] Sending...');
        
        const text = 
            `👑 *OWNER PROFILE*\n\n` +
            `*Name:* ${ownerData.get('NAME')}\n` +
            `*Role:* ${ownerData.get('TITLE')}\n` +
            `*Phone:* ${ownerData.get('PHONE_1')}\n` +
            `*Email:* ${ownerData.get('EMAIL')}`;

        const button = new Button(sock)
            .setTitle('👑 Owner')
            .setBody(text)
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .setImage(IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)])
            .addCall('📞 Call', `call_${ownerData.get('PHONE_1')}`)
            .addUrl('🌐 Website', ownerData.get('WEBSITE'))
            .addCopy('📧 Email', ownerData.get('EMAIL'))
            .addUrl('🐙 GitHub', ownerData.get('GITHUB'))
            .addReply('💬 Chat', 'chat_owner');

        await button.send(chatId, {
            quoted: quoted,
            fallbackText: text,
        });
        
        console.log('[BUTTON V1] Sent successfully!');
        return true;
    } catch (error) {
        console.error('[BUTTON V1 ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND BUTTON V2 (Modern) ────────────────────────────────────────
async function sendButtonV2(sock, chatId, quoted) {
    try {
        console.log('[BUTTON V2] Sending...');
        
        const text = 
            `👑 *${ownerData.get('NAME')}*\n` +
            `📱 ${ownerData.get('PHONE_1')}\n` +
            `📧 ${ownerData.get('EMAIL')}`;

        const button = new ButtonV2(sock)
            .setTitle('👑 Owner')
            .setSubtitle(ownerData.get('TITLE'))
            .setBody(text)
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .setThumbnail(IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)])
            .addButton('📞 Call', `call_${ownerData.get('PHONE_1')}`)
            .addButton('🌐 Website', 'visit_website')
            .addButton('📧 Email', 'copy_email')
            .addButton('🐙 GitHub', 'visit_github');

        await button.send(chatId, {
            quoted: quoted,
            fallbackText: text,
        });
        
        console.log('[BUTTON V2] Sent successfully!');
        return true;
    } catch (error) {
        console.error('[BUTTON V2 ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND CAROUSEL ────────────────────────────────────────────────────
async function sendCarousel(sock, chatId, quoted) {
    try {
        console.log('[CAROUSEL] Sending...');
        
        const carousel = new Carousel(sock)
            .setTitle('👑 Owner Info')
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .addCard(
                '👤 Profile',
                `Name: ${ownerData.get('NAME')}\nRole: ${ownerData.get('TITLE')}`,
                IMAGE_URLS[0],
                [
                    { name: '📞 Call', url: `call_${ownerData.get('PHONE_1')}` },
                    { name: '🌐 Website', url: ownerData.get('WEBSITE') }
                ]
            )
            .addCard(
                '📱 Contact',
                `Phone: ${ownerData.get('PHONE_1')}\nEmail: ${ownerData.get('EMAIL')}`,
                IMAGE_URLS[1],
                [
                    { name: '📧 Email', url: `mailto:${ownerData.get('EMAIL')}` },
                    { name: '🐙 GitHub', url: ownerData.get('GITHUB') }
                ]
            );

        await carousel.send(chatId, {
            quoted: quoted,
        });
        
        console.log('[CAROUSEL] Sent successfully!');
        return true;
    } catch (error) {
        console.error('[CAROUSEL ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND TEMPLATE ────────────────────────────────────────────────────
async function sendTemplate(sock, chatId, quoted) {
    try {
        console.log('[TEMPLATE] Sending...');
        
        const template = new Template(sock)
            .setTitle('👑 Owner')
            .setBody(
                `Name: ${ownerData.get('NAME')}\n` +
                `Phone: ${ownerData.get('PHONE_1')}\n` +
                `Email: ${ownerData.get('EMAIL')}`
            )
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .addButton('📞 Call', `call_${ownerData.get('PHONE_1')}`)
            .addButton('🌐 Website', ownerData.get('WEBSITE'));

        await template.send(chatId, {
            quoted: quoted,
        });
        
        console.log('[TEMPLATE] Sent successfully!');
        return true;
    } catch (error) {
        console.error('[TEMPLATE ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND LIST ────────────────────────────────────────────────────────
async function sendList(sock, chatId, quoted) {
    try {
        console.log('[LIST] Sending...');
        
        const list = new List(sock)
            .setTitle('👑 Owner Options')
            .setBody('Choose an option to contact owner')
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .setButtonText('📋 Options')
            .addSection('📞 Contact', [
                { title: 'Call Owner', description: `Call ${ownerData.get('NAME')}`, rowId: `call_${ownerData.get('PHONE_1')}` },
                { title: 'Send Email', description: `Email ${ownerData.get('EMAIL')}`, rowId: `email_${ownerData.get('EMAIL')}` },
            ])
            .addSection('🌐 Links', [
                { title: 'Website', description: ownerData.get('WEBSITE'), rowId: 'visit_website' },
                { title: 'GitHub', description: ownerData.get('GITHUB'), rowId: 'visit_github' },
            ]);

        await list.send(chatId, {
            quoted: quoted,
        });
        
        console.log('[LIST] Sent successfully!');
        return true;
    } catch (error) {
        console.error('[LIST ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND VCARD ────────────────────────────────────────────────────────
async function sendVCard(sock, chatId, quoted) {
    try {
        console.log('[VCARD] Sending...');
        
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: ownerData.get('NAME'),
                contacts: [{ vcard: buildVCard() }],
            },
        }, { quoted: quoted });
        
        console.log('[VCARD] Sent successfully!');
        return true;
    } catch (error) {
        console.error('[VCARD ERROR]', error?.message);
        return false;
    }
}

// ─── SEND PLAIN TEXT (FALLBACK) ──────────────────────────────────────
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
        
        const isPrivate = chatId ? chatId.endsWith('@s.whatsapp.net') : false;

        // ─── STEP 1: Send VCard (Private only) ────────────────────────────
        if (isPrivate) {
            await sendVCard(sock, chatId, message);
        }

        // ─── STEP 2: Send Lice Photo ──────────────────────────────────────
        const randomImage = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];
        await sendLicePhoto(sock, chatId, randomImage, message);

        // ─── STEP 3: Try all button types (one will work) ─────────────────
        const buttonTypes = [
            sendButtonV1,
            sendButtonV2,
            sendCarousel,
            sendTemplate,
            sendList
        ];

        let sent = false;
        for (const sendFn of buttonTypes) {
            if (!sent) {
                sent = await sendFn(sock, chatId, message);
                if (sent) break;
            }
        }

        // ─── STEP 4: Text Backup (after 2 seconds) ────────────────────────
        setTimeout(async () => {
            await sendPlainText(sock, chatId, message);
        }, 2000);

        console.log('[OWNER] Command completed!');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);
        
        try {
            await sendPlainText(sock, chatId, message);
        } catch (e) {
            console.error('[FATAL]', e.message);
        }
    }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about', 'developer'];
module.exports.category = 'info';
module.exports.description = 'Onyesha taarifa za Owner na mawasiliano yake';
module.exports.handler = ownerCommand;