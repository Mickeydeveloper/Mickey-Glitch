const { AIRich } = require('../lib/messageBuilder');

const appointments = new Map();

function createCalendarUrl(appointment) {
    const start = new Date(appointment.date);
    start.setHours(7, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const format = (value) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(appointment.title)}&dates=${format(start)}/${format(end)}&details=${encodeURIComponent('Created by Mickey AI Calendar')}`;
}

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
    const inputArgs = Array.isArray(args) ? args.map((arg) => String(arg).trim()).filter(Boolean) : [];
    const action = inputArgs[0]?.toLowerCase();
    const title = action === 'confirm' || action === 'cancel'
        ? appointments.get(chatId)?.title || 'Mickey AI Appointment'
        : inputArgs.join(' ') || 'Mickey AI Appointment';
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

    if (action === 'confirm' || action === 'cancel') {
        const appointment = appointments.get(chatId);
        if (!appointment) {
            const text = '📅 Hakuna appointment inayosubiri confirmation. Tumia `.aicalendar <jina la appointment>` kwanza.';
            if (typeof reply === 'function') return reply(text);
            return sock.sendMessage(chatId, { text }, { quoted: msg });
        }

        if (action === 'cancel') {
            appointments.delete(chatId);
            const text = `❌ Appointment *${appointment.title}* imefutwa.`;
            if (typeof reply === 'function') return reply(text);
            return sock.sendMessage(chatId, { text }, { quoted: msg });
        }

        appointment.status = 'Confirmed';
        const text = `✅ Appointment *${appointment.title}* imethibitishwa.\n\n🔗 Ongeza kwenye Google Calendar:\n${createCalendarUrl(appointment)}`;
        if (typeof reply === 'function') return reply(text);
        return sock.sendMessage(chatId, { text }, { quoted: msg });
    }

    const appointment = {
        title,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'Pending confirmation',
    };
    appointments.set(chatId, appointment);

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
                        id: '.aicalendar confirm',
                        kind: 'CONFIRM',
                        state: 'PENDING',
                        toast: { label: 'Appointment confirmed' },
                    },
                    {
                        label: 'Cancel appointment',
                        id: '.aicalendar cancel',
                        kind: 'CANCEL',
                        state: 'PENDING',
                        toast: { label: 'Appointment cancelled' },
                    },
                ],
            })
            .addFooterAction({
                text: 'View calendar',
                type: 'OPEN_URL',
                url: createCalendarUrl(appointment),
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
