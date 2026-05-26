const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

/**
 * ownerCommand - MICKEY GLITCH BOT
 * @version 3.0 (FIXED)
 * @author Quantum Base Developer
 */

async function ownerCommand(sock, chatId, m, body = '') {
    // Quick validation
    if (!sock || !chatId) return console.error('❌ Missing parameters');

    try {
        // Get owner data with defaults
        const ownerNumber = (settings.ownerNumber || '255612130873').replace(/[^\d]/g, '');
        const ownerName = settings.botOwner || 'Mickey Developer';
        const botName = settings.botName || 'MICKEY GLITCH';

        // Pre-calculate links
        const waLink = `https://wa.me/${ownerNumber}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';
        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        // Handle vcard request (fast response)
        const cmd = (body || '').toLowerCase().trim();
        if (cmd === 'get_vcard' || cmd === '.get_vcard') {
            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName}
TEL;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

            return await sock.sendMessage(chatId, {
                contacts: { displayName: ownerName, contacts: [{ vcard }] }
            }, { quoted: m });
        }

        // Quick reaction (non-blocking)
        if (m?.key) {
            sock.sendMessage(chatId, { react: { text: '👑', key: m.key } }).catch(() => {});
        }

        // ============ FIXED: Proper message format ============
        const ownerText = `👑 *OWNER INFO*

*Bot:* ${botName}
*Owner:* ${ownerName}
*Contact:* +${ownerNumber}

📌 *Tap button below to connect*`;

        // ============ OPTION 1: Try sendInteractiveMessage first ============
        try {
            await sendInteractiveMessage(sock, chatId, {
                text: ownerText,
                footer: "Mickey Glitch • 2026",
                image: imageUrl,  // Some versions use string, not { url }
                interactiveButtons: [
                    { 
                        name: 'cta_url', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '💬 CHAT', 
                            url: waLink 
                        }) 
                    },
                    { 
                        name: 'quick_reply', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📇 VCARD', 
                            id: 'get_vcard' 
                        }) 
                    },
                    { 
                        name: 'cta_url', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📢 CHANNEL', 
                            url: channelLink 
                        }) 
                    }
                ]
            });
        } catch (interactiveError) {
            console.error('Interactive message failed, using fallback:', interactiveError.message);
            
            // ============ OPTION 2: Fallback to normal message with buttons ============
            await sock.sendMessage(chatId, {
                text: ownerText,
                buttons: [
                    { buttonId: 'owner_chat', buttonText: { displayText: '💬 CHAT' }, type: 1 },
                    { buttonId: 'get_vcard', buttonText: { displayText: '📇 VCARD' }, type: 1 },
                    { buttonId: 'owner_channel', buttonText: { displayText: '📢 CHANNEL' }, type: 1 }
                ],
                viewOnce: true
            }, { quoted: m });
        }

    } catch (e) {
        console.error('Owner Error:', e);
        // ============ OPTION 3: Ultimate fallback - plain text only ============
        const fallbackText = `👑 *OWNER INFO*\n\n*Bot:* ${settings.botName || 'MICKEY GLITCH'}\n*Owner:* ${settings.botOwner || 'Mickey Developer'}\n*Contact:* wa.me/${settings.ownerNumber || '255612130873'}\n\n📢 Channel: whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610`;
        
        await sock.sendMessage(chatId, { 
            text: fallbackText
        }, { quoted: m }).catch(() => {});
    }
}

module.exports = ownerCommand;