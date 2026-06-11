// commands/owner.js
const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIG
// ==========================================
const CONFIG = {
    BANNER: 'https://water-billing-292n.onrender.com/1761205727440.png',
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610',
    SUPPORT_GROUP: 'https://chat.whatsapp.com/YourGroupLink'
};

// ==========================================
// SAFE SETTINGS LOADER
// ==========================================
function loadSettings() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.js');
        if (fs.existsSync(settingsPath)) {
            const settings = require('../settings');
            return {
                ownerNumber: settings.ownerNumber || '255612130873',
                botOwner: settings.botOwner || '𝐌𝐈𝐂𝐊𝐄𝐘 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑',
                botName: settings.botName || settings.botname || '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
                botEmail: settings.botEmail || 'mickeyglitch@gmail.com',
                version: settings.version || '3.3.0'
            };
        }
    } catch (e) {}
    
    return {
        ownerNumber: '255612130873',
        botOwner: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑',
        botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
        botEmail: 'mickeyglitch@gmail.com',
        version: '3.3.0'
    };
}

// ==========================================
// FORMAT NUMBER
// ==========================================
function formatNumber(num) {
    if (!num) return '255612130873';
    return num.toString().replace(/[^\d]/g, '');
}

// ==========================================
// GENERATE VCARD
// ==========================================
function generateVCard(ownerName, ownerNumber, botName, email) {
    return `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName}
ROLE:Bot Owner / Developer
TITLE:👑 MASTER DEVELOPER
TEL;waid=${ownerNumber}:+${ownerNumber}
TEL;TYPE=CELL;TYPE=VOICE;TYPE=pref:+${ownerNumber}
EMAIL;TYPE=work:${email || 'mickeyglitch@gmail.com'}
URL:https://wa.me/${ownerNumber}
NOTE:🌟 Official Owner of ${botName} Bot 🌟\\n\\n💫 Status: Active & Online\\n⚡ Power: Full Access\\n🎮 Role: Creator
REV:${new Date().toISOString()}
END:VCARD`;
}

// ==========================================
// SEND INTERACTIVE MENU - CTA BUTTONS
// ==========================================
async function sendOwnerMenu(sock, chatId, quotedMsg) {
    try {
        const settings = loadSettings();
        const ownerNumber = formatNumber(settings.ownerNumber);
        const waLink = `https://wa.me/${ownerNumber}`;
        
        const ownerText = `╔════════════════════════════╗
║      👑 *𝐎𝐖𝐍𝐄𝐑 𝐈𝐍𝐅𝐎* 👑      ║
╠════════════════════════════╣
║                            ║
║  🤖 *Bot Name*             ║
║  › ${settings.botName}     ║
║                            ║
║  👨‍💻 *Developer*            ║
║  › ${settings.botOwner}    ║
║                            ║
║  📞 *Contact*              ║
║  › +${ownerNumber}         ║
║                            ║
║  📧 *Email*                ║
║  › ${settings.botEmail}    ║
║                            ║
║  ⏰ *Status*               ║
║  › 🟢 Active & Online      ║
║                            ║
║  🌐 *Version*              ║
║  › ${settings.version}     ║
║                            ║
╠════════════════════════════╣
║  📌 *Tap buttons below*     ║
╚════════════════════════════╝`;

        // CTA BUTTONS - 3 tu
        const interactiveMessage = {
            image: { url: CONFIG.BANNER },
            text: ownerText,
            footer: CONFIG.FOOTER,
            contextInfo: {
                externalAdReply: {
                    title: `${settings.botName} • Owner Info`,
                    body: `Contact: ${settings.botOwner}`,
                    thumbnailUrl: CONFIG.BANNER,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            },
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 𝐂𝐎𝐏𝐘 𝐍𝐔𝐌𝐁𝐄𝐑",
                        id: "owner_copy",
                        copy_text: ownerNumber
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "💬 𝐂𝐇𝐀𝐓 𝐎𝐖𝐍𝐄𝐑",
                        id: "owner_chat",
                        url: waLink
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📇 𝐒𝐀𝐕𝐄 𝐂𝐎𝐍𝐓𝐀𝐂𝐓",
                        id: "owner_save"
                    })
                }
            ]
        };

        return await sendInteractiveMessage(sock, chatId, interactiveMessage, { quoted: quotedMsg });
    } catch (error) {
        console.error('Error sending owner menu:', error);
        throw error;
    }
}

