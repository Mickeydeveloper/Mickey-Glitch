const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const axios = require('axios');

const FOOTER = '© Mickey Glith ™';

async function getppCommand(sock, chatId, senderId, message, args) {
    try {
        let targetJid = senderId; // Default ni mtumaji

        // 1. Angalia kama kuna aliye-tagiwa au namba iliyoandikwa
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0) {
            targetJid = mentionedJids[0];
        } else if (args.length > 0) {
            const num = args[0].replace(/[^0-9]/g, '');
            if (num.length >= 10) targetJid = num + '@s.whatsapp.net';
        }

        // 2. Tafuta Jina la Muhusika
        let displayName = targetJid.split('@')[0]; // Fallback ya namba
        if (global.store && global.store.contacts[targetJid]) {
            displayName = global.store.contacts[targetJid].name || global.store.contacts[targetJid].notify || displayName;
        } else if (message.pushName && targetJid === senderId) {
            displayName = message.pushName;
        }

        // 3. Pakua Picha ya Profaili
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (err) {
            return sock.sendMessage(chatId, { text: `❌ Muhusika *@${displayName}* hana picha ya profaili.` }, { quoted: message });
        }

        // 4. Maandalizi ya Card ya Picha (Image from Ad Style)
        const media = await prepareWAMessageMedia({ image: { url: ppUrl } }, { upload: sock.waUploadToServer });

        const cardMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: `👤 PROFILE: ${displayName.toUpperCase()}`,
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
                        },
                        body: {
                            text: `✨ *Picha ya Profaili Imepatikana!*\n\n📋 *Jina:* ${displayName}\n🆔 *ID:* ${targetJid.split('@')[0]}\n\n_Gusa picha hapo juu ili kuona kubwa au kuipakua kwenye simu yako._`
                        },
                        footer: { text: FOOTER },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "💬 Chat nae",
                                        url: `https://wa.me/${targetJid.split('@')[0]}`
                                    })
                                }
                            ],
                            version: 3
                        }
                    }
                }
            }
        };

        const msg = generateWAMessageFromContent(chatId, cardMessage, { quoted: message });
        return await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (err) {
        console.error('GetPP Card Error:', err);
        await sock.sendMessage(chatId, { text: `❌ Imeshindwa kupata kadi ya picha: ${err.message}` });
    }
}

module.exports = getppCommand;
