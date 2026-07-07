/**
 * fromai.js - From AI Command
 * Creator: Ghost King
 */
const fromaiCommand = async (sock, chatId, message) => {
    try {
        // Tunatengeneza ujumbe bandia wa Meta AI uliotangulia
        const fakeAiQuote = {
            key: {
                remoteJid: '0@s.whatsapp.net',
                fromMe: false,
                id: 'META_AI_FAKE_ID'
            },
            message: {
                extendedTextMessage: {
                    text: "Mickey Glitch AI",
                    contextInfo: {
                        isAuthedChatBot: true,
                        chatBotType: 1
                    }
                }
            }
        };

        // Tunatuma ujumbe wako ukiwa umenukuu ule ujumbe wa AI
        await sock.sendMessage(chatId, {
            text: 'Zero Tr4sh by Ghost King',
            contextInfo: {
                isAuthedChatBot: true,
                chatBotType: 1
            }
        }, { quoted: fakeAiQuote });

    } catch (error) {
        console.error('FromAI Error:', error);
    }
};

module.exports = fromaiCommand;
