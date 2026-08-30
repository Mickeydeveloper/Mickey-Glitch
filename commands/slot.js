const { createCtx } = require('../lib/messageBuilder');

function buildRichSlotPayload(jid, resultText = 'CYLICDEV • SLOT 777', prize = '777') {
    const responseId = `cylicdev-slot-${Date.now()}`;
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
                            messageText: resultText
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
                                                text: resultText,
                                                __typename: 'GenAIMarkdownTextUXPrimitive'
                                            },
                                            {
                                                text: `🎰 Status: ${resultText} • Prize: ${prize} GP`,
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

const slotCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    const symbols = ['🍒', '7️⃣', '💎', '⭐', '🍋'];
    const spin = () => symbols[Math.floor(Math.random() * symbols.length)];
    const result = [spin(), spin(), spin()];
    const prize = (result[0] === result[1] && result[1] === result[2]) ? 7777 : 0;

    const resultText = prize > 0 ? `🎉 JACKPOT ${result.join(' | ')} • +${prize} GP` : `🎰 SPIN ${result.join(' | ')} • Try again`;

    try {
        const payload = buildRichSlotPayload(target, resultText, String(prize));
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[slot] relay rich payload failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: resultText,
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[slot] sendMessage fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

slotCommand.name = 'slot';
slotCommand.aliases = ['game', 'jackpot'];
slotCommand.category = 'fun';
slotCommand.description = 'Forwarded rich slot payload based on the provided Baileys message format';

module.exports = slotCommand;
