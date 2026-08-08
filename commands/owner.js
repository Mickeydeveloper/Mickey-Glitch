const isOwnerOrSudo = require('../lib/isOwner');

const buildOwnerRichResponse = () => {
    const responsePayload = {
        response_id: '742a451a-0c33-45ca-a205-42c2b1666bca',
        sections: [
            {
                view_model: {
                    primitive: {
                        __typename: 'FOATextPrimitive',
                        text: '# Hello my name is~'
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            },
            {
                view_model: {
                    primitive: {
                        text: 'Mickdady~',
                        __typename: 'GenAIMarkdownTextUXPrimitive'
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            },
            {
                view_model: {
                    primitive: {
                        __typename: 'GenAIImagePrimitive',
                        preview_image: {
                            __typename: 'GenAIMediaItem',
                            mime_type: 'image/jpeg',
                            url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png'
                        },
                        full_image: {
                            __typename: 'GenAIMediaItem',
                            mime_type: 'image/jpeg',
                            url: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png'
                        }
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            },
            {
                view_model: {
                    primitives: [
                        {
                            __typename: 'GenAI3PExtWidgetPrimitive',
                            header: {
                                __typename: 'GenAI3PExtWidgetStandardHeader',
                                title: 'LIST-X'
                            },
                            body: {
                                __typename: 'GenAI3PExtCalendarEventList',
                                sections: [],
                                ctas: [
                                    {
                                        __typename: 'GenAI3PExtWidgetCTA',
                                        label: 'menu',
                                        state: 'PENDING',
                                        kind: 'OTHER',
                                        tool_call_id: '00',
                                        toast: {
                                            __typename: 'GenAI3PExtWidgetToast',
                                            label: 'NIX'
                                        }
                                    },
                                    {
                                        __typename: 'GenAI3PExtWidgetCTA',
                                        label: '.profile',
                                        state: 'PENDING',
                                        kind: 'OTHER',
                                        tool_call_id: '01',
                                        toast: {
                                            __typename: 'GenAI3PExtWidgetToast',
                                            label: 'NIX'
                                        }
                                    },
                                    {
                                        __typename: 'GenAI3PExtWidgetCTA',
                                        label: 'script',
                                        state: 'PENDING',
                                        kind: 'OTHER',
                                        tool_call_id: '02',
                                        toast: {
                                            __typename: 'GenAI3PExtWidgetToast',
                                            label: 'NIX'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            __typename: 'GenAI3PExtWidgetPrimitive',
                            header: {
                                __typename: 'GenAI3PExtWidgetStandardHeader',
                                title: 'NX-T'
                            },
                            body: {
                                __typename: 'GenAI3PExtCalendarEventList',
                                sections: [],
                                ctas: [
                                    {
                                        __typename: 'GenAI3PExtWidgetCTA',
                                        label: 'MICKEY',
                                        state: 'PENDING',
                                        kind: 'OTHER',
                                        tool_call_id: '10',
                                        toast: {
                                            __typename: 'GenAI3PExtWidgetToast',
                                            label: 'NIX'
                                        }
                                    },
                                    {
                                        __typename: 'GenAI3PExtWidgetCTA',
                                        label: 'MICKY',
                                        state: 'PENDING',
                                        kind: 'OTHER',
                                        tool_call_id: '11',
                                        toast: {
                                            __typename: 'GenAI3PExtWidgetToast',
                                            label: 'NIX'
                                        }
                                    },
                                    {
                                        __typename: 'GenAI3PExtWidgetCTA',
                                        label: 'FIORA',
                                        state: 'PENDING',
                                        kind: 'OTHER',
                                        tool_call_id: '12',
                                        toast: {
                                            __typename: 'GenAI3PExtWidgetToast',
                                            label: 'NIX'
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    __typename: 'GenAIHScrollLayoutViewModel'
                }
            },
            {
                view_model: {
                    primitives: [
                        {
                            __typename: 'GenAIFooterActionPrimitive',
                            cta_text: 'WhatsApp Group',
                            cta_type: 'OPEN_URL',
                            cta_url: 'https://chat.whatsapp.com/J7OzqKB7Bl2AGIcNEYsdch?s=cl&p=a&ilr=0'
                        },
                        {
                            __typename: 'GenAIFooterActionPrimitive',
                            cta_text: 'WhatsApp Channel',
                            cta_type: 'OPEN_URL',
                            cta_url: 'https://whatsapp.com/channel/0029VbCV1ck8fewpdNb2TY2k'
                        }
                    ],
                    __typename: 'GenAIHScrollLayoutViewModel'
                }
            }
        ]
    };

    return {
        messageContextInfo: {
            messageSecret: 'v/3VN8Gfr2dbKzgt1GKDEU7ovyYW+nswh4Duwq6KDuU='
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify(responsePayload)).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardOrigin: 4
                    }
                }
            }
        }
    };
};

const ownerCommand = async (sock, chatId, msg, args = [], options = {}) => {
    try {
        const targetChatId = chatId || msg?.key?.remoteJid || options.chatId;
        const senderId = options.senderId || msg?.key?.participant || msg?.key?.remoteJid || '';

        if (senderId) {
            try {
                const isAllowed = await isOwnerOrSudo(senderId, sock, targetChatId);
                if (!isAllowed) {
                    await sock?.sendMessage?.(targetChatId, {
                        text: '⚠️ Only the owner or sudo user can use this feature.'
                    }, { quoted: msg });
                    return true;
                }
            } catch (error) {
                console.error('[owner] permission check failed:', error?.message || error);
            }
        }

        const payload = buildOwnerRichResponse();

        if (typeof sock?.relayMessage === 'function') {
            await sock.relayMessage(targetChatId, payload, {});
            return true;
        }

        if (typeof sock?.sendMessage === 'function') {
            await sock.sendMessage(targetChatId, {
                text: '👑 Owner feature loaded.'
            }, { quoted: msg });
        }

        return true;
    } catch (error) {
        console.error('[owner] error:', error?.message || error);
        try {
            await sock?.sendMessage?.(chatId || msg?.key?.remoteJid, {
                text: `❌ ${error?.message || 'Owner command failed.'}`
            }, { quoted: msg });
        } catch (sendErr) {}
        return false;
    }
};

ownerCommand.name = 'owner';
ownerCommand.description = 'Show the owner rich-response feature menu';
ownerCommand.category = 'OWNER/ADMIN';
ownerCommand.aliases = ['ownercmd'];

module.exports = ownerCommand;
