const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

/**
 * ownerCommand - MICKEY GLITCH BOT (IMPROVED)
 * @version 3.1 (VCARD BUTTON FIXED)
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

        // Handle vcard request (kutambua button ukibonyezwa)
        const cmd = (body || '').toLowerCase().trim();
        if (cmd === 'get_vcard' || cmd === '.get_vcard' || cmd === 'get_vcard_command') {
            // Create proper VCard format
            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName}
TITLE:BOT OWNER
TEL;waid=${ownerNumber}:+${ownerNumber}
TEL;TYPE=CELL:+${ownerNumber}
EMAIL:${settings.botEmail || 'mickeyglitch@gmail.com'}
URL:${waLink}
NOTE:Bot Owner Contact - ${botName}
X-WA-BIZ-NAME:${botName}
X-WA-BIZ-DESC:Official WhatsApp Bot
END:VCARD`;

            // Send VCard with nice display
            await sock.sendMessage(chatId, {
                contacts: { 
                    displayName: ownerName, 
                    contacts: [{ vcard }] 
                }
            }, { quoted: m });
            
            // Optional: Send confirmation message
            await sock.sendMessage(chatId, {
                text: `✅ *VCARD SENT!*\n\nContact for *${ownerName}* has been saved to your phone.\n\nTap the contact to start chatting! 👑`,
                react: { text: '📇', key: m.key }
            }).catch(() => {});
            
            return;
        }

        // Quick reaction (non-blocking)
        if (m?.key) {
            sock.sendMessage(chatId, { react: { text: '👑', key: m.key } }).catch(() => {});
        }

        // ============ IMPROVED MESSAGE APPEARANCE ============
        const ownerText = `╭━━━━━━━━━━━━━━━╮
┃   👑 *OWNER INFO* 👑
┃━━━━━━━━━━━━━━━━
┃
┃ 🤖 *Bot:* ${botName}
┃ 👨‍💻 *Owner:* ${ownerName}
┃ 📞 *Contact:* +${ownerNumber}
┃
┃ ⏰ *Status:* Active
┃ 🌐 *Version:* 3.1
┃
╰━━━━━━━━━━━━━━━╯

📌 *Tap buttons below to connect*`;

        // ============ IMPROVED BUTTONS WITH VCARD SUPPORT ============
        try {
            // Try using sendInteractiveMessage first
            await sendInteractiveMessage(sock, chatId, {
                text: ownerText,
                footer: "🌟 MICKEY GLITCH BOT • 2026 🌟",
                image: imageUrl,
                interactiveButtons: [
                    { 
                        name: 'cta_url', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '💬 DIRECT CHAT', 
                            url: waLink 
                        }) 
                    },
                    { 
                        name: 'quick_reply', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📇 SAVE VCARD', 
                            id: 'get_vcard'  // Hii itatambuliwa na button
                        }) 
                    },
                    { 
                        name: 'cta_url', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📢 JOIN CHANNEL', 
                            url: channelLink 
                        }) 
                    }
                ]
            });
        } catch (interactiveError) {
            console.error('Interactive message failed, using fallback:', interactiveError.message);

            // ============ FALLBACK: Normal buttons ============
            await sock.sendMessage(chatId, {
                text: ownerText,
                footer: "🌟 MICKEY GLITCH BOT • 2026 🌟",
                buttons: [
                    { 
                        buttonId: 'owner_chat', 
                        buttonText: { displayText: '💬 DIRECT CHAT' }, 
                        type: 1 
                    },
                    { 
                        buttonId: 'get_vcard',  // ID inayotambulika
                        buttonText: { displayText: '📇 SAVE VCARD' }, 
                        type: 1 
                    },
                    { 
                        buttonId: 'owner_channel', 
                        buttonText: { displayText: '📢 JOIN CHANNEL' }, 
                        type: 1 
                    }
                ],
                viewOnce: true,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363123456789@newsletter',
                        newsletterName: 'MICKEY GLITCH',
                        serverMessageId: 1
                    }
                }
            }, { quoted: m });
        }

    } catch (e) {
        console.error('Owner Error:', e);
        // ============ ULTIMATE FALLBACK ============
        const fallbackText = `╭━━━━━━━━━━━━━━━╮
┃ 👑 *OWNER INFO* 👑
┃━━━━━━━━━━━━━━━━
┃
┃ 🤖 *Bot:* ${settings.botName || 'MICKEY GLITCH'}
┃ 👨‍💻 *Owner:* ${settings.botOwner || 'Mickey Developer'}
┃ 📞 *Contact:* wa.me/${settings.ownerNumber || '255612130873'}
┃
┃ 📢 *Channel:*
┃ whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610
┃
╰━━━━━━━━━━━━━━━╯

📇 *To save contact:*
Type .get_vcard to receive contact card`;

        await sock.sendMessage(chatId, { 
            text: fallbackText,
            react: { text: '⚠️', key: m?.key }
        }, { quoted: m }).catch(() => {});
    }
}

// Additional handler for button events
async function handleButtonPress(sock, chatId, buttonId, m) {
    if (buttonId === 'get_vcard') {
        const ownerNumber = (settings.ownerNumber || '255612130873').replace(/[^\d]/g, '');
        const ownerName = settings.botOwner || 'Mickey Developer';
        const botName = settings.botName || 'MICKEY GLITCH';
        
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName}
TEL;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

        await sock.sendMessage(chatId, {
            contacts: { 
                displayName: ownerName, 
                contacts: [{ vcard }] 
            }
        }, { quoted: m });
        
        return true;
    }
    return false;
}

module.exports = ownerCommand;
module.exports.handleButtonPress = handleButtonPress;