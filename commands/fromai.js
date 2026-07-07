/**
 * fromai.js - From AI Command (Alternative)
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        // Kujenga ujumbe kama vile unavyotumwa na Meta AI
        const aiMessage = {
            text: 'Zero Tr4sh by Ghost King',
            contextInfo: {
                participant: '0@s.whatsapp.net', // Fake participant
                quotedMessage: {
                    conversation: message.body || 'Hello'
                },
                isFromAI: true,
                isAuthedChatBot: true,
                chatBotType: 1,
                // Hii inafanya ionekane kama AI
                stanzaId: '3EB038CCB37F01BAA0C3',
                participant: '0@s.whatsapp.net'
            }
        };

        await sock.sendMessage(chatId, aiMessage, {
            quoted: message,
            // Kuweka kama message ya kawaida si ephemeral
            ephemeralExpiration: 0
        });

    } catch (error) {
        console.error('FromAI Error:', error);
        
        // Jaribu njia rahisi zaidi
        try {
            await sock.sendMessage(chatId, {
                text: 'Zero Tr4sh by Ghost King',
                contextInfo: {
                    isFromAI: true
                }
            }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Tafadhali jaribu tena.' 
            }, { quoted: message });
        }
    }
};

module.exports = fromaiCommand;