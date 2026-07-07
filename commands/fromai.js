/**
 * fromai.js - From AI Command using MessageBuilder v4.6
 * Creator: Ghost King
 * Description: Sends message with AI badge using MessageBuilder
 */

const { MessageBuilder } = require('baileys-mbuilder');

/**
 * Main command handler for fromai
 */
const fromaiCommand = async (sock, chatId, message) => {
    console.log('[fromai] invoked for', chatId, 'from', message.key?.participant || message.key?.remoteJid);

    try {
        // Kuunda AI Rich Response kwa MessageBuilder
        const aiMessage = new MessageBuilder()
            .text('Zero Tr4sh by Ghost King')
            .contextInfo({
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
            })
            .build();

        // Kutuma ujumbe kwa AI Rich Response
        await sock.sendMessage(chatId, {
            text: aiMessage.text,
            contextInfo: aiMessage.contextInfo
        }, { 
            quoted: message,
            ephemeralExpiration: 0 
        });

        console.log('[fromai] AI Rich Response sent successfully with MessageBuilder v4.6');

    } catch (error) {
        console.error('[fromai] Error with MessageBuilder:', error && error.message ? error.message : error);
        
        // Fallback: Tuma ujumbe wa kawaida
        try {
            await sock.sendMessage(chatId, { 
                text: 'Zero Tr4sh by Ghost King' 
            }, { quoted: message });
            
            console.log('[fromai] Fallback message sent');
            
        } catch (finalError) {
            console.error('[fromai] All methods failed:', finalError && finalError.message ? finalError.message : finalError);
            throw finalError;
        }
    }
};

module.exports = fromaiCommand;