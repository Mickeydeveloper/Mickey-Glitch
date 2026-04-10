const settings = require('../settings');

/**
 * Owner Command - Maelezo ya Mmiliki wa Bot
 * Inatumia gifted-btns (interactiveButtons)
 */
async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255615944741';
        const waLink = `https://wa.me/${ownerNumberRaw}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';

        const ownerText = `👑 *OWNER INFORMATION*

*Bot Name:* ${settings.botName || 'MICKEY GLITCH'}
*Owner:* ${settings.botOwner || 'Mickey Developer'}
*Contact:* +${ownerNumberRaw}

Unaweza:
• Piga simu moja kwa moja
• Tumia message
• Jiunge na Channel`;

        await sock.sendMessage(chatId, {
            text: ownerText,
            interactiveButtons: [
                { 
                    name: 'cta_call', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📞 Piga Owner', 
                        phone_number: ownerNumberRaw 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '💬 Tumia Message', 
                        url: waLink 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📺 Jiunge Channel', 
                        url: channelLink 
                    }) 
                }
            ],
            footer: "Mickey Glitch Tech • Powered by LOFT"
        }, { quoted: message });

    } catch (error) {
        console.error('Owner Command Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Hitilafu imetokea wakati wa kuonyesha maelezo ya Owner.*'
        }, { quoted: message });
    }
}

module.exports = ownerCommand;