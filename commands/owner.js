/**
 * owner.js - Owner Profile with Lice Photo & Buttons
 * Using @whiskeysockets/baileys
 */

// ─── REQUIRE MODULES ──────────────────────────────────────────────────
const { 
    prepareWAMessageMedia, 
    generateWAMessageFromContent 
} = require('@whiskeysockets/baileys');

let Button, createCtx;

try {
    const mb = require('../lib/messageBuilder');
    Button = mb.Button;
    createCtx = mb.createCtx;
} catch (e) {
    console.log('[OWNER] messageBuilder not found');
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

// ─── SEND LICE PHOTO ──────────────────────────────────────────────────
async function sendLicePhoto(sock, chatId, imageUrl, quoted) {
    try {
        console.log('[LICE] Preparing image...');
        
        const image = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            { upload: sock.waUploadToServer }
        );

        console.log('[LICE] Image prepared, generating message...');

        const msg = generateWAMessageFromContent(
            chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0,
                        additionalNodes: additionalNodes
                    }
                }
            },
            { quoted }
        );

        console.log('[LICE] Message generated, sending...');

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

// ─── SEND BUTTONS ──────────────────────────────────────────────────────
async function sendButtons(sock, chatId, quoted) {
    if (!Button) {
        console.log('[BUTTONS] Button class not available');
        return false;
    }

    try {
        console.log('[BUTTONS] Sending buttons...');
        
        const text = 
            `👑 *${ownerData.get('NAME')}*\n` +
            `📱 *${ownerData.get('PHONE_1')}*`;

        const button = new Button(sock)
            .setTitle('👑 Owner')
            .setBody(text)
            .setFooter(`⚡ ${ownerData.get('NAME')}`)
            .addCall('📞 Call', `call_${ownerData.get('PHONE_1')}`)
            .addUrl('🌐 Website', ownerData.get('WEBSITE'))
            .addCopy('📧 Email', ownerData.get('EMAIL'))
            .addUrl('🐙 GitHub', ownerData.get('GITHUB'));

        await button.send(chatId, {
            quoted: quoted,
            fallbackText: text,
        });
        
        console.log('[BUTTONS] Buttons sent successfully!');
        return true;
    } catch (error) {
        console.error('[BUTTONS ERROR]', error?.message || error);
        return false;
    }
}

// ─── SEND VCARD ────────────────────────────────────────────────────────
async function sendVCard(sock, chatId, quoted) {
    try {
        console.log('[VCARD] Sending vCard...');
        
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: ownerData.get('NAME'),
                contacts: [{ vcard: buildVCard() }],
            },
        }, { quoted: quoted });
        
        console.log('[VCARD] vCard sent successfully!');
        return true;
    } catch (error) {
        console.error('[VCARD ERROR]', error?.message);
        return false;
    }
}

// ─── SEND PLAIN TEXT (FALLBACK) ──────────────────────────────────────
async function sendPlainText(sock, chatId, quoted) {
    try {
        console.log('[TEXT] Sending plain text fallback...');
        
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
        
        console.log('[TEXT] Plain text sent successfully!');
        return true;
    } catch (error) {
        console.error('[TEXT ERROR]', error?.message);
        return false;
    }
}

// ─── MAIN EXECUTION FUNCTION ──────────────────────────────────────────
async function ownerCommand(sockOrCtx, chatIdParam, msgParam) {
    let sock, chatId, message;

    // Check Kama input ni Context object (ctx) au param za kawaida (sock, chatId, msg)
    if (sockOrCtx && (sockOrCtx.sock || sockOrCtx.core)) {
        sock = sockOrCtx.sock || sockOrCtx.core;
        chatId = sockOrCtx.chatId || sockOrCtx.msg?.key?.remoteJid;
        message = sockOrCtx.msg || sockOrCtx.quoted;
    } else {
        sock = sockOrCtx;
        chatId = chatIdParam;
        message = msgParam;
    }

    try {
        console.log('[OWNER] Executing for:', chatId);
        
        const isPrivate = chatId ? chatId.endsWith('@s.whatsapp.net') : false;
        const randomImage = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];

        // ─── STEP 1: Send VCard (Private only) ────────────────────────────
        if (isPrivate) {
            await sendVCard(sock, chatId, message);
        }

        // ─── STEP 2: Send Lice Photo ──────────────────────────────────────
        await sendLicePhoto(sock, chatId, randomImage, message);

        // ─── STEP 3: Send Buttons ──────────────────────────────────────────
        await sendButtons(sock, chatId, message);

        // ─── STEP 4: Text Backup (after 2 seconds) ────────────────────────
        setTimeout(async () => {
            await sendPlainText(sock, chatId, message);
        }, 2000);

        console.log('[OWNER] Command completed successfully!');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);
        
        try {
            await sendPlainText(sock, chatId, message);
        } catch (e) {
            console.error('[FATAL]', e.message);
        }
    }
}

// ─── EXPORTS (Fixing "is not a function" issue) ───────────────────────
module.exports = {
    name: 'owner',
    aliases: ['creator', 'dev', 'mickdady', 'about', 'developer'],
    category: 'info',
    desc: 'Onyesha taarifa za Owner na mawasiliano yake',
    
    // Njia kuu 3 za ku-execute command kulingana na Handler za tofauti za Bot:
    execute: ownerCommand,
    run: ownerCommand,
    handler: ownerCommand,
    
    // Backup ikiwa bot inaita handler kama function ya moja kwa moja
    ownerCommand: ownerCommand,
    additionalNodes: additionalNodes
};
