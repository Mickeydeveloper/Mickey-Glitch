const { createCtx } = require('../lib/messageBuilder');

function buildRichDinoPayload(jid, dinoText = 'DINO RUNNER', score = '0') {
    const responseId = `cylicdev-dino-${Date.now()}`;
    const payload = {
        messageContextInfo: {
            threadId: [],
            deviceListMetadata: {
                senderKeyIndexes: [],
                recipientKeyIndexes: []
            },
            deviceListMetadataVersion: 2,
            messageSecret: '0cCzjnQ5ERoqM2QrQ7KjmMfxsyeWYu+61/chr2wioyE=',
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: responseId
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    submessages: [
                        {
                            messageType: 2,
                            messageText: dinoText
                        }
                    ],
                    messageType: 1,
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [
                                {
                                    view_model: {
                                        primitives: [
                                            {
                                                text: dinoText,
                                                __typename: 'GenAIMarkdownTextUXPrimitive'
                                            },
                                            {
                                                text: `🦖 Dino score: ${score} • Run and survive`,
                                                __typename: 'GenAIMetadataTextPrimitive'
                                            }
                                        ]
                                    }
                                }
                            ]
                        })).toString('base64')
                    },
                    contextInfo: {
                        mentionedJid: [],
                        groupMentions: [],
                        statusAttributions: [],
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: '867051314767696@bot'
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };

    return { jid, content: payload };
}

const dinoCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    const steps = ['🏃', '🦖', '🌵', '☄️'];
    const run = steps[Math.floor(Math.random() * steps.length)];
    const score = Math.floor(Math.random() * 999) + 100;
    const status = Math.random() > 0.4 ? 'SURVIVED' : 'CRASHED';
    const dinoText = status === 'SURVIVED'
        ? `🦖 DINO RUNNER • ${run} • SCORE ${score}`
        : `💥 DINO CRASHED • ${run} • SCORE ${score}`;

    try {
        const payload = buildRichDinoPayload(target, dinoText, String(score));
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[dino] relay rich payload failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: dinoText,
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[dino] sendMessage fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

dinoCommand.name = 'dino';
dinoCommand.aliases = ['dinojump', 'runner'];
dinoCommand.category = 'fun';
dinoCommand.description = 'Dino runner game using the forwarded rich payload format';

module.exports = dinoCommand;
