const { Button, createCtx } = require('../lib/messageBuilder');

function getAdditionalNodes(feature = 'mixed') {
    const normalizedFeature = String(feature || 'mixed').toLowerCase();

    if (normalizedFeature === 'payment_key_info') {
        return [{
            tag: 'biz',
            attrs: {},
            content: [{
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'payment_key_info' } }],
            }],
        }];
    }

    if (normalizedFeature === 'catalog_message') {
        return [{ tag: 'biz', attrs: { native_flow_name: 'catalog_message' } }];
    }

    if (normalizedFeature === 'poll') {
        return [{ tag: 'meta', attrs: { polltype: 'creation' } }];
    }

    if (normalizedFeature === 'event') {
        return [{ tag: 'meta', attrs: { event_type: 'creation' } }];
    }

    if (normalizedFeature === 'order_details' || normalizedFeature === 'review_pay') {
        return [{ tag: 'biz', attrs: { native_flow_name: 'order_details' } }];
    }

    if (normalizedFeature === 'reply_ai') {
        return [
            { tag: 'bot', attrs: { biz_bot: '1' } },
            { tag: 'biz', attrs: {} },
        ];
    }

    return [{
        tag: 'biz',
        attrs: {},
        content: [{
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
        }],
    }];
}

const ping2Command = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.map(String) : [];
    const featureNames = ['mixed', 'payment_key_info', 'catalog_message', 'poll', 'event', 'order_details', 'review_pay', 'reply_ai'];
    const requestedFeature = input[0]?.toLowerCase();
    const feature = featureNames.includes(requestedFeature) ? requestedFeature : 'mixed';
    const title = (feature === 'mixed' ? input : input.slice(1)).join(' ').trim() || ' MICKEY GLITCH ';

    const bookingPayload = {
        start_datetime: '2026-05-27T13:35:41.081Z',
        end_datetime: '2026-05-27T13:45:41.081Z',
        location: 'TANZANIA',
        booking_url: 'https://mickeypannel.dpdns.org',
        phone_number: '255612130873',
        booking_management_url: 'https://nixel.my.id/',
        description: 'hii~ im Mickey, just quietly observing things around here.',
        email: 'mickidadyhamza@gmail.com',
        display_text: 'MICKDADY HAMZA',
        display_content: {
            display_language: 'id',
            display_meeting_type: 'Mbande Magengeni',
            display_bottom_sheet_header: ' GLITCH INFOR ',
            display_add_to_calendar_cta_text: 'CALENDAR',
            display_view_on_maps_cta_text: 'Mbande Magengeni',
            display_manage_booking_cta_text: '[ DISPLAY MBOOKING ]',
            display_manage_booking_not_supported_text: '[ DISPLAY MB NOT SUPPORT ]',
            display_read_more: '[ READ MORE ]',
        },
    };

    try {
        const button = new Button(ctx.sock || ctx.core);

        button
            .setTitle(title)
            .addButton(feature === 'mixed' ? 'booking_confirmation' : feature, bookingPayload);

        const builtMessage = await button.build(ctx.chatId, { quoted: ctx.msg });
        await (ctx.sock || ctx.core).relayMessage(builtMessage.key.remoteJid, builtMessage.message, {
            messageId: builtMessage.key.id,
            additionalNodes: getAdditionalNodes(feature),
        });
    } catch (error) {
        console.error('ping2Command error:', error?.message || error);
        await ctx.reply(`❌ Imeshindwa kutuma ping2 feature (${feature}). Jaribu tena.`);
    }
};

module.exports = ping2Command;
