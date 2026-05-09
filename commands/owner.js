const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

/**
 * ownerCommand - Mickey Glitch Bot Owner Info
 * Inajumuisha Button Handler na vCard Auto-Send
 */
async function ownerCommand(sock, chatId, message, body = '') {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255612130873';
        const ownerName = settings.botOwner || 'Mickey Developer';
        const botName = settings.botName || 'MICKEY GLITCH';
        
        // Safisha namba kwa ajili ya vCard na Links
        const cleanNumber = ownerNumberRaw.replace(/[^\d]/g, '');
        const waLink = `https://wa.me/${cleanNumber}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';

        // 1. [BUTTON HANDLER] - Kushughulikia akibonyeza "Get Business Card"
        const input = (body || '').toLowerCase().trim();
        if (input === 'get_vcard') {
            const vcard = 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `FN:${ownerName}\n` +
                `ORG:${botName} Tech;\n` +
                `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n` +
                'END:VCARD';

            return await sock.sendMessage(chatId, {
                contacts: {
                    displayName: ownerName,
                    contacts: [{ vcard }]
                }
            }, { quoted: message });
        }

        // 2. [MAIN UI] - Kutuma ujumbe wa Owner
        const ownerText = `👑 *BOT OWNER INFORMATION*

*🤖 Bot Name:* ${botName}
*👤 Owner:* ${ownerName}
*📞 Contact:* +${cleanNumber}
*📍 Location:* Dar es Salaam, TZ

_Unahitaji msaada, matengenezo ya bot, au projects za coding? Wasiliana na bosi hapo chini._ 👇`;

        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        const msgOptions = {
            text: ownerText,
            footer: "Mickey Glitch Tech • Innovating the Future",
            image: { url: imageUrl },
            interactiveButtons: [
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '💬 Chat on WhatsApp', 
                        url: waLink 
                    }) 
                },
                { 
                    name: 'quick_reply', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📇 Get Business Card', 
                        id: 'get_vcard' 
                    }) 
                },
                { 
                    name: 'cta_url', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📢 Join Channel', 
                        url: channelLink 
                    }) 
                }
            ]
        };

        await sock.sendMessage(chatId, { react: { text: '👑', key: message.key } });
        await sendInteractiveMessage(sock, chatId, msgOptions, { quoted: message });

    } catch (e) {
        console.error('Owner Cmd Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu:* ' + (e.message || 'Jaribu tena.') 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
module.exports.name = 'owner';
module.exports.category = 'GENERAL';
