const { AIRich } = require('../lib/messageBuilder');

module.exports = async function button3Command(sock, chatId, msg, args = []) {
    const intro = args.join(' ').trim() || 'Rich response demo';

    try {
        const rich = new AIRich(sock)
            .setTitle('BUTTON 3 | AI RICH')
            .setSubtitle('Interactive card demo')
            .setBody(intro)
            .addText(
                'This card supports [clickable links](https://github.com/Mickeydeveloper/Mickey-Glitch) ' +
                'and structured content built with the AI Rich toolkit.'
            )
            .addTable([
                ['Feature', 'Description'],
                ['Inline entities', 'Clickable links and citations'],
                ['Rich content', 'Tables, images, code and media'],
                ['Actions', 'Suggestions and footer links']
            ])
            .addSuggest(['.menu', '.ping'], { scroll: false })
            .addFooterAction({
                text: 'Open GitHub',
                type: 'OPEN_URL',
                url: 'https://github.com/Mickeydeveloper/Mickey-Glitch'
            });

        await rich.send(chatId, { quoted: msg });
    } catch (error) {
        console.error('[button3] rich response failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma AI Rich card.'
        }, { quoted: msg });
    }
};

module.exports.name = 'button3';
module.exports.description = 'Send an AI Rich card demo';
module.exports.category = 'TOOLS';
module.exports.aliases = [];
