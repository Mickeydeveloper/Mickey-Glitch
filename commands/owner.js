const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

/**
 * Owner Command - With Working Buttons (gifted-btns)
 */
async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255612130873';
        const waLink = `https://wa.me/${ownerNumberRaw}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610'; // Badilisha kama unataka

        const ownerText = `👑 *OWNER INFORMATION*

*Bot Name:* ${settings.botName || 'MICKEY GLITCH'}
*Owner:* ${settings.botOwner || 'Mickey'}
*Contact:* +${ownerNumberRaw}

Unaweza kuchagua moja kati ya hizi 👇`;

        await sendInteractiveMessage(sock, chatId, {
            text: ownerText,
            interactiveButtons: [
                { 
                    name: 'cta_call', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📞 Piga Simu Owner', 
                        phone_number: ownerNumberRaw 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '💬 Tumia Message (WhatsApp)', 
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