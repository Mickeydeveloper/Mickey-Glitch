/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        // Mbinu ya Uhakika: Tunalazimisha kutuma kwa kutumia 'relayMessage' 
        // na muundo kamili wa 'extendedTextMessage' ambao WhatsApp inasoma kama AI chat.
        const messageId = sock.generateMessageID?.() || message.key?.id || (Math.random().toString(36).substr(2, 9));
        
        await sock.relayMessage(chatId, {
            extendedTextMessage: {
                text: 'Zero Tr4sh by Ghost King',
                contextInfo: {
                    isAuthedChatBot: true,
                    chatBotType: 1
                }
            }
        }, { messageId: messageId });

    } catch (error) {
        console.error('FromAI Error:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Tafadhali jaribu tena.' 
            }, { quoted: message });
        } catch (e) {}
    }
};

module.exports = fromaiCommand;
