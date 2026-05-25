const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

/**
 * ownerCommand - MICKEY GLITCH BOT
 * @version 2.0 (Optimized)
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
        if (m.key) {
            sock.sendMessage(chatId, { react: { text: '👑', key: m.key } }).catch(() => {});
        }

        // Optimized message - shorter text = faster
        const ownerText = `👑 *OWNER INFO*

*Bot:* ${botName}
*Owner:* ${ownerName}
*Contact:* +${ownerNumber}

📌 *Tap button below to connect*`;

        // Send interactive message
        await sendInteractiveMessage(sock, chatId, {
            text: ownerText,
            image: { url: imageUrl },
            footer: "Mickey Glitch • 2026",
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
        }, { quoted: m });

    } catch (e) {
        console.error('Owner Error:', e);
        // Fallback - plain text only (faster)
        await sock.sendMessage(chatId, { 
            text: '👑 *Owner:* ' + (settings.botOwner || 'Mickeymozy') + '\n📞 *Contact:* wa.me/' + (settings.ownerNumber || '255612130873')
        }).catch(() => {});
    }
}

module.exports = ownerCommand;