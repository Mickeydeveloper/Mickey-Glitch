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

        // ─── BUTTON WITH REVIEW & PAY ──────────────────────────────────
        try {
            const button = new Button(sock)
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
                .addButton('cta_call', {
                    display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`,
                    id: 'call_1'
                })
                .addButton('cta_call', {
                    display_text: `📞 Call ${CONFIG.OWNER.PHONE_2}`,
                    id: 'call_2'
                })
                .addButton('cta_copy', {
                    display_text: '📋 Copy Line 1',
                    copy_code: CONFIG.OWNER.PHONE_1,
                    id: 'copy_1'
                })
                .addButton('cta_copy', {
                    display_text: '📋 Copy Line 2',
                    copy_code: CONFIG.OWNER.PHONE_2,
                    id: 'copy_2'
                })
                .addButton('cta_url', {
                    display_text: '🌐 Website',
                    url: CONFIG.OWNER.WEBSITE,
                    webview_interaction: false
                })
                .addButton('cta_url', {
                    display_text: '🐙 GitHub',
                    url: CONFIG.OWNER.GITHUB,
                    webview_interaction: false
                })
                .addButton('review_and_pay', JSON.stringify({
                    currency: 'TZS',
                    payment_configuration: '',
                    payment_type: '',
                    transaction_id: '',
                    total_amount: { value: 1000000, offset: 100 },
                    reference_id: `OWNER-${Date.now()}`,
                    order_request_id: `ORD-${Date.now()}`,
                    type: 'digital-goods',
                    payment_method: '',
                    payment_status: 'pending',
                    payment_timestamp: Date.now(),
                    order: {
                        status: 'pending',
                        description: `Contact ${CONFIG.OWNER.NAME}`,
                        subtotal: { value: 1000000, offset: 100 },
                        tax: { value: 0, offset: 100 },
                        discount: { value: 0, offset: 100 },
                        shipping: { value: 0, offset: 100 },
                        order_type: 'ORDER',
                        items: [{
                            retailer_id: 'OWNER-001',
                            name: `Contact ${CONFIG.OWNER.NAME}`,
                            amount: { value: 1000000, offset: 100 },
                            quantity: 1
                        }]
                    },
                    additional_note: `📞 ${CONFIG.OWNER.PHONE_1}`,
                    native_payment_methods: [
                        '{"name":"PIX","enabled":false}'
                    ],
                    share_payment_status: true,
                    is_soft_deleted: false
                }))
                .addButton('quick_reply', {
                    display_text: '💬 Chat Owner',
                    id: 'chat_owner'
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