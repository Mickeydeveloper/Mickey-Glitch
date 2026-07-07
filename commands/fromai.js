/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        // Tunatengeneza ujumbe wa maandishi ya kawaid lakini wenye sifa za AI
        const messageStructure = {
            extendedTextMessage: {
                text: 'Zero Tr4sh by Ghost King',
                contextInfo: {
                    isAuthedChatBot: true,
                    chatBotType: 1,
                    isFromAI: true // Hii inaweka alama ya AI
                },
                isFromTemplate: true // Hii inasaidia kuonyesha alama ya AI
            }
        };

        // Tunatuma ujumbe kama 'ephemeralMessage' (mbichi) kupitia relayMessage
        // Hii inalazimisha WhatsApp UI ya picha ya pili kuwaka bila kuweka kadi ya biashara
        await sock.relayMessage(chatId, {
            ephemeralMessage: {
                message: messageStructure
            }
        }, { 
            messageId: sock.generateMessageID?.() || (Math.random().toString(36).substr(2, 9))
        });

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