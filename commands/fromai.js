/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        // Njia ya kwanza: Kutumia sendMessage yenye contextInfo maalum
        await sock.sendMessage(chatId, {
            text: 'Zero Tr4sh by Ghost King',
            contextInfo: {
                isAuthedChatBot: true,
                chatBotType: 1,
                isFromAI: true,
                // Hizi zinaweza kusaidia
                isForwarded: false,
                isStarred: false,
                isFromTemplate: true,
                // Kuongeza newsletter info
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363291068176093@newsletter',
                    newsletterName: 'AI Assistant',
                    serverMessageId: Date.now()
                }
            }
        }, { 
            quoted: message,
            ephemeralExpiration: 0 // Hakikisha sio ephemeral
        });

    } catch (error) {
        console.error('FromAI Error:', error);
        
        // Njia ya pili: Jaribu kutumia relayMessage yenye muundo tofauti
        try {
            await sock.relayMessage(chatId, {
                conversation: 'Zero Tr4sh by Ghost King',
                contextInfo: {
                    isAuthedChatBot: true,
                    chatBotType: 1,
                    isFromAI: true
                }
            }, {
                messageId: sock.generateMessageID?.() || (Math.random().toString(36).substr(2, 9))
            });
        } catch (e) {
            // Njia ya tatu: Jaribu kutumia sendMessage rahisi
            try {
                await sock.sendMessage(chatId, {
                    text: 'Zero Tr4sh by Ghost King',
                    contextInfo: {
                        isFromAI: true,
                        isAuthedChatBot: true,
                        chatBotType: 1
                    }
                });
            } catch (err) {
                console.error('All methods failed:', err);
                await sock.sendMessage(chatId, { 
                    text: '❌ *Error:* Tafadhali jaribu tena.' 
                }, { quoted: message });
            }
        }
    }
};

module.exports = fromaiCommand;