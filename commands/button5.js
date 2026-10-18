const { randomUUID } = require('crypto');

module.exports = async function button5Command(sock, chatId, msg) {
    try {
        const uuid = randomUUID();
        const imageUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/chatbot.png';
        const widgetData = {
            version: 'v0.9',
            createSurface: {
                surfaceId: `levvicode-${uuid}`,
                catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
                components: [
                    {
                        id: 'root',
                        component: 'Column',
                        children: ['img_icon', 'img_avatar', 'img_small', 'img_medium', 'img_large', 'img_header', 'title_0', 'text_0', 'button_0'],
                        align: 'stretch',
                        justify: 'start'
                    },
                    ...[
                        ['img_icon', 'icon'],
                        ['img_avatar', 'avatar'],
                        ['img_small', 'smallFeature'],
                        ['img_medium', 'mediumFeature'],
                        ['img_large', 'largeFeature'],
                        ['img_header', 'header']
                    ].map(([id, variant]) => ({
                        id,
                        component: 'Image',
                        url: imageUrl,
                        variant,
                        fit: 'cover'
                    })),
                    { id: 'title_0', component: 'Text', text: 'Code Community', variant: 'h1' },
                    { id: 'text_0', component: 'Text', text: 'Icon\nAvatar\nSmall Feature\nMedium Feature\nLarge Feature\nHeader', variant: 'body' },
                    {
                        id: 'button_0',
                        component: 'Button',
                        child: 'button_text_0',
                        variant: 'primary',
                        action: {
                            call: 'openUrl',
                            args: { url: 'https://t.ly/9r56b' }
                        }
                    },
                    { id: 'button_text_0', component: 'Text', text: 'Join', variant: 'body' }
                ]
            }
        };

        const rawMessage = {
            interactiveMessage: {
                body: { text: '\u200b' },
                nativeFlowMessage: {
                    buttons: [],
                    messageParamsJson: '{}'
                },
                bloksWidget: {
                    uuid,
                    data: JSON.stringify(widgetData),
                    type: 'im_a2ui'
                }
            }
        };

        await sock.relayMessage(chatId, rawMessage, {});
    } catch (error) {
        console.error('[button5] A2UI widget failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma A2UI widget.'
        }, { quoted: msg });
    }
};

module.exports.name = 'button5';
module.exports.description = 'Send an A2UI image variants demo';
module.exports.category = 'TOOLS';
module.exports.aliases = [];
