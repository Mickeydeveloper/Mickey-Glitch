const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNum = settings.ownerNumber || '255612130873';
        const waUrl = `https://wa.me/${ownerNum}`;
        const chnlUrl = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';
        const imgUrl = 'https://d.uguu.se/LLjViSGg.jpg';

        const ownerTxt = `👑 *OWNER INFO (TAARIFA ZA MMILIKI)*\n\n` +
                         `🤖 *Bot:* ${settings.botName || 'MICKEY GLITCH'}\n` +
                         `👨‍💻 *Owner:* ${settings.botOwner || 'Mickey'}\n` +
                         `📞 *Contact:* +${ownerNum}\n\n` +
                         `Choose an action below (Chagua huduma) 👇`;

        await sock.sendMessage(chatId, { react: { text: '👤', key: message.key } });

        const media = await prepareWAMessageMedia({ image: { url: imgUrl } }, { upload: sock.waUploadToServer });

        const msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
                        body: { text: ownerTxt },
                        footer: { text: "© Mickey Infor Tech • Powered by Mickey" },
                        nativeFlowMessage: {
                            buttons: [
                                { name: "cta_call", buttonParamsJson: JSON.stringify({ display_text: "📞 Call Owner", phone_number: ownerNum }) },
                                { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "💬 Send Message", url: waUrl }) },
                                { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📺 Join Channel", url: chnlUrl }) }
                            ]
                        }
                    }
                }
            }
        }, { userJid: sock.user.id, quoted: message });

        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (e) {
        console.error('Owner Error:', e);
    }
}

module.exports = ownerCommand;
