/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        await sock.sendMessage(chatId, {
            text: 'Zero Tr4sh by Ghost King',
            contextInfo: {
                isAuthedChatBot: true,
                chatBotType: 1,
                statusPsa: {
                    campaignId: "meta-ai"
                },
                businessOwnerJid: '0@s.whatsapp.net' // Namba rasmi ya mfumo wa WhatsApp
            }
        }, { quoted: message });

    } catch (error) {
        console.error('FromAI Error:', error);
        try {
            await sock.sendMessage(chatId, { text: '❌ *Error:* Jaribu tena.' }, { quoted: message });
        } catch (e) {}
    }
};

module.exports = fromaiCommand;
