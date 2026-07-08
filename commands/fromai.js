const { ButtonV2 } = require('../lib/messageBuilder');

async function fromaiCommand(sock, chatId, message, args = []) {
    try {
        if (!sock) throw new Error('Socket connection not found');
        if (!chatId) throw new Error('Chat ID not found');

        const reply = async (text) => {
            if (typeof sock.sendMessage === 'function') {
                return sock.sendMessage(chatId, { text }, { quoted: message });
            }
            return null;
        };

        await reply('⏳ _Processing AI media engine, please wait..._');

        // Send an immediate confirmation so the user knows the command triggered.
        await sock.sendMessage(chatId, {
            text: '🤖 FromAI request received. Sending AI-style message payload...'
        }, { quoted: message });

        await new ButtonV2(sock)
            .setBody('Halo dunia')
            .setFooter('Footer Message')
            .setThumbnail('https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg')
            .addRawButton({
                buttonText: { displayText: '📡 Menu' },
                buttonId: 'Nixel',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: '{"title":"Click Here!","sections":[{"title":"Fiora Sylvie","highlight_label":"","rows":[{"header":"","title":"Nixel","description":"","id":""}]}]}'
                }
            })
            .send(chatId);
    } catch (error) {
        console.error('FromAI Media Error:', error);
        if (typeof sock?.sendMessage === 'function') {
            await sock.sendMessage(chatId, { text: `❌ FromAI Engine failed: ${error.message}` }, { quoted: message });
        }
    }
}

module.exports = fromaiCommand;
module.exports.name = 'fromai';
module.exports.aliases = ['aimedia', 'pairedmedia'];
module.exports.category = 'ai';
module.exports.default = fromaiCommand;
module.exports.code = fromaiCommand;
module.exports.handler = fromaiCommand;
