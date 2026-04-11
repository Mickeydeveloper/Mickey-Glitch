const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

/**
 * Owner Command - With Working Buttons + WhatsApp Ad Style Image
 */
async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255612130873';
        const waLink = `https://wa.me/${ownerNumberRaw}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';

        const ownerText = `👑 *OWNER INFORMATION*

*Bot Name:* ${settings.botName || 'MICKEY GLITCH'}
*Owner:* ${settings.botOwner || 'Mickey'}
*Contact:* +${ownerNumberRaw}

Choose an action from the options below 👇`;

        await sendInteractiveMessage(sock, chatId, {
            text: ownerText,
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
            ],
            footer: "Mickey Glitch Tech • Powered by LOFT",
            contextInfo: {
                externalAdReply: {
                    title: "👑 MICKEY GLITCH OWNER",
                    body: "Bot Developer & Owner",
                    thumbnailUrl: "https://d.uguu.se/LLjViSGg.jpg",
                    sourceUrl: "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        }, { quoted: message });

    } catch (error) {
        console.error('Owner Command Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *An error occurred while displaying Owner information.*' 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
