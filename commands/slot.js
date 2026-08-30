const { AIRich, createCtx } = require('../lib/messageBuilder');

function buildSlotRelayContent(jid) {
    const responseId = 'cylicdev-slot-' + Date.now();
    const sections = [
        {
            view_model: {
                primitives: [
                    {
                        text: 'CYLICDEV • SLOT 777',
                        __typename: 'GenAIMarkdownTextUXPrimitive',
                    },
                    {
                        text: '🎰 Jackpot spin • 777 • 1,000 GP',
                        __typename: 'GenAIMetadataTextPrimitive',
                    },
                ],
            },
        },
    ];

    return {
        messageContextInfo: {
            threadId: [],
            deviceListMetadata: {
                senderKeyIndexes: [],
                recipientKeyIndexes: [],
            },
            deviceListMetadataVersion: 2,
            messageSecret: '0cCzjnQ5ERoqM2QrQ7KjmMfxsyeWYu+61/chr2wioyE=',
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: responseId,
            },
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    submessages: [
                        {
                            messageType: 2,
                            messageText: 'CYLICDEV • SLOT 777',
                        },
                    ],
                    messageType: 1,
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections,
                        })).toString('base64'),
                    },
                    contextInfo: {
                        mentionedJid: [],
                        groupMentions: [],
                        statusAttributions: [],
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: '867051314767696@bot',
                        },
                        forwardOrigin: 4,
                    },
                },
            },
        },
    };
}

const slotCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    const input = Array.isArray(args) ? args.join(' ').trim() : '';
    const symbols = ['🍒', '7️⃣', '💎', '⭐', '🍋'];
    const spin = () => symbols[Math.floor(Math.random() * symbols.length)];

    const result = [spin(), spin(), spin()];
    const isWin = result[0] === result[1] && result[1] === result[2];
    const prize = isWin ? 7777 : 0;

    try {
        if (typeof sock.relayMessage === 'function') {
            const payload = buildSlotRelayContent(target);
            await sock.relayMessage(target, payload, {});
            return true;
        }
    } catch (error) {
        console.error('[slot] relayMessage fallback failed:', error?.message || error);
    }

    const rich = new AIRich(sock)
        .setTitle('CYLICDEV • SLOT 777')
        .setSubtitle('Lucky Spin Game')
        .addText(`🎰 Result: ${result.join(' | ')}`)
        .addText(isWin ? `🎉 JACKPOT! Kamu menang *${prize}* GP` : '😢 Belum beruntung, coba lagi.')
        .setFooter(input ? `Request: ${input}` : 'Tap spin to play again');

    try {
        await rich.send(target, { quoted: ctx.msg, fallbackText: `🎰 ${result.join(' | ')}\n${isWin ? '🎉 JACKPOT! Kamu menang ' + prize + ' GP' : '😢 Belum beruntung, coba lagi.'}` });
        return true;
    } catch (error) {
        console.error('[slot] rich send failed:', error?.message || error);
        await ctx.reply(`🎰 ${result.join(' | ')}\n${isWin ? '🎉 JACKPOT! Kamu menang ' + prize + ' GP' : '😢 Belum beruntung, coba lagi.'}`);
        return true;
    }
};

slotCommand.name = 'slot';
slotCommand.aliases = ['game', 'jackpot'];
slotCommand.category = 'fun';
slotCommand.description = 'Slot game with relay payload style from the provided sample';

module.exports = slotCommand;
