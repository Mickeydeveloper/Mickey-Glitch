const { generateMessageSourceCode, ButtonV2, AIRich } = require('../lib/messageBuilder');

const sourceCommand = async (sock, chatId, msg, args) => {
    const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

    const parts = input ? input.split('|').map((part) => part.trim()).filter(Boolean) : [];
    const [title, subtitle, body, footer, ...buttonEntries] = parts;

    const buttons = buttonEntries.map((entry) => {
        const [label, id] = entry.split(',').map((item) => item.trim()).filter(Boolean);
        return { label: label || 'Button', id: id || '.menu' };
    });

    const buttonTitle = title || '🧩 MessageBuilder';
    const buttonSubtitle = subtitle || 'Button + AIRich demo';
    const buttonBody = body || 'Hii ni mfano wa interactive message kutoka MessageBuilder';
    const buttonFooter = footer || 'MICKEY BOT';

    try {
        const buttonBuilder = new ButtonV2(sock)
            .setTitle(buttonTitle)
            .setSubtitle(buttonSubtitle)
            .setBody(buttonBody)
            .setFooter(buttonFooter);

        buttons.forEach((button) => buttonBuilder.addButton(button.label, button.id));

        if (buttons.length === 0) {
            buttonBuilder.addButton('📦 Menu', '.menu').addButton('🧠 AI', '.ai');
        }

        await buttonBuilder.send(chatId, { quoted: msg });

        const richBuilder = new AIRich(sock)
            .setTitle('🧠 AIRich Demo')
            .setFooter(buttonFooter)
            .addText(`Hii ni mfano wa AIRich kutoka MessageBuilder.\n\n${buttonBody}`)
            .addSuggest(buttons.length ? buttons.map((button) => button.label) : ['Menu', 'AI'])
            .addTip('Tumia MessageBuilder kwa interactive messages zenye buttons na rich content');

        await richBuilder.send(chatId, { quoted: msg, forwarded: true });
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
        return sock.sendMessage(chatId, { text: snippet }, { quoted: msg });
    }
};

sourceCommand.category = 'UTILITY';
sourceCommand.description = 'Send interactive ButtonV2 and AIRich messages from MessageBuilder';

module.exports = sourceCommand;
