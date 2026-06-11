const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIG
// ==========================================
const CONFIG = {
    BANNER: 'https://water-billing-292n.onrender.com/1761205727440.png',
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐'
};

function loadSettings() {
    const defaultSettings = {
        ownerNumber: '255612130873',
        botOwner: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑',
        botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
        botEmail: 'mickeyglitch@gmail.com',
        version: '3.3.0'
    };

    try {
        const settingsPath = path.join(__dirname, '..', 'settings.js');
        if (fs.existsSync(settingsPath)) {
            const userSettings = require('../settings');
            return { ...defaultSettings, ...userSettings };
        }
    } catch (e) { console.error('Settings load error:', e); }
    return defaultSettings;
}

// ==========================================
// MAIN COMMAND HANDLER
// ==========================================
async function ownerCommand(sock, chatId, message, body = '') {
    try {
        const settings = loadSettings();
        const ownerNumber = settings.ownerNumber.replace(/[^\d]/g, '');
        const waLink = `https://wa.me/${ownerNumber}`;
        const safeMessage = message || {};
        const safeKey = safeMessage.key || { remoteJid: chatId };

        // Input Detection
        let input = (body || '').toLowerCase().trim();
        if (!input && safeMessage.message) {
            const msg = safeMessage.message;
            input = (msg.conversation || msg.extendedTextMessage?.text || 
                    msg.buttonsResponseMessage?.selectedButtonId || '').toLowerCase().trim();
        }

        // 1. ACTION: COPY NUMBER
        if (['owner_copy', 'copy'].includes(input)) {
            return await sock.sendMessage(chatId, { text: `📋 *Namba ya Owner:* +${ownerNumber}` }, { quoted: safeMessage });
        }

        // 2. MAIN MENU (.owner)
        await sock.sendMessage(chatId, { react: { text: '👑', key: safeKey } }).catch(() => {});

        const ownerText = `👑 *${settings.botName} - OWNER INFO*\n\n` +
                         `👨‍💻 *Developer:* ${settings.botOwner}\n` +
                         `📞 *Contact:* +${ownerNumber}\n` +
                         `📧 *Email:* ${settings.botEmail}\n` +
                         `⚡ *Status:* 🟢 Active & Online`;

        const interactiveMessage = {
            image: { url: CONFIG.BANNER },
            text: ownerText,
            footer: CONFIG.FOOTER,
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 COPY NUMBER",
                        id: "owner_copy",
                        copy_text: ownerNumber
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "💬 CHAT OWNER",
                        id: "owner_chat",
                        url: waLink
                    })
                }
            ]
        };

        return await sendInteractiveMessage(sock, chatId, interactiveMessage, { quoted: safeMessage });

    } catch (error) {
        console.error("❌ Owner Command Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu imetokea: ${error.message}` });
    }
}

module.exports = ownerCommand;
