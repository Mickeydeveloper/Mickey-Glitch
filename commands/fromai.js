const { randomBytes } = require('crypto');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('baileys');

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

        const image = await prepareWAMessageMedia(
            {
                image: {
                    url: 'https://cdn.ornzora.eu.cc/a6a1e8f4-b83d-4694-9bba-0f22a58bfd4f-FIORA.jpg'
                }
            },
            {
                upload: sock.waUploadToServer
            }
        );

        const video = await prepareWAMessageMedia(
            {
                video: {
                    url: 'https://cdn.ornzora.eu.cc/ed7ebb66-9bf4-44b6-858a-b6b7405e53c5-FIORA.mp4'
                }
            },
            {
                upload: sock.waUploadToServer
            }
        );

        const msg = generateWAMessageFromContent(
            chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0
                    }
                }
            },
            {}
        );

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id
        });

        const aiMsg = {
            conversation: 'Fiora Sylvie',
            messageContextInfo: {
                messageSecret: randomBytes(32),
                supportPayload: '{"version": 1, "is_ai_message": true, "should_show_system_message": true, "ticket_id": "1669945700536053"}'
            }
        };

        try {
            await sock.relayMessage(chatId, aiMsg, {
                additionalNodes: [
                    {
                        attrs: {
                            biz_bot: '1'
                        },
                        tag: 'bot'
                    },
                    {
                        attrs: {},
                        tag: 'biz'
                    }
                ]
            });
        } catch (relayError) {
            console.error('FromAI relayMessage failed:', relayError);
            await sock.sendMessage(chatId, {
                text: `⚠️ The relay payload did not send. ${relayError?.message || relayError}`
            }, { quoted: message });
            return;
        }

        try {
            await sock.sendMessage(chatId, {
                text: '🧪 AI-style relay payload was attempted. If nothing appears, the current Baileys session may not render this payload.'
            }, { quoted: message });
        } catch (fallbackError) {
            console.error('FromAI fallback send failed:', fallbackError);
        }

        await sock.relayMessage(
            chatId,
            {
                videoMessage: {
                    ...video.videoMessage,
                    contextInfo: {
                        pairedMediaType: 6,
                        statusSourceType: 0
                    }
                },
                messageContextInfo: {
                    messageAssociation: {
                        associationType: 12,
                        parentMessageKey: msg.key
                    }
                }
            },
            {}
        );
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
