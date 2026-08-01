/**
 * owner.js - Owner Profile with Multiple Buttons + Review & Pay
 */

const { Button, ButtonV2, createCtx } = require('../lib/messageBuilder');

const CONFIG = {
    OWNER: {
        NAME: 'Mickdady',
        TITLE: 'Base Developer',
        LOCATION: 'Tanzania 🇹🇿',
        PHONE_1: '255615944741',
        PHONE_2: '255612130873',
        WEBSITE: 'https://mickey-glitch.vercel.app',
        GITHUB: 'https://github.com/Mickeydeveloper'
    },
    IMAGES: [
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg'
    ]
};

const REVIEW_AND_PAY_NODE = {
    tag: 'biz',
    attrs: {
        native_flow_name: 'order_details'
    }
};

async function ownerCommand(sock, chatId, message) {
    try {
        const ctx = createCtx(sock, chatId, message);
        const randomImage = CONFIG.IMAGES[0];

        const profileText = 
            `👑 *OWNER PROFILE*\n\n` +
            `👤 ${CONFIG.OWNER.NAME}\n` +
            `💼 ${CONFIG.OWNER.TITLE}\n` +
            `📍 ${CONFIG.OWNER.LOCATION}\n\n` +
            `📱 ${CONFIG.OWNER.PHONE_1}\n` +
            `📱 ${CONFIG.OWNER.PHONE_2}\n\n` +
            `🔗 ${CONFIG.OWNER.WEBSITE}\n` +
            `🔗 ${CONFIG.OWNER.GITHUB}\n\n` +
            `> ⚡ Mickey Glitch Sub`;

        await sock.sendMessage(chatId, {
            image: { url: randomImage },
            caption: profileText
        }, { quoted: message });

        // ─── BUTTON V2 WITH REVIEW & PAY ──────────────────────────────────
        try {
            const button = new ButtonV2(sock)
                .setTitle('📋 Contact Options')
                .setBody(
                    `*Choose how to contact ${CONFIG.OWNER.NAME}:*\n\n` +
                    `📞 Call\n` +
                    `📋 Copy\n` +
                    `🌐 Website\n` +
                    `🐙 GitHub\n` +
                    `💬 Chat`
                )
                .setFooter(`⚡ ${CONFIG.OWNER.NAME}`)
                .setThumbnail(randomImage)
                
                // ─── CALL BUTTONS ──────────────────────────────────────────
                .addButton({
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`,
                        id: `call_1`
                    })
                })
                .addButton({
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: `📞 Call ${CONFIG.OWNER.PHONE_2}`,
                        id: `call_2`
                    })
                })
                
                // ─── COPY BUTTONS ──────────────────────────────────────────
                .addButton({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Line 1',
                        copy_code: CONFIG.OWNER.PHONE_1,
                        id: 'copy_1'
                    })
                })
                .addButton({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Line 2',
                        copy_code: CONFIG.OWNER.PHONE_2,
                        id: 'copy_2'
                    })
                })
                
                // ─── URL BUTTONS ──────────────────────────────────────────
                .addButton({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 Website',
                        url: CONFIG.OWNER.WEBSITE,
                        webview_interaction: false
                    })
                })
                .addButton({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🐙 GitHub',
                        url: CONFIG.OWNER.GITHUB,
                        webview_interaction: false
                    })
                })
                
                // ─── REVIEW & PAY BUTTON ──────────────────────────────────
                .addButton({
                    name: 'review_and_pay',
                    buttonParamsJson: JSON.stringify({
                        "currency": "TZS",
                        "total_amount": {
                            "value": 1000000,
                            "offset": 100
                        },
                        "reference_id": `OWNER-${Date.now()}`,
                        "order_request_id": `ORD-${Date.now()}`,
                        "type": "digital-goods",
                        "payment_status": "pending",
                        "order": {
                            "status": "pending",
                            "description": `Contact ${CONFIG.OWNER.NAME}`,
                            "subtotal": {
                                "value": 1000000,
                                "offset": 100
                            },
                            "tax": {
                                "value": 0,
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
                        "additional_note": `📞 ${CONFIG.OWNER.PHONE_1}`,
                        "native_payment_methods": [
                            `{"name":"📞 Call ${CONFIG.OWNER.PHONE_1}","enabled":true}`,
                            `{"name":"📞 Call ${CONFIG.OWNER.PHONE_2}","enabled":true}`
                        ],
                        "share_payment_status": true,
                        "is_soft_deleted": false
                    })
                })
                
                // ─── QUICK REPLY ──────────────────────────────────────────
                .addButton({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💬 Chat Owner',
                        id: 'chat_owner'
                    })
                });

            await button.send(chatId, {
                quoted: message,
                additionalNodes: [REVIEW_AND_PAY_NODE],
                fallbackText: `📞 ${CONFIG.OWNER.PHONE_1}`
            });

            console.log('[OWNER] Sent with Review & Pay node');
            return;

        } catch (buttonError) {
            console.error('[BUTTON ERROR]', buttonError.message);
        }

        // ─── FALLBACK ──────────────────────────────────────────────────────
        await ctx.reply(`📞 ${CONFIG.OWNER.PHONE_1}\n📞 ${CONFIG.OWNER.PHONE_2}`);

    } catch (error) {
        console.error('[OWNER ERROR]', error.message);
        const ctx = createCtx(sock, chatId, message);
        await ctx.reply(`❌ Error: ${error.message}`);
    }
}

module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;