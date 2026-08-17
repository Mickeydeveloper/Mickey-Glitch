const crypto = require('crypto');

async function ipLeakCommand(sock, chatId, msg, args = [], options = {}) {
    try {
        // Get sender context to avoid WhatsApp code errors
        const senderId = options.senderId || msg?.key?.participant || msg?.key?.remoteJid || '';
        const customText = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
        const titleText = customText || 'IP LEAK';
        const timestamp = Date.now();
        const imageUrl = `https://ipleak.nixel.dev/image/ip?timestamp=${timestamp}`;

        // Build context info with proper sender metadata
        const contextInfo = {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
                botJid: '0@bot'
            },
            forwardOrigin: 4
        };

        // Add sender info if available to prevent WhatsApp errors
        if (senderId) {
            contextInfo.participant = senderId;
            contextInfo.mentionedJid = [senderId];
        }

        const payload = {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: '',
                    richResponseSourcesMetadata: {}
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                response_id: crypto.randomUUID(),
                                sections: [
                                    {
                                        __typename: 'GenAIUnifiedResponseSection',
                                        view_model: {
                                            __typename: 'GenAISingleLayoutViewModel',
                                            primitive: {
                                                __typename: 'GenAIMarkdownTextUXPrimitive',
                                                text: `${titleText}\u0000`,
                                                inline_entities: [
                                                    {
                                                        __typename: 'GenAITextInlineEntity',
                                                        key: 'NIXEL',
                                                        metadata: {
                                                            __typename: 'GenAILatexItem',
                                                            latex_expression: '\u0000',
                                                            font_height: 24,
                                                            padding: 4,
                                                            latex_image: {
                                                                __typename: 'GenAIMediaItem',
                                                                mime_type: 'image/png',
                                                                url: 'https://files.catbox.moe/2rpeyy.png',
                                                                url_fallback: 'https://files.catbox.moe/2rpeyy.png',
                                                                width: 417.3913043478261,
                                                                height: 117.3913043478261,
                                                                expiration_timestamp_ms: Date.now() + 60 * 60 * 1000
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        view_model: {
                                            primitive: {
                                                __typename: 'GenAIImagePrimitive',
                                                preview_image: {
                                                    __typename: 'GenAIMediaItem',
                                                    mime_type: 'image/jpeg',
                                                    url: imageUrl
                                                },
                                                full_image: {
                                                    __typename: 'GenAIMediaItem',
                                                    mime_type: 'image/jpeg',
                                                    url: imageUrl
                                                }
                                            },
                                            __typename: 'GenAISingleLayoutViewModel'
                                        }
                                    },
                                    {
                                        view_model: {
                                            primitive: {
                                                __typename: 'GenAIFooterActionPrimitive',
                                                cta_text: 'WhatsApp Group',
                                                cta_type: 'OPEN_URL',
                                                cta_url: 'https://chat.whatsapp.com/DRirs6nV3073MR6JvaSRrS?s=cl&p=a&ilr=0'
                                            },
                                            __typename: 'GenAISingleLayoutViewModel'
                                        }
                                    }
                                ]
                            })).toString('base64')
                        }
                    }
                }
            },
            contextInfo: contextInfo
        };

        // Use relayMessage with proper context to avoid WhatsApp errors
        await sock.relayMessage(chatId, payload, {});
        return true;
    } catch (error) {
        console.error('ipleak command error:', error?.message || error);
        if (sock?.sendMessage) {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to send IP leak message. Please try again.'
            }, { quoted: msg });
        }
        return false;
    }
}

module.exports = ipLeakCommand;
module.exports.name = 'ipleak';
module.exports.aliases = ['ipl', 'leak'];
module.exports.category = 'owner';
module.exports.desc = 'Generate IP leak card using inline AI-style renderer';
module.exports.execute = ipLeakCommand;
module.exports.run = ipLeakCommand;
module.exports.handler = ipLeakCommand;
