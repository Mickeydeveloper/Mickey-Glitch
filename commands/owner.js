const settings = require('../settings');

/**
 * Handles the Owner Information Command
 * Improvements: Better UI, centralized error handling, and streamlined flow.
 */
async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255615944741';
        const waLink = `https://wa.me/${ownerNumberRaw}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';

        await sock.sendMessage(chatId, {
            text: `*👑 ${settings.botOwner}\n\n📱 Contact: +${ownerNumberRaw}\n💼 Developer of ${settings.botName}*`,
            interactiveButtons: [
                { 
                    name: 'cta_call', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📞 Call Owner', 
                        phone_number: ownerNumberRaw 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '💬 Send Message', 
                        url: waLink 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📺 Join Channel', 
                        url: channelLink 
                    }) 
                }
            ]
        }, { quoted: message });

    } catch (error) {
        console.error('Owner Command Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Error:* Failed to retrieve owner details. Please contact support.'
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
