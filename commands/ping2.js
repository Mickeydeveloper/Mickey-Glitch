const { Button, createCtx } = require('../lib/messageBuilder');

const ping2Command = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const title = args && args.length ? args.join(' ') : ' MICKEY GLITCH ';

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
            .addButton('booking_confirmation', bookingPayload);

        await button.send(ctx.chatId, {
            quoted: ctx.msg,
            fallbackText: 'Booking confirmation payload sent.',
        });
    } catch (error) {
        console.error('ping2Command error:', error?.message || error);
        await ctx.reply('❌ Ilifanya hitilafu kutuma booking confirmation. Jaribu tena.');
    }
};

module.exports = ping2Command;
