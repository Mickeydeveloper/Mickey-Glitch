/**
 * owner.js - Owner Profile with Review & Pay Node
 * Usage: .owner
 */

const { Button, createCtx } = require('../lib/messageBuilder');

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

// ─── REVIEW & PAY ADDITIONAL NODE (From Pastebin) ──────────────────────
const REVIEW_AND_PAY_NODE = {
    tag: 'biz',
    attrs: {
        native_flow_name: 'order_details'
    }
};

// ─── MAIN OWNER COMMAND ──────────────────────────────────────────────────
async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);

        // ─── RANDOM IMAGE ──────────────────────────────────────────────────
        const randomImage = CONFIG.IMAGES[Math.floor(Math.random() * CONFIG.IMAGES.length)];

        // ─── BUILD PROFILE TEXT ──────────────────────────────────────────
        const profileText = 
            `👑 *OWNER PROFILE*\n\n` +
            `👤 *Name:* ${CONFIG.OWNER.NAME}\n` +
            `💼 *Title:* ${CONFIG.OWNER.TITLE}\n` +
            `📍 *Location:* ${CONFIG.OWNER.LOCATION}\n` +
            `📧 *Email:* ${CONFIG.OWNER.EMAIL}\n\n` +
            `📱 *Contacts:*\n` +
            `├ ${CONFIG.OWNER.PHONE_1}\n` +
            `└ ${CONFIG.OWNER.PHONE_2}\n\n` +
            `🔗 *Links:*\n` +
            `├ GitHub: ${CONFIG.OWNER.GITHUB}\n` +
            `└ Website: ${CONFIG.OWNER.WEBSITE}\n\n` +
            `> ⚡ Mickey Glitch Technology`;

        // ─── SEND IMAGE WITH CAPTION ──────────────────────────────────────
        await sock.sendMessage(chatId, {
            image: { url: randomImage },
            caption: profileText
        }, { quoted: message });

        // ─── CREATE REVIEW & PAY BUTTON ──────────────────────────────────
        const button = new Button(sock)
            .setTitle('💳 Contact Options')
            .setSubtitle(CONFIG.OWNER.NAME)
            .setBody(
                `📋 *Contact ${CONFIG.OWNER.NAME}*\n\n` +
                `📱 Phone 1: ${CONFIG.OWNER.PHONE_1}\n` +
                `📱 Phone 2: ${CONFIG.OWNER.PHONE_2}\n` +
                `🌐 Website: ${CONFIG.OWNER.WEBSITE}\n` +
                `🐙 GitHub: ${CONFIG.OWNER.GITHUB}\n\n` +
                `💡 Click the button below to contact the owner`
            )
            .setFooter(`⚡ ${CONFIG.OWNER.NAME} | ${new Date().toLocaleDateString()}`)

            // ─── REVIEW & PAY BUTTON ──────────────────────────────────────
            .addButton('review_and_pay', {
                "currency": "TZS",
                "total_amount": {
                    "value": 1000000,
                    "offset": 100
                },
                "reference_id": `OWNER-${Date.now()}`,
                "order_request_id": `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                "type": "digital-goods",
                "payment_status": "pending",
                "payment_timestamp": Math.floor(Date.now() / 1000),
                "order": {
                    "status": "pending",
                    "description": `Contact ${CONFIG.OWNER.NAME}`,
                    "subtotal": {
                        "value": 1000000,
                        "offset": 100
                    },
                    "tax": {
                        "value": 180000,
                        "offset": 100
                    },
                    "discount": {
                        "value": 0,
                        "offset": 100
                    },
                    "shipping": {
                        "value": 0,
                        "offset": 100
                    },
                    "order_type": "CONTACT",
                    "items": [{
                        "retailer_id": "OWNER-001",
                        "name": `Contact ${CONFIG.OWNER.NAME}`,
                        "amount": {
                            "value": 1000000,
                            "offset": 100
                        },
                        "quantity": 1
                    }]
                },
                "additional_note": `📞 Contact: ${CONFIG.OWNER.PHONE_1} | ${CONFIG.OWNER.PHONE_2}`,
                "native_payment_methods": [
                    `{"name":"📞 Call ${CONFIG.OWNER.PHONE_1}","enabled":true}`,
                    `{"name":"📞 Call ${CONFIG.OWNER.PHONE_2}","enabled":true}`,
                    `{"name":"🌐 ${CONFIG.OWNER.WEBSITE}","enabled":true}`,
                    `{"name":"🐙 ${CONFIG.OWNER.GITHUB}","enabled":true}`
                ],
                "share_payment_status": true,
                "is_soft_deleted": false
            });

        // ─── SEND WITH REVIEW & PAY ADDITIONAL NODE ──────────────────────
        await button.send(chatId, {
            quoted: message,
            additionalNodes: [REVIEW_AND_PAY_NODE],
            fallbackText: 
                `👑 *${CONFIG.OWNER.NAME}*\n\n` +
                `📱 ${CONFIG.OWNER.PHONE_1}\n` +
                `📱 ${CONFIG.OWNER.PHONE_2}\n` +
                `🌐 ${CONFIG.OWNER.WEBSITE}\n` +
                `🐙 ${CONFIG.OWNER.GITHUB}`
        });

        console.log('[OWNER] Profile sent with Review & Pay node');

    } catch (error) {
        console.error('[OWNER ERROR]', error?.message || error);

        // ─── FALLBACK: Send without review & pay ──────────────────────────
        try {
            const ctx = createCtx(sock, chatId, message);
            
            const fallbackText = 
                `👑 *${CONFIG.OWNER.NAME}*\n\n` +
                `📱 ${CONFIG.OWNER.PHONE_1}\n` +
                `📱 ${CONFIG.OWNER.PHONE_2}\n` +
                `🌐 ${CONFIG.OWNER.WEBSITE}\n` +
                `🐙 ${CONFIG.OWNER.GITHUB}\n\n` +
                `> ⚡ Mickey Glitch Sub`;

            await ctx.reply(fallbackText);
        } catch (e) {
            console.error('[OWNER FATAL]', e.message);
        }
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'mickdady', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;