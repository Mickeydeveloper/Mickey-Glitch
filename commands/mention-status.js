const getMentionStatusCommand = async (sock, chatId, msg, args) => {
    const targetJids = args.length ? args : [chatId];
    try {
        let baileys;
        try {
            baileys = (await import('@whiskeysockets/baileys')).default;
        } catch (importError) {
            baileys = require('@whiskeysockets/baileys');
        }

        if (!baileys?.proto?.Message?.ProtocolMessage?.Type?.STATUS_MENTION_MESSAGE) {
            throw new Error('no STATUS_MENTION_MESSAGE found in ProtocolMessage (is your WAProto up-to-date?)');
        }

        const fetchParticipants = async (...jids) => {
            let results = [];
            for (const jid of jids) {
                const metadata = await sock.groupMetadata(jid);
                let participants = metadata?.participants ?? [];
                participants = participants.map(({ id }) => id);
                results = results.concat(participants);
            }
            return results;
        };

        const content = {
            image: { url: 'https://files.catbox.moe/g4if44.jpg' },
            caption: "I don't know what the picture is, but does it work? :v",
        };

        const preparedMessage = await baileys.generateWAMessage(baileys.STORIES_JID, content, {
            upload: sock.waUploadToServer,
        });

        let statusJidList = [];
        for (const _jid of targetJids) {
            if (_jid.endsWith('@g.us')) {
                statusJidList = statusJidList.concat(await fetchParticipants(_jid));
            } else {
                statusJidList.push(_jid);
            }
        }

        statusJidList = [...new Set(statusJidList)];

        await sock.relayMessage(preparedMessage.key.remoteJid, preparedMessage.message, {
            messageId: preparedMessage.key.id,
            statusJidList,
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: {},
                    content: [
                        {
                            tag: 'mentioned_users',
                            attrs: {},
                            content: targetJids.map((jid) => ({
                                tag: 'to',
                                attrs: { jid },
                                content: undefined,
                            })),
                        },
                    ],
                },
            ],
        });

        for (const jid of targetJids) {
            const type = jid.endsWith('@g.us') ? 'groupStatusMentionMessage' : 'statusMentionMessage';
            await sock.relayMessage(
                jid,
                {
                    [type]: {
                        message: {
                            protocolMessage: {
                                key: preparedMessage.key,
                                type: 25,
                            },
                        },
                    },
                },
                {
                    additionalNodes: [
                        {
                            tag: 'meta',
                            attrs: { is_status_mention: 'true' },
                            content: undefined,
                        },
                    ],
                }
            );
        }

        if (sock?.sendMessage) {
            await sock.sendMessage(chatId, { text: '✅ Status mention sent.' }, { quoted: msg });
        }

        return preparedMessage;
    } catch (error) {
        console.error('mentionStatus command error:', error);
        if (sock?.sendMessage) {
            await sock.sendMessage(chatId, { text: '❌ Failed to send status mention.' }, { quoted: msg });
        }
    }
};

getMentionStatusCommand.description = 'Send a status mention with image to a chat or group';
getMentionStatusCommand.aliases = ['mentionstatus', 'statusmention'];

module.exports = getMentionStatusCommand;
