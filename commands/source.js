const { generateMessageSourceCode, ButtonV2, AIRich, createCtx } = require('../lib/messageBuilder');

const defaultActions = [
    { label: '📦 Menu', id: '.menu' },
    { label: '🏓 Ping', id: '.ping' },
    { label: '🧠 AI', id: '.ai' },
    { label: '📊 Stats', id: '.stats' },
    { label: '📂 Repo', id: '.repo' },
    { label: '👑 Owner', id: '.owner' },
];

const sourceCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    const parts = input ? input.split('|').map((part) => part.trim()).filter(Boolean) : [];
    const [title, subtitle, body, footer, ...buttonEntries] = parts;

    const buttons = buttonEntries.length
        ? buttonEntries.map((entry) => {
            const [label, id] = entry.split(',').map((item) => item.trim()).filter(Boolean);
            return { label: label || 'Button', id: id ? (id.startsWith('.') ? id : `.${id}`) : '.menu' };
        })
        : defaultActions;

    const buttonTitle = title || '🧩 MessageBuilder';
    const buttonSubtitle = subtitle || 'Tap a button to run a bot function';
    const buttonBody = body || 'Hii ni mfano wa interactive message kutoka MessageBuilder';
    const buttonFooter = footer || 'MICKEY BOT';

    try {
        const buttonBuilder = new ButtonV2(sock)
            .setTitle(buttonTitle)
            .setSubtitle(buttonSubtitle)
            .setBody(buttonBody)
            .setFooter(buttonFooter);

        buttons.forEach((button) => buttonBuilder.addButton(button.label, button.id));

        await buttonBuilder.send(ctx.chatId, { quoted: ctx._msg, fallbackText: `${buttonTitle}\n${buttonSubtitle}\n\n${buttonBody}` });

        const richBuilder = new AIRich(sock)
            .setTitle('🧠 AIRich Demo')
            .setFooter(buttonFooter)
            .addText(`Hii ni mfano wa AIRich kutoka MessageBuilder.\n\n${buttonBody}`)
            .addSuggest(buttons.map((button) => `${button.label} → ${button.id}`))
            .addTip('Kijiselele cha button kitafanya command halisi ukiichagua');

        await richBuilder.send(ctx.chatId, { quoted: ctx._msg, forwarded: true, fallbackText: `${buttonTitle}\n${buttonSubtitle}\n\n${buttonBody}` });
        return;
    } catch (error) {
        console.error('MessageBuilder send error:', error);
        const snippet = generateMessageSourceCode({
            title: buttonTitle,
            subtitle: buttonSubtitle,
            body: buttonBody,
            footer: buttonFooter,
            buttons,
        });
        return ctx.reply(snippet);
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Send interactive ButtonV2 and AIRich messages that trigger real bot functions';

module.exports = sourceCommand;
