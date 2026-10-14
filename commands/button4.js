const { Buffer } = require('buffer');

module.exports = async function button4Command(sock, chatId, msg) {
    const responseData = {
        __typename: 'GenAIUnifiedResponse',
        response_id: 'test123',
        sections: [
            {
                __typename: 'GenAIUnifiedResponseSection',
                view_model: {
                    __typename: 'GenAISingleLayoutViewModel',
                    primitive: {
                        __typename: 'GenAILabelPrimitive',
                        text: 'Hello goys',
                        variant: 'POSITIVE',
                        background_color_override: '#FF0000FF',
                        text_color_override: '#000000FF'
                    }
                }
            }
        ]
    };

    try {
        await sock.relayMessage(chatId, {
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify(responseData)).toString('base64')
                        },
                        contextInfo: {
                            isForwarded: true,
                            forwardOrigin: 4
                        }
                    }
                }
            }
        }, {});
    } catch (error) {
        console.error('[button4] rich label failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma AI Rich label.'
        }, { quoted: msg });
    }
};

module.exports.name = 'button4';
module.exports.description = 'Send an AI Rich label demo';
module.exports.category = 'TOOLS';
module.exports.aliases = [];
