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

Chagua moja ya vitendo hapa chini 👇`;

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
            footer: "Mickey Glitch Tech • Powered by LOFT",
            contextInfo: {
                externalAdReply: {
                    title: "👑 MICKEY GLITCH OWNER",
                    body: "Developer & Owner wa Bot",
                    thumbnailUrl: "https://d.uguu.se/LLjViSGg.jpg",   // ← Picha uliyopea
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
            text: '❌ *Hitilafu imetokea wakati wa kuonyesha maelezo ya Owner.*' 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;