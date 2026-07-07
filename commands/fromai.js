/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        // Tunatuma ujumbe kwa kutumia Baileys pekee kwa muundo ambao hauchujwi
        await sock.sendMessage(chatId, {
            text: 'Zero Tr4sh by Ghost King',
            contextInfo: {
                isAuthedChatBot: true,
                chatBotType: 1,
                // Hizi parameter mbili zinalazimisha WhatsApp kuamsha mfumo wa AI UI
                forwardingScore: 1,
                isForwarded: false
            }
        }, { quoted: message });

    } catch (error) {
        console.error('FromAI Error:', error);
        // Sehemu ya Error ikifeli
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Tafadhali jaribu tena.' 
            }, { quoted: message });
        } catch (e) {}
    }
};

module.exports = fromaiCommand;