// ==========================================
// MAIN COMMAND HANDLER
// ==========================================
async function ownerCommand(sock, chatId, message, body = '') {
    try {
        // SAFETY CHECKS
        const safeMessage = message || {};
        const safeKey = safeMessage.key || { remoteJid: chatId };
        
        // Load settings
        const settings = loadSettings();
        const ownerNumber = formatNumber(settings.ownerNumber);
        const ownerName = settings.botOwner;
        const botName = settings.botName;
        const botEmail = settings.botEmail;
        const waLink = `https://wa.me/${ownerNumber}`;
        
        // INPUT DETECTION
        let input = '';
        
        if (body && typeof body === 'string') {
            input = body.toLowerCase().trim();
        }
        
        if (!input && safeMessage.message) {
            try {
                if (safeMessage.message.conversation) {
                    input = safeMessage.message.conversation.toLowerCase().trim();
                } else if (safeMessage.message.extendedTextMessage?.text) {
                    input = safeMessage.message.extendedTextMessage.text.toLowerCase().trim();
                } else if (safeMessage.message.buttonsResponseMessage?.selectedButtonId) {
                    input = safeMessage.message.buttonsResponseMessage.selectedButtonId.toLowerCase().trim();
                }
            } catch(e) {}
        }
        
        // Button ID mapping
        const buttonActions = {
            'owner_copy': 'copy',
            'owner_chat': 'chat',
            'owner_save': 'save',
            'copy_number': 'copy',
            'chat_owner': 'chat',
            'save_contact': 'save',
            'get_vcard': 'save'
        };
        
        let action = buttonActions[input] || input;
        
        console.log('👑 Owner Command:', { input, action });
        
        // ==========================================
        // HANDLE COPY NUMBER (CTA COPY)
        // ==========================================
        if (action === 'copy' || action === '.copy_number') {
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '📋', key: safeKey } 
                });
            } catch(e) {}
            
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📋 *𝐍𝐔𝐌𝐁𝐄𝐑 𝐂𝐎𝐏𝐈𝐄𝐃* 📋
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 👑 *Owner:* ${ownerName}
┃ 📞 *Number:* +${ownerNumber}
┃
┃ ✅ *Number copied to clipboard!*
┃
┃ 💬 *Start chatting now*
┃
╰━━━━━━━━━━━━━━━━━━━━╯

📌 *Tap CHAT OWNER button to start*`
            }, { quoted: safeMessage });
            return;
        }
        
        // ==========================================
        // HANDLE CHAT OWNER (CTA URL)
        // ==========================================
        if (action === 'chat' || action === '.chat_owner') {
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '💬', key: safeKey } 
                });
            } catch(e) {}
            
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  💬 *𝐂𝐇𝐀𝐓 𝐖𝐈𝐓𝐇 𝐎𝐖𝐍𝐄𝐑* 💬
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 👑 *${ownerName}*
┃ 📞 *+${ownerNumber}*
┃
┃ ⚡ *Click link below:*
┃ ${waLink}
┃
┃ 💡 *Owner is usually online*
┃    within minutes!
┃
╰━━━━━━━━━━━━━━━━━━━━╯

_✨ Feel free to reach out for help or collaboration!_`
            }, { quoted: safeMessage });
            return;
        }
        
        // ==========================================
        // HANDLE SAVE CONTACT (VCARD)
        // ==========================================
        if (action === 'save' || action === '.save_contact' || action === 'get_vcard') {
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '📇', key: safeKey } 
                });
            } catch(e) {}
            
            try {
                const vcard = generateVCard(ownerName, ownerNumber, botName, botEmail);
                
                // Send vCard as contact
                await sock.sendMessage(chatId, {
                    contacts: { 
                        displayName: ownerName, 
                        contacts: [{ vcard }] 
                    }
                }, { quoted: safeMessage });
                
                // Send confirmation message
                await sock.sendMessage(chatId, {
                    text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  ✅ *𝐂𝐎𝐍𝐓𝐀𝐂𝐓 𝐒𝐀𝐕𝐄𝐃* ✅
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 👑 *Owner:* ${ownerName}
┃ 📞 *Number:* +${ownerNumber}
┃ 🤖 *Bot:* ${botName}
┃
┃ 💾 *VCARD sent successfully!*
┃
┃ ✨ Tap the contact card
┃    to save and chat!
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
                });
                
            } catch (vcardError) {
                console.error('VCARD Error:', vcardError);
                await sock.sendMessage(chatId, {
                    text: `❌ *Failed to send vCard*\n\n📞 *Manual contact:*\n+${ownerNumber}\n\n💬 *Chat link:*\n${waLink}`
                }, { quoted: safeMessage });
            }
            return;
        }
        
        // ==========================================
        // MAIN MENU (.owner)
        // ==========================================
        if (action === '.owner' || action === 'owner' || action === 'menu' || action === '') {
            // Send reaction
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '👑', key: safeKey } 
                });
            } catch(e) {}
            
            try {
                await sendOwnerMenu(sock, chatId, safeMessage);
            } catch (error) {
                console.error('Menu error:', error);
                // Fallback menu
                await sock.sendMessage(chatId, {
                    text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  👑 *𝐎𝐖𝐍𝐄𝐑 𝐈𝐍𝐅𝐎* 👑
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 👨‍💻 *Name:* ${ownerName}
┃ 📞 *Number:* +${ownerNumber}
┃ 📧 *Email:* ${botEmail}
┃
┃ 📌 *Commands:*
┃ • .copy_number
┃ • .chat_owner  
┃ • .save_contact
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
                }, { quoted: safeMessage });
            }
            return;
        }
        
        // ==========================================
        // IF NOT MATCHED
        // ==========================================
        if (action && action !== '') {
            await sock.sendMessage(chatId, {
                text: `❌ *Unknown option: ${action}*\n\n📝 *Use .owner to see available options*`
            });
        }
        
    } catch (error) {
        console.error("❌ Owner Command Error:", error);
        try {
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  ❌ *𝐄𝐑𝐑𝐎𝐑* ❌
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔴 *Something went wrong!*
┃
┃ 📝 *Error:* ${error.message?.substring(0, 100) || 'Unknown'}
┃
┃ 💡 *Try:*
┃ • Use .owner again
┃ • Check connection
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            });
        } catch(e) {}
    }
}

module.exports = ownerCommand;