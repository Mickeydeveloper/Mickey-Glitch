/**
 * fromai.js - From AI Module
 * Creator: Ghost King
 */
const fromaiCommand = async (ctx) => {
    try {
        // Njia ya kwanza: Kutumia sendMessage yenye contextInfo
        await ctx.sock.sendMessage(ctx.chatId, {
            text: 'Zero Tr4sh by Ghost King',
            contextInfo: {
                isAuthedChatBot: true,
                chatBotType: 1,
                isFromAI: true,
                isForwarded: false,
                isStarred: false,
                isFromTemplate: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363291068176093@newsletter',
                    newsletterName: 'AI Assistant',
                    serverMessageId: Date.now()
                }
            }
        }, { 
            quoted: ctx.message,
            ephemeralExpiration: 0 
        });

    } catch (error) {
        console.error('FromAI Error:', error);
        
        // Njia ya pili: Jaribu relayMessage
        try {
            await ctx.sock.relayMessage(ctx.chatId, {
                ephemeralMessage: {
                    message: {
                        extendedTextMessage: {
                            text: 'Zero Tr4sh by Ghost King',
                            contextInfo: {
                                isAuthedChatBot: true,
                                chatBotType: 1,
                                isFromAI: true
                            },
                            isFromTemplate: true
                        }
                    }
                }
            }, {
                messageId: ctx.sock.generateMessageID?.() || (Math.random().toString(36).substr(2, 9))
            });
        } catch (e) {
            // Njia ya tatu: Reply rahisi
            await ctx.sock.sendMessage(ctx.chatId, { 
                text: 'Zero Tr4sh by Ghost King' 
            }, { quoted: ctx.message });
        }
    }
};

module.exports = fromaiCommand;