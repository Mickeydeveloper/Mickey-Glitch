// commands/owner.js
const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');

// CONFIGURATION - Easy to customize
const CONFIG = {
    BANNER: 'https://water-billing-292n.onrender.com/1761205727440.png',
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610',
    SUPPORT_GROUP: 'https://chat.whatsapp.com/YourGroupLink'
};

// Load settings with fallback
function loadSettings() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.js');
        if (fs.existsSync(settingsPath)) {
            return require('../settings');
        }
    } catch (e) {}
    
    // Default settings if file not found
    return {
        ownerNumber: '255612130873',
        botOwner: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑',
        botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
        botEmail: 'mickeyglitch@gmail.com'
    };
}

// Safe number formatter
function formatNumber(num) {
    if (!num) return '255612130873';
    return num.toString().replace(/[^\d]/g, '');
}

// Generate fancy vCard
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
X-SOCIALPROFILE;TYPE=twitter:https://twitter.com/mickeyglitch
X-SOCIALPROFILE;TYPE=github:https://github.com/Mickeydeveloper
REV:${new Date().toISOString()}
END:VCARD`;
}

// Main command handler
async function ownerCommand(sock, chatId, m, body = '') {
    try {
        // ========== SAFETY CHECKS ==========
        const safeM = m || {};
        const safeKey = safeM.key || { remoteJid: chatId };
        
        // Load settings safely
        const settings = loadSettings();
        const ownerNumber = formatNumber(settings.ownerNumber);
        const ownerName = settings.botOwner || '𝐌𝐈𝐂𝐊𝐄𝐘 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑';
        const botName = settings.botName || '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇';
        const botEmail = settings.botEmail || 'mickeyglitch@gmail.com';
        const waLink = `https://wa.me/${ownerNumber}`;
        
        // ========== INPUT DETECTION (Multiple formats) ==========
        let input = '';
        
        // Try to get input from multiple sources
        if (body && typeof body === 'string') {
            input = body.toLowerCase().trim();
        } else if (safeM.message?.conversation) {
            input = safeM.message.conversation.toLowerCase().trim();
        } else if (safeM.message?.extendedTextMessage?.text) {
            input = safeM.message.extendedTextMessage.text.toLowerCase().trim();
        } else if (safeM.message?.buttonsResponseMessage?.selectedButtonId) {
            input = safeM.message.buttonsResponseMessage.selectedButtonId.toLowerCase().trim();
        } else if (safeM.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            input = safeM.message.listResponseMessage.singleSelectReply.selectedRowId.toLowerCase().trim();
        } else if (safeM.message?.templateButtonReplyMessage?.selectedId) {
            input = safeM.message.templateButtonReplyMessage.selectedId.toLowerCase().trim();
        }
        
        // Remove dot prefix if exists for button IDs
        input = input.replace(/^\./, '');
        
        console.log('👑 Owner Command Triggered:', { input, chatId });
        
        // ========== HANDLE VCARD REQUEST ==========
        if (input === 'get_vcard' || input === 'vcard' || input === 'save_contact') {
            try {
                const vcard = generateVCard(ownerName, ownerNumber, botName, botEmail);
                
                // Send vCard as contact
                await sock.sendMessage(chatId, {
                    contacts: { 
                        displayName: ownerName, 
                        contacts: [{ vcard }] 
                    }
                }, { quoted: safeM });
                
                // Send confirmation message
                await sock.sendMessage(chatId, {
                    text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  ✅ *𝐂𝐎𝐍𝐓𝐀𝐂𝐓 𝐒𝐀𝐕𝐄𝐃* ✅
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 👑 *𝐎𝐰𝐧𝐞𝐫:* ${ownerName}
┃ 📞 *𝐍𝐮𝐦𝐛𝐞𝐫:* +${ownerNumber}
┃ 🤖 *𝐁𝐨𝐭:* ${botName}
┃
┃ 💾 *𝐕𝐂𝐀𝐑𝐃 𝐬𝐞𝐧𝐭!*
┃
┃ ✨ Tap the contact card
┃    to save and chat!
┃
╰━━━━━━━━━━━━━━━━━━━━╯`,
                    contextInfo: {
                        externalAdReply: {
                            title: `${botName} • OWNER`,
                            body: `Contact: ${ownerName}`,
                            thumbnailUrl: CONFIG.BANNER,
                            mediaType: 1
                        }
                    }
                });
                
            } catch (vcardError) {
                console.error('VCARD Error:', vcardError);
                await sock.sendMessage(chatId, {
                    text: `❌ *Failed to send vCard*\n\nSend *${ownerNumber}* manually or use:\n${waLink}`
                });
            }
            return;
        }
        
        // ========== HANDLE CHAT REQUEST ==========
        if (input === 'owner_chat' || input === 'chat' || input === 'contact') {
            const chatMsg = `╭━━━━━━━━━━━━━━━━━━━━╮
┃  💬 *𝐂𝐇𝐀𝐓 𝐖𝐈𝐓𝐇 𝐎𝐖𝐍𝐄𝐑* 💬
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 👑 *${ownerName}*
┃ 📞 *+${ownerNumber}*
┃
┃ ⚡ *Click link below:*
┃ ${waLink}
┃
┃ 📱 *Or save contact using*
┃    📇 *VCARD button*
┃
╰━━━━━━━━━━━━━━━━━━━━╯

_Owner is usually online within minutes!_ ⏰`;

            await sock.sendMessage(chatId, { text: chatMsg });
            return;
        }
        
        // ========== HANDLE CHANNEL REQUEST ==========
        if (input === 'owner_channel' || input === 'channel' || input === 'update') {
            const channelMsg = `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📢 *𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋 𝐂𝐇𝐀𝐍𝐍𝐄𝐋* 📢
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 📡 *𝐉𝐨𝐢𝐧 𝐟𝐨𝐫:*
┃
┃ • Latest updates 🆕
┃ • New features ⚡
┃ • Bot news 📰
┃ • Giveaways 🎁
┃
┃ 🔗 *𝐋𝐢𝐧𝐤:*
┃ ${CONFIG.CHANNEL_LINK}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

_Subscribe to never miss an update!_ 🔔`;

            await sock.sendMessage(chatId, { text: channelMsg });
            return;
        }
        
        // ========== HANDLE SUPPORT GROUP ==========
        if (input === 'support' || input === 'group' || input === 'support_group') {
            const supportMsg = `╭━━━━━━━━━━━━━━━━━━━━╮
┃  👥 *𝐒𝐔𝐏𝐏𝐎𝐑𝐓 𝐆𝐑𝐎𝐔𝐏* 👥
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🤝 *𝐉𝐨𝐢𝐧 𝐭𝐡𝐞 𝐜𝐨𝐦𝐦𝐮𝐧𝐢𝐭𝐲*
┃
┃ • Ask questions ❓
┃ • Report bugs 🐛
┃ • Suggest features 💡
┃ • Get help 🆘
┃
┃ 🔗 *𝐋𝐢𝐧𝐤:*
┃ ${CONFIG.SUPPORT_GROUP}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

_Be respectful and enjoy!_ 🌟`;
            
            await sock.sendMessage(chatId, { text: supportMsg });
            return;
        }
        
        // ========== HANDLE RUNTIME / STATS ==========
        if (input === 'stats' || input === 'runtime' || input === 'info') {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            
            const statsMsg = `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📊 *𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐈𝐒𝐓𝐈𝐂𝐒* 📊
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🤖 *Bot:* ${botName}
┃ 👑 *Owner:* ${ownerName}
┃ ⏱️ *Uptime:* ${uptimeStr}
┃ 📅 *Started:* ${new Date(Date.now() - uptime * 1000).toLocaleString()}
┃
┃ ⚡ *Status:* 🟢 ONLINE
┃ 📦 *Version:* 3.3.0
┃
╰━━━━━━━━━━━━━━━━━━━━╯`;
            
            await sock.sendMessage(chatId, { text: statsMsg });
            return;
        }
        
        // ========== MAIN MENU - .owner command ==========
        if (input === 'owner' || input === '.owner' || input === 'menu' || input === '') {
            // Send reaction
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '👑', key: safeKey } 
                });
            } catch(e) { /* Ignore reaction errors */ }
            
            // Fancy owner info text
            const ownerText = `╔════════════════════════════╗
║      👑 *𝐎𝐖𝐍𝐄𝐑 𝐈𝐍𝐅𝐎* 👑      ║
╠════════════════════════════╣
║                            ║
║  🤖 *Bot Name*             ║
║  › ${botName}              ║
║                            ║
║  👨‍💻 *Developer*            ║
║  › ${ownerName}            ║
║                            ║
║  📞 *Contact*               ║
║  › +${ownerNumber}         ║
║                            ║
║  📧 *Email*                 ║
║  › ${botEmail}             ║
║                            ║
║  ⏰ *Status*                ║
║  › 🟢 Active & Online      ║
║                            ║
║  🌐 *Version*               ║
║  › 3.3.0 - Stable         ║
║                            ║
╠════════════════════════════╣
║  📌 *Tap buttons below*     ║
║     to connect instantly!   ║
╚════════════════════════════╝`;

            // Send interactive message
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: ownerText,
                footer: CONFIG.FOOTER,
                interactiveButtons: [
                    { 
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "💬 CHAT OWNER",
                            id: "owner_chat"
                        })
                    },
                    { 
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📇 SAVE VCARD",
                            id: "get_vcard"
                        })
                    },
                    { 
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📢 JOIN CHANNEL",
                            id: "owner_channel"
                        })
                    },
                    { 
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "👥 SUPPORT",
                            id: "support"
                        })
                    },
                    { 
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📊 STATS",
                            id: "stats"
                        })
                    }
                ]
            }, { quoted: safeM });
        }
        
        // ========== FALLBACK: If unknown input but command triggered ==========
        await sock.sendMessage(chatId, {
            text: `❌ *Unknown option!*\n\n📝 *Usage:* .owner\n\nThen tap the buttons below 👇`
        });
        
    } catch (error) {
        // ========== ERROR HANDLING ==========
        console.error("❌ Owner Command Error:", error);
        
        // Try to send error message safely
        try {
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  ❌ *𝐄𝐑𝐑𝐎𝐑* ❌
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔴 *Something went wrong!*
┃
┃ 📝 *Error:* ${error.message.substring(0, 100)}
┃
┃ 💡 *Try:*
┃ • Use .owner again
┃ • Check connection
┃ • Contact support
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            });
        } catch(e) {
            // Ultimate fallback
            console.error("Fatal: Cannot send error message", e);
        }
    }
}

module.exports = ownerCommand;