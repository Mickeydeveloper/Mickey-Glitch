async function test3Command(sock, chatId, message) {
    const interactiveMessage = {
        body: {
            text: 'Native flow test by Mickey Glitch. This is a demo; do not share personal information.',
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Test successful',
                        id: 'test3_success',
                    }),
                },
            ],
            messageParamsJson: '{}',
            messageVersion: 3,
        },
    };

    await sock.relayMessage(chatId, { interactiveMessage }, {
        additionalNodes: [{
            tag: 'biz',
            attrs: {},
            content: [{
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{
                    tag: 'native_flow',
                    attrs: { v: '9', name: 'mixed' },
                }],
            }],
        }],
    });
}

test3Command.name = 'test3';
test3Command.description = 'Test native-flow interactive messages';
test3Command.category = 'TOOLS';

module.exports = test3Command;
