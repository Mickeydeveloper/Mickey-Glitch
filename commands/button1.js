const { Buffer } = require('buffer');
const settings = require('../settings');

async function sendInstagramProfile(sock, chatId, username) {
    const profilePictureUrl = 'https://cdn.zass.in/ozfiUL0rM9.jpg';
    const responseData = {
        sections: [
            {
                view_model: {
                    primitives: [
                        {
                            title: settings.botName,
                            subtitle: settings.botOwner,
                            secondary_subtitle: '',
                            image: {
                                url: profilePictureUrl,
                                mime_type: 'image/jpeg'
                            },
                            entity_id: '123456',
                            entity_url: 'wa.me/6288246552068',
                            entity_type: 'WEBSITE',
                            action_type: 'OPEN_URL',
                            is_verified: true,
                            __typename: 'GenAICompactEntityPrimitive'
                        }
                    ],
                    __typename: 'GenAIActionRowLayoutViewModel'
                }
            },
            {
                view_model: {
                    primitives: [
                        {
                            type: 'HORIZONTAL_LINE',
                            __typename: 'GenAIDividerPrimitive'
                        }
                    ],
                    __typename: 'GenAIVStackLayoutViewModel'
                }
            },
            {
                view_model: {
                    primitives: [
                        { __typename: 'GenAISpacerPrimitive' },
                        {
                            text: '# {{social_entity_1}}See results\0{{/social_entity_1}}    ',
                            inline_entities: [
                                {
                                    key: 'social_entity_1',
                                    metadata: {
                                        __typename: 'GenAISocialEntityItem',
                                        entity_id: username,
                                        entity_name: username,
                                        entity_full_name: 'NOT found',
                                        entity_picture_url: profilePictureUrl,
                                        entity_url: `https://www.instagram.com/${username}`,
                                        entity_type: 'IG_PROFILE',
                                        is_verified: true
                                    }
                                }
                            ],
                            __typename: 'GenAIMarkdownTextUXPrimitive'
                        },
                        { __typename: 'GenAISpacerPrimitive' }
                    ],
                    __typename: 'GenAIActionRowLayoutViewModel'
                }
            }
        ]
    };

    return sock.relayMessage(chatId, {
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [],
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
}

module.exports = async function button1Command(sock, chatId, msg, args = []) {
    const username = args[0] || 'ryuu_reinzz';
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
        await sock.sendMessage(chatId, {
            text: 'Tumia username halali ya Instagram, mfano: .button1 ryuu_reinzz'
        }, { quoted: msg });
        return;
    }

    try {
        await sendInstagramProfile(sock, chatId, username);
    } catch (error) {
        console.error('[button1] relay failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma Instagram profile response.'
        }, { quoted: msg });
    }
};

module.exports.name = 'button1';
module.exports.description = 'Show an Instagram profile rich response';
module.exports.category = 'TOOLS';
module.exports.aliases = [];
