/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 * Description: Sends message with AI badge/label
 */

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

/**
 * Main command handler for fromai
 */
const fromaiCommand = async (sock, chatId, message) => {
    console.log('[fromai] invoked for', chatId, 'from', message.key?.participant || message.key?.remoteJid);

    try {
        // Jaribu njia ya kwanza: sendMessage yenye contextInfo kamili
        await sock.sendMessage(chatId, {
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
                },
                participant: '0@s.whatsapp.net',
                quotedMessage: {
                    conversation: message?.body || 'Hello'
                }
            }
        }, { 
            quoted: message,
            ephemeralExpiration: 0 
        });

        console.log('[fromai] Message sent with AI badge (Method 1)');

    } catch (error) {
        console.error('[fromai] Error (Method 1):', error && error.message ? error.message : error);
        
        // Jaribu njia ya pili: relayMessage
        try {
            await sock.relayMessage(chatId, {
                ephemeralMessage: {
                    message: {
                        extendedTextMessage: {
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
                        }
                    }
                }
            }, {
                messageId: sock.generateMessageID?.() || (Math.random().toString(36).substr(2, 9))
            });

            console.log('[fromai] Message sent with AI badge (Method 2)');

        } catch (error2) {
            console.error('[fromai] Error (Method 2):', error2 && error2.message ? error2.message : error2);
            
            // Jaribu njia ya tatu: sendMessage rahisi
            try {
                await sock.sendMessage(chatId, {
                    text: 'Zero Tr4sh by Ghost King',
                    contextInfo: {
                        isFromAI: true,
                        isAuthedChatBot: true,
                        chatBotType: 1
                    }
                }, { 
                    quoted: message 
                });

                console.log('[fromai] Message sent with AI badge (Method 3)');

            } catch (error3) {
                console.error('[fromai] Error (Method 3):', error3 && error3.message ? error3.message : error3);
                
                // Njia ya mwisho: sendMessage ya kawaida
                try {
                    await sock.sendMessage(chatId, { 
                        text: 'Zero Tr4sh by Ghost King' 
                    }, { quoted: message });
                    
                    console.log('[fromai] Message sent as normal text (Fallback)');
                    
                } catch (finalError) {
                    console.error('[fromai] All methods failed:', finalError && finalError.message ? finalError.message : finalError);
                    throw finalError;
                }
            }
        }
    }
};

module.exports = fromaiCommand;