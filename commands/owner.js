// commands/owner.js
const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

const CONFIG = {
    BANNER: 'https://water-billing-292n.onrender.com/1761205727440.png',
    FOOTER: '🌟 MICKEY GLITCH BOT • 2026 🌟',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610'
};

async function ownerCommand(sock, chatId, m, body = '') {
    try {
        // Get owner data
        const ownerNumber = (settings.ownerNumber || '255612130873').replace(/[^\d]/g, '');
        const ownerName = settings.botOwner || 'Mickey Developer';
        const botName = settings.botName || 'MICKEY GLITCH';
        const waLink = `https://wa.me/${ownerNumber}`;

        // TAMBUA INPUT (Inasoma text au majibu ya buttons)
        let input = (
            m.message?.conversation || 
            m.message?.extendedTextMessage?.text || 
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).toLowerCase().trim();

        // 1. HANDLE VCARD BUTTON
        if (input === 'get_vcard' || input === '.get_vcard') {
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
END:VCARD`;

            await sock.sendMessage(chatId, {
                contacts: { 
                    displayName: ownerName, 
                    contacts: [{ vcard }] 
                }
            }, { quoted: m });
            
            await sock.sendMessage(chatId, {
                text: `✅ *VCARD SENT!*\n\nContact for *${ownerName}* has been saved.\n\nTap the contact to start chatting! 👑`,
                react: { text: '📇', key: m.key }
            });
            return;
        }

        // 2. HANDLE OWNER CHAT BUTTON
        if (input === 'owner_chat' || input === '.owner_chat') {
            await sock.sendMessage(chatId, {
                text: `💬 *CHAT WITH OWNER*\n\nClick link below to start conversation:\n${waLink}\n\nOr save contact using 📇 VCARD button.`,
                react: { text: '💬', key: m.key }
            });
            return;
        }

        // 3. HANDLE CHANNEL BUTTON
        if (input === 'owner_channel' || input === '.owner_channel') {
            await sock.sendMessage(chatId, {
                text: `📢 *JOIN CHANNEL*\n\nClick link to join official channel:\n${CONFIG.CHANNEL_LINK}\n\nStay updated with latest features! 🚀`,
                react: { text: '📢', key: m.key }
            });
            return;
        }

        // 4. MAIN MENU - Ikipigwa ".owner"
        if (input === '.owner') {
            await sock.sendMessage(chatId, { react: { text: '👑', key: m.key } });

            const ownerText = `╭━━━━━━━━━━━━━━━━━━╮
┃    👑 *OWNER INFO* 👑
┃━━━━━━━━━━━━━━━━━━
┃
┃ 🤖 *Bot:* ${botName}
┃ 👨‍💻 *Owner:* ${ownerName}
┃ 📞 *Contact:* +${ownerNumber}
┃
┃ ⏰ *Status:* Active
┃ 🌐 *Version:* 3.3
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 *Tap buttons below to connect*`;

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
                    }
                ]
            }, { quoted: m });
        }

    } catch (e) {
        console.error("Owner Command Error:", e);
        await sock.sendMessage(chatId, {
            text: `❌ *Error!*\n\nUse .owner to get owner info.`,
            react: { text: '❌', key: m.key }
        });
    }
}

module.exports = ownerCommand;