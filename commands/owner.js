const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const settings = require('../settings');
const axios = require('axios');

async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNum = settings.ownerNumber || '255612130873';
        const waUrl = `https://wa.me/${ownerNum}`;
        const chnlUrl = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';
        const imgUrl = 'https://d.uguu.se/LLjViSGg.jpg';

        // Maandishi (Caption)
        const ownerTxt = `👑 *OWNER INFO (TAARIFA ZA MMILIKI)*\n\n` +
                         `🤖 *Bot:* ${settings.botName || 'MICKEY GLITCH'}\n` +
                         `👨‍💻 *Owner:* ${settings.botOwner || 'Mickey'}\n` +
                         `📞 *Contact:* +${ownerNum}\n\n` +
                         `Choose an action below (Chagua huduma) 👇`;

        await sock.sendMessage(chatId, { react: { text: '👤', key: message.key } });

        // Tayarisha picha (Prepare image media)
        const media = await prepareWAMessageMedia(
            { image: { url: imgUrl } }, 
            { upload: sock.waUploadToServer }
        );

        const interactiveMessage = {
            interactiveMessage: {
                header: {
                    title: "Mickey Infor Tech",
                    hasMediaAttachment: true,
                    imageMessage: media.imageMessage
                },
                body: { 
                    text: ownerTxt 
                },
                footer: { 
                    text: "© Mickey Infor Tech • Powered by Mickey" 
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_call",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📞 Call Owner",
                                phone_number: ownerNum
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "💬 Send Message",
                                url: waUrl
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📺 Join Channel",
                                url: chnlUrl
                            })
                        }
                    ]
                }
            }
        };

        const msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: { message: interactiveMessage }
        }, { userJid: sock.user.id, quoted: message });

        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (e) {
        console.error('Owner Cmd Error:', e);
        await sock.sendMessage(chatId, { 
            text: `❌ *Hitilafu (Error):* ${e.message}` 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
