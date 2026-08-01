/**
 * owner.js - Owner Profile with Interactive Buttons
 * Uses ButtonV2, AIRich, and Native Flow
 * Creator: Mickdady
 */

const os = require('os');
const axios = require('axios');
const { ButtonV2, AIRich, Button, createCtx, Toolkit } = require('../lib/messageBuilder');

// ==============================================
// 👑 OWNER INFO CONFIG
// ==============================================
const CONFIG = {
    FOOTER: '👑 Mickey Glitch Technology',
    OWNER: {
        NAME: 'Mickdady',
        TITLE: 'Base Developer & Founder',
        LOCATION: 'Tanzania 🇹🇿',
        PHONE_1: '0615944741',
        PHONE_2: '0612130873',
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

// ==============================================
// MAIN OWNER COMMAND
// ==============================================
const ownerCommand = async (sock, chatId, message) => {
    try {
        // ─── CREATE CTX ──────────────────────────────────────────────────
        const ctx = createCtx(sock, chatId, message);
        const senderId = message?.key?.participant || message?.key?.remoteJid || chatId;

        console.log('[OWNER] Invoked by:', senderId);

        // ─── RANDOM IMAGE ──────────────────────────────────────────────────
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // ─── BUILD PROFILE TEXT ──────────────────────────────────────────
        const profileText = 
            `╭━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `│ 👑 *OWNER PROFILE*\n` +
            `│━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `│\n` +
            `│ 👤 *Name:* ${CONFIG.OWNER.NAME}\n` +
            `│ 💼 *Title:* ${CONFIG.OWNER.TITLE}\n` +
            `│ 📍 *Location:* ${CONFIG.OWNER.LOCATION}\n` +
            `│ 📧 *Email:* ${CONFIG.OWNER.EMAIL}\n` +
            `│\n` +
            `│ 📱 *Contacts:*\n` +
            `│ ├ Line 1: ${CONFIG.OWNER.PHONE_1}\n` +
            `│ └ Line 2: ${CONFIG.OWNER.PHONE_2}\n` +
            `│\n` +
            `│ 🔗 *Links:*\n` +
            `│ ├ GitHub: ${CONFIG.OWNER.GITHUB}\n` +
            `│ └ Website: ${CONFIG.OWNER.WEBSITE}\n` +
            `│\n` +
            `│ 🤖 *Mickey Glitch Engine*\n` +
            `│ └ Version: 4.6\n` +
            `│\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `> ⚡ ${CONFIG.FOOTER}`;

        // ─── TRY BUTTONV2 FIRST ──────────────────────────────────────────
        try {
            await sendWithButtonV2(sock, chatId, message, profileText, randomImage);
            console.log('[OWNER] Sent with ButtonV2');
            return;
        } catch (buttonV2Error) {
            console.error('[BUTTONV2 ERROR]', buttonV2Error.message);
        }

        // ─── FALLBACK: BUTTON (V1) ──────────────────────────────────────
        try {
            await sendWithButtonV1(sock, chatId, message, profileText, randomImage);
            console.log('[OWNER] Sent with Button V1');
            return;
        } catch (buttonV1Error) {
            console.error('[BUTTON V1 ERROR]', buttonV1Error.message);
        }

        // ─── FINAL FALLBACK: PLAIN TEXT ──────────────────────────────────
        await ctx.reply(profileText);
        console.log('[OWNER] Sent with Plain Text');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);

        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply(`❌ *System Error:*\n${error.message || 'Unknown error'}`);
        } catch (e) {
            console.error('[OWNER FATAL]', e.message);
        }
    }
};

// ─── SEND WITH BUTTONV2 ────────────────────────────────────────────────────
async function sendWithButtonV2(sock, chatId, message, profileText, imageUrl) {
    const button = new ButtonV2(sock)
        .setTitle('👑 Owner Profile')
        .setSubtitle(CONFIG.OWNER.NAME)
        .setBody(profileText)
        .setFooter(`⚡ ${CONFIG.FOOTER}`)
        .setThumbnail(imageUrl)
        
        // ─── CALL BUTTONS ──────────────────────────────────────────────────
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
        
        // ─── URL BUTTONS ──────────────────────────────────────────────────
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
        
        // ─── COPY BUTTON ──────────────────────────────────────────────────
        .addButton({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: '📋 Copy Number',
                copy_code: CONFIG.OWNER.PHONE_1,
                id: 'copy_phone'
            })
        })
        
        // ─── QUICK REPLY ──────────────────────────────────────────────────
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
}

// ─── SEND WITH BUTTON V1 ──────────────────────────────────────────────────
async function sendWithButtonV1(sock, chatId, message, profileText, imageUrl) {
    const button = new Button(sock)
        .setTitle('👑 Owner Profile')
        .setBody(profileText)
        .setFooter(`⚡ ${CONFIG.FOOTER}`)
        .setImage(imageUrl)
        
        // ─── CALL BUTTONS ──────────────────────────────────────────────────
        .addCall(`📞 Call ${CONFIG.OWNER.PHONE_1}`, `call_${CONFIG.OWNER.PHONE_1}`)
        .addCall(`📞 Call ${CONFIG.OWNER.PHONE_2}`, `call_${CONFIG.OWNER.PHONE_2}`)
        
        // ─── URL BUTTONS ──────────────────────────────────────────────────
        .addUrl('🌐 GitHub', CONFIG.OWNER.GITHUB, false)
        .addUrl('🌐 Website', CONFIG.OWNER.WEBSITE, false)
        
        // ─── COPY BUTTON ──────────────────────────────────────────────────
        .addCopy('📋 Copy Number', CONFIG.OWNER.PHONE_1)
        
        // ─── REPLY BUTTON ──────────────────────────────────────────────────
        .addReply('💬 Chat Owner', 'chat_owner');

    await button.send(chatId, {
        quoted: message,
        fallbackText: profileText
    });
}

// ─── SEND WITH AIRICH ────────────────────────────────────────────────────
async function sendWithAIRich(sock, chatId, message, profileText, imageUrl) {
    const rich = new AIRich(sock)
        .setTitle('👑 Owner Profile')
        .setBody(`📋 *${CONFIG.OWNER.NAME} - ${CONFIG.OWNER.TITLE}*`)
        .addText(
            `👤 **Name:** ${CONFIG.OWNER.NAME}\n` +
            `💼 **Title:** ${CONFIG.OWNER.TITLE}\n` +
            `📍 **Location:** ${CONFIG.OWNER.LOCATION}\n` +
            `📧 **Email:** ${CONFIG.OWNER.EMAIL}\n\n` +
            `📱 **Contacts:**\n` +
            `├ ${CONFIG.OWNER.PHONE_1}\n` +
            `└ ${CONFIG.OWNER.PHONE_2}`
        )
        .addTable([
            ['📊 Metric', '📌 Value'],
            ['━━━━━━━━', '━━━━━━━━'],
            ['Name', CONFIG.OWNER.NAME],
            ['Title', CONFIG.OWNER.TITLE],
            ['Location', CONFIG.OWNER.LOCATION],
            ['Phone 1', CONFIG.OWNER.PHONE_1],
            ['Phone 2', CONFIG.OWNER.PHONE_2]
        ])
        .addTip('💡 Click buttons below to interact')
        .addSuggest([
            'Contact owner',
            'Visit website',
            'View GitHub'
        ]);

    await rich.send(chatId, {
        quoted: message,
        forwarded: false,
        notification: false,
        fallbackText: profileText
    });
}

// ─── SEND WITH NATIVE FLOW (BEST) ──────────────────────────────────────
async function sendWithNativeFlow(sock, chatId, message, profileText, imageUrl) {
    const button = new ButtonV2(sock)
        .setTitle('👑 Owner Profile')
        .setSubtitle(CONFIG.OWNER.NAME)
        .setBody(profileText)
        .setFooter(`⚡ ${CONFIG.FOOTER}`)
        .setThumbnail(imageUrl)
        .addSelection('📋 Contact Options', {
            title: 'Choose Contact Method',
            sections: [
                {
                    title: '📱 Phone',
                    highlight_label: 'Call',
                    rows: [
                        {
                            header: '📞',
                            title: `Call ${CONFIG.OWNER.PHONE_1}`,
                            description: 'Primary contact',
                            id: `call_${CONFIG.OWNER.PHONE_1}`
                        },
                        {
                            header: '📞',
                            title: `Call ${CONFIG.OWNER.PHONE_2}`,
                            description: 'Secondary contact',
                            id: `call_${CONFIG.OWNER.PHONE_2}`
                        }
                    ]
                },
                {
                    title: '🌐 Online',
                    highlight_label: 'Visit',
                    rows: [
                        {
                            header: '🌐',
                            title: 'GitHub',
                            description: 'View code',
                            id: 'visit_github'
                        },
                        {
                            header: '🌐',
                            title: 'Website',
                            description: 'Official website',
                            id: 'visit_website'
                        }
                    ]
                }
            ]
        })
        .addReply('💬 Chat Owner', 'chat_owner')
        .addCopy('📋 Copy Number', CONFIG.OWNER.PHONE_1);

    await button.send(chatId, {
        quoted: message,
        fallbackText: profileText,
        additionalNodes: [{
            tag: 'biz',
            attrs: {},
            content: [{
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{
                    tag: 'native_flow',
                    attrs: { v: '9', name: 'mixed' }
                }]
            }]
        }]
    });
}

module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;