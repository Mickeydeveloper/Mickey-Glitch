const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');
const axios = require('axios');

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

        // Tuma picha na text pamoja
        try {
            const imageRes = await axios.get('https://d.uguu.se/LLjViSGg.jpg', { responseType: 'arraybuffer', timeout: 10000 });
            await sock.sendMessage(chatId, {
                image: Buffer.from(imageRes.data),
                caption: ownerText
            }, { quoted: message });
        } catch (err) {
            console.error('Image fetch error:', err.message);
            await sock.sendMessage(chatId, { text: ownerText }, { quoted: message });
        }

        // Tuma interactive buttons bila ad reply
        const msgOptions = {
            text: ownerText,
            footer: "Mickey Glitch Tech • Powered by Mickey",
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
