const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255612130873';
        const waLink = `https://wa.me/${ownerNumberRaw}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';

        const ownerText = `👑 *OWNER INFO*

*Bot Name:* ${settings.botName || 'MICKEY GLITCH'}
*Owner:* ${settings.botOwner || 'Mickey'}
*Contact:* +${ownerNumberRaw}

Choose an action below 👇`;

        // Hakikisha unapitisha contextInfo hapa
        const msgOptions = {
            text: ownerText,
            footer: "Mickey Glitch Tech • Powered by LOFT",
            contextInfo: {
                externalAdReply: {
                    title: "👑 MICKEY GLITCH OWNER",
                    body: "Bot Developer & Owner",
                    thumbnailUrl: "https://d.uguu.se/LLjViSGg.jpg",
                    sourceUrl: channelLink,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            },
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
        };

        await sendInteractiveMessage(sock, chatId, msgOptions, { quoted: message });

    } catch (e) {
        console.error('Owner Cmd Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Error occurred! (Hitilafu imetokea)*' 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
