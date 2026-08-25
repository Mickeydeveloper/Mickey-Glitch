const { AIRich } = require('../lib/messageBuilder');

function getContext(sockOrCtx, chatIdParam, msgParam, argsParam) {
    if (sockOrCtx && (sockOrCtx.sock || sockOrCtx.core)) {
        return {
            sock: sockOrCtx.sock || sockOrCtx.core,
            chatId: sockOrCtx.chatId || sockOrCtx.msg?.key?.remoteJid,
            msg: sockOrCtx.msg || sockOrCtx.quoted,
            args: sockOrCtx.args || [],
            reply: sockOrCtx.reply,
        };
    }

    return {
        sock: sockOrCtx,
        chatId: chatIdParam,
        msg: msgParam,
        args: argsParam || [],
    };
}

async function aiCalendarCommand(sockOrCtx, chatIdParam, msgParam, argsParam) {
    const { sock, chatId, msg, args, reply } = getContext(
        sockOrCtx,
        chatIdParam,
        msgParam,
        argsParam,
    );
    const title = Array.isArray(args) && args.length
        ? args.join(' ')
        : 'Mickey AI Appointment';
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateLabel = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Dar_es_Salaam',
    });

    if (!sock || !chatId) {
        throw new Error('Chat context is required');
    }

    try {
        const builder = new AIRich(sock)
            .setTitle('MICKEY AI CALENDAR')
            .setBody(`Appointment: ${title}`)
            .setFooter('Choose an action below')
            .addText(`📅 *${title}*\n\nDate: ${dateLabel}\nTime: 10:00 AM\nTimezone: East Africa Time`)
            .addWidget({
                title,
                sections: [
                    {
                        title: 'Appointment details',
                        items: [
                            { label: 'Date', value: dateLabel },
                            { label: 'Time', value: '10:00 AM EAT' },
                            { label: 'Status', value: 'Pending confirmation' },
                        ],
                    },
                ],
                actions: [
                    {
                        label: 'Confirm appointment',
                        id: 'calendar_confirm',
                        kind: 'CONFIRM',
                        state: 'PENDING',
                        toast: { label: 'Appointment confirmed' },
                    },
                    {
                        label: 'Cancel appointment',
                        id: 'calendar_cancel',
                        kind: 'CANCEL',
                        state: 'PENDING',
                        toast: { label: 'Appointment cancelled' },
                    },
                ],
            })
            .addFooterAction({
                text: 'View calendar',
                type: 'OPEN_URL',
                url: 'https://calendar.google.com',
            });

        await builder.send(chatId, { quoted: msg });
    } catch (error) {
        console.error('AI Calendar Error:', error.message);
        const fallback = `📅 *${title}*\n\nDate: ${dateLabel}\nTime: 10:00 AM EAT\n\nReply with *confirm* or *cancel*.`;
        if (typeof reply === 'function') return reply(fallback);
        return sock.sendMessage(chatId, { text: fallback }, { quoted: msg });
    }
}

module.exports = {
    name: 'aicalendar',
    aliases: ['calendar', 'event'],
    category: 'ai',
    desc: 'AI calendar event with interactive confirmation buttons',
    execute: aiCalendarCommand,
    run: aiCalendarCommand,
    handler: aiCalendarCommand,
};
