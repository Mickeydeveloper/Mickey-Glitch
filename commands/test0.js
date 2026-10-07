const { generateMessageIDV2, proto } = require('@whiskeysockets/baileys');

const json = value => JSON.stringify(value);
const SITE = 'https://github.com/corvaith';

const select = (title, icon, sections) => ({
    name: 'single_select',
    buttonParamsJson: json({ title, sections, icon }),
});

const buttons = [
    { name: 'quick_reply', buttonParamsJson: json({ display_text: 'Quick Reply', id: '.menu' }) },
    { name: 'cta_url', buttonParamsJson: json({ display_text: 'GitHub', url: SITE, merchant_url: SITE }) },
    { name: 'open_webview', buttonParamsJson: json({ title: 'GitHub WebView', link: { in_app_webview: true, url: SITE } }) },
    { name: 'cta_copy', buttonParamsJson: json({ display_text: 'Copy Code', copy_code: 'corvaith' }) },
    { name: 'cta_call', buttonParamsJson: json({ display_text: 'Call Owner', phone_number: '6285719563093' }) },
    { name: 'cta_reminder', buttonParamsJson: json({ display_text: 'Remind Me' }) },
    { name: 'cta_cancel_reminder', buttonParamsJson: json({ display_text: 'Cancel Reminder' }) },
    { name: 'send_location', buttonParamsJson: '{}' },
    { name: 'address_message', buttonParamsJson: '{}' },
    { name: 'mpm', buttonParamsJson: json({ product_id: '8816262248471474' }) },
    { name: 'wa_payment_transaction_details', buttonParamsJson: json({ transaction_id: '12345848' }) },
    {
        name: 'automated_greeting_message_view_catalog',
        buttonParamsJson: json({ business_phone_number: '6285719563093', catalog_product_id: '8816262248471474' }),
    },
    select('Select Default', 'DEFAULT', [{
        title: 'Main',
        highlight_label: 'Menu',
        rows: [
            { header: 'BOT', title: 'Menu', description: 'Show all commands', id: '.menu' },
            { header: 'BOT', title: 'Ping', description: 'Check bot speed', id: '.ping' },
        ],
    }]),
    select('Select Review', 'REVIEW', [{
        title: 'Utility',
        highlight_label: 'Tools',
        rows: [
            { header: 'TOOLS', title: 'Ping', description: 'Check bot speed', id: '.ping' },
            { header: 'TOOLS', title: 'Info', description: 'Bot runtime info', id: '.info' },
        ],
    }]),
    select('Select Promo', 'PROMOTION', [{
        title: 'Promotion',
        highlight_label: 'Promo',
        rows: [
            { header: 'PROMO', title: 'Promo', description: 'Show promotion', id: '.promo' },
            { header: 'PROMO', title: 'Claim', description: 'Claim promotion', id: '.claim' },
        ],
    }]),
    select('Select Document', 'DOCUMENT', [{
        title: 'Document',
        highlight_label: 'Docs',
        rows: [
            { header: 'DOCS', title: 'Docs', description: 'Show documentation', id: '.help' },
            { header: 'DOCS', title: 'Guide', description: 'Show guide', id: '.help' },
        ],
    }]),
];

async function test0(sock, chatId, message) {
    try {
        const interactiveMessage = proto.Message.InteractiveMessage.create({
            header: proto.Message.InteractiveMessage.Header.create({
                title: 'All Buttons Demo',
                subtitle: 'every native-flow type',
            }),
            body: proto.Message.InteractiveMessage.Body.create({
                text: 'Every button type this client supports.\nNote: catalog / payment / greeting flows use demo IDs; the targets are placeholders.',
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: 'whatsapp-bot' }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons,
                messageParamsJson: json({
                    limited_time_offer: {
                        text: 'Latest version',
                        url: SITE,
                        copy_code: 'corvaith',
                        expiration_time: 4102444800000,
                    },
                }),
                messageVersion: 1,
            }),
        });

        await sock.relayMessage(chatId, { interactiveMessage }, {
            messageId: generateMessageIDV2(sock.user?.id),
            additionalNodes: [{
                tag: 'biz',
                attrs: {},
                content: [{
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                }],
            }],
        });
    } catch (error) {
        console.error('[TEST0] Failed to send native-flow demo:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma native-flow button demo. Hakikisha toleo la Baileys linaunga mkono button hizi.',
        }, { quoted: message });
    }
}

test0.description = 'Tuma demo ya native-flow button types zinazoungwa mkono na client.';
test0.category = 'EXPERIMENTAL';

module.exports = test0;