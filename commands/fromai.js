/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, msg, args) => {
    try {
        await sock.sendMessage(chatId, { 
            text: 'Zero Tr4sh by Ghost King' 
        }, { quoted: msg });
    } catch (error) {
        console.error('FromAI Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *Error:* Tafadhali jaribu tena.' 
        }, { quoted: msg });
    }
};

module.exports = fromaiCommand;