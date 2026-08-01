"use strict";

const { Button, createCtx } = require('../lib/messageBuilder');

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
    IMAGE: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg'
};

// Native flow node used to surface payment_key_info in clients that support it
const NATIVE_FLOW_NODE = {
    tag: 'biz',
    attrs: {},
    content: [
        {
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [
                { tag: 'native_flow', attrs: { name: 'payment_key_info' } }
            ]
        }
    ]
};

async function ownerCommand(sock, chatId, message) {
    const ctx = createCtx(sock, chatId, message);

    try {
        const profileText = [
            `👑 OWNER PROFILE`,
            `👤 ${CONFIG.OWNER.NAME}`,
            `💼 ${CONFIG.OWNER.TITLE}`,
            `📍 ${CONFIG.OWNER.LOCATION}`,
            ``,
            `📱 ${CONFIG.OWNER.PHONE_1}`,
            `📱 ${CONFIG.OWNER.PHONE_2}`,
            ``,
            `🔗 ${CONFIG.OWNER.WEBSITE}`,
            `🔗 ${CONFIG.OWNER.GITHUB}`
        ].join('\n');

        // Build a single interactive message using the messageBuilder Button helper
        const button = new Button(sock)
            .setTitle('📋 Contact Options')
            .setBody(profileText)
            .setFooter(`⚡ ${CONFIG.OWNER.NAME}`)
            .setImage(CONFIG.IMAGE)

            // Call buttons
            .addButton('cta_call', { display_text: `📞 Call ${CONFIG.OWNER.PHONE_1}`, id: 'call_1' })
            .addButton('cta_call', { display_text: `📞 Call ${CONFIG.OWNER.PHONE_2}`, id: 'call_2' })

            // Copy buttons
            .addButton('cta_copy', { display_text: '📋 Copy Line 1', copy_code: CONFIG.OWNER.PHONE_1, id: 'copy_1' })
            .addButton('cta_copy', { display_text: '📋 Copy Line 2', copy_code: CONFIG.OWNER.PHONE_2, id: 'copy_2' })

            // URLs
            .addButton('cta_url', { display_text: '🌐 Website', url: CONFIG.OWNER.WEBSITE, webview_interaction: false })
            .addButton('cta_url', { display_text: '🐙 GitHub', url: CONFIG.OWNER.GITHUB, webview_interaction: false })

            // Payment / native flow button — payload follows requested structure
            .addButton('payment_key_info', {
                currency: 'IDR',
                total_amount: { value: 0, offset: 100 },
                reference_id: '4V9BSF0BT66',
                type: 'physical-goods',
                order: {
                    status: 'pending',
                    subtotal: { value: 0, offset: 100 },
                    order_type: 'ORDER',
                    items: [ { name: '', amount: { value: 0, offset: 100 }, quantity: 0, sale_amount: { value: 0, offset: 100 } } ]
                },
                payment_settings: [ { type: 'payment_key', payment_key: { type: 'IDPAYMENTACCOUNT', key: '124012401001', name: 'Bank CIMB Niaga', institution_name: 'Bank CIMB Niaga', full_name_on_account: 'Nixel' } } ],
                share_payment_status: false,
                is_soft_deleted: false,
                referral: 'quick_reply'
            })

            // Quick reply
            .addButton('quick_reply', { display_text: '💬 Chat Owner', id: 'chat_owner' });

        await button.send(chatId, {
            quoted: message,
            additionalNodes: [NATIVE_FLOW_NODE],
            fallbackText: `📞 ${CONFIG.OWNER.PHONE_1}`
        });

        return;
    } catch (err) {
        console.error('[OWNER ERROR]', err);
        await ctx.reply(`❌ Error: ${err?.message || err}`);
    }
}

module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.aliases = ['creator', 'dev', 'about'];
module.exports.category = 'info';
module.exports.default = ownerCommand;
module.exports.handler = ownerCommand;
