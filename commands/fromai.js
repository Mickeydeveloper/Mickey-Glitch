/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        // Tunatengeneza muundo wa Button (Interactive Message) ambao Baileys inaukubali na kuweka alama ya AI
        const buttons = [
            { 
                buttonId: 'id_ping', 
                buttonText: { displayText: '📡 Ping' }, 
                type: 1 
            }
        ];

        const buttonMessage = {
            text: 'Zero Tr4sh by Ghost King',
            footer: 'Mickey Glitch AI',
            buttons: buttons,
            headerType: 1,
            contextInfo: {
                isAuthedChatBot: true,
                chatBotType: 1
            }
        };

        // Tunatuma kwa kutumia sock.sendMessage ya kawaida
        await sock.sendMessage(chatId, buttonMessage, { quoted: message });

    } catch (error) {
        console.error('FromAI Error:', error);
        // Kama iki-fail kwa namna yoyote, inarudi kwenye text ya kawaida
        await sock.sendMessage(chatId, { 
            text: '❌ *Error:* Tafadhali jaribu tena.' 
        }, { quoted: message });
    }
};

module.exports = fromaiCommand;
