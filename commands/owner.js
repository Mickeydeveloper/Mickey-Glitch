const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg',
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐'
};

async function sendSafeInteractiveMessage(sock, chatId, payload, options = {}) {
    try {
        return await sendInteractiveMessage(sock, chatId, payload, options);
    } catch (error) {
        console.warn('Owner interactive fallback used:', error?.message || error);
        if (payload?.text) {
            await sock.sendMessage(chatId, { text: payload.text, footer: payload.footer }, options);
        }
    }
}

function loadSettings() {
    const defaultSettings = {
        ownerNumber: '255612130873',
        botOwner: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑',
        botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
        botEmail: 'mickeyglitch@gmail.com'
    };
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.js');
        if (fs.existsSync(settingsPath)) {
            return { ...defaultSettings, ...require('../settings') };
        }
    } catch (e) {}
    return defaultSettings;
}

async function ownerCommand(sock, chatId, message) {
    try {
        const settings = loadSettings();
        const ownerNum = settings.ownerNumber.replace(/[^\d]/g, '');
        const safeMessage = message || {};

        const ownerText = `👑 *${settings.botName} - OWNER INFO*\n\n` +
                         `👨‍💻 *Developer:* ${settings.botOwner}\n` +
                         `📞 *Phone:* +${ownerNum}\n` +
                         `📧 *Email:* ${settings.botEmail}\n` +
                         `🟢 *Status:* Active and online for support.`;

        // Payload safi kabisa kuzuia authoring error
        const interactiveMessage = {
            text: ownerText,
            footer: CONFIG.FOOTER,
            header: {
                hasMediaAttachment: true,
                imageMessage: { url: CONFIG.BANNER }
            },
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 COPY NUMBER",
                        id: "copy_num",
                        copy_text: ownerNum
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "💬 CHAT OWNER",
                        id: "chat_own",
                        url: `https://wa.me/${ownerNum}`
                    })
                }
            ]
        };

        return await sendSafeInteractiveMessage(sock, chatId, interactiveMessage, { quoted: safeMessage });
    } catch (error) {
        console.error("❌ Owner Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu: ${error.message}` });
    }
}

module.exports = ownerCommand;
