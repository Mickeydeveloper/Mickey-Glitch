const settings = require('../settings');

/**
 * Halotel Command - Payment Numbers (Copy + Call)
 * Muundo sawa na ownerCommand
 */
async function halotelCommand(sock, chatId, message) {
    try {
        const paymentText = `💰 *MICKEY GLITCH - LIPIA BOT*

Chagua mtandao wa kulipa. Namba itakopiwa moja kwa moja ukibonyeza button.`;

        await sock.sendMessage(chatId, {
            text: paymentText,
            interactiveButtons: [
                { 
                    name: 'cta_copy', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📋 HALOTEL', 
                        copy_code: '0615944741' 
                    }) 
                },
                { 
                    name: 'cta_copy', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📋 YAS', 
                        copy_code: '0711765335' 
                    }) 
                },
                { 
                    name: 'cta_copy', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📋 AZAMPESA', 
                        copy_code: '1615944741' 
                    }) 
                },
                { 
                    name: 'cta_call', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📞 Piga Halotel', 
                        phone_number: '0615944741' 
                    }) 
                }
            ],
            footer: "Mickey Glitch Tech • Powered by LOFT"
        }, { quoted: message });

    } catch (error) {
        console.error('Halotel Command Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Hitilafu imetokea wakati wa kufungua menu ya malipo.*'
        }, { quoted: message });
    }
}

module.exports = halotelCommand;