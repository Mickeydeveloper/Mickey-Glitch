const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const CONFIG = {
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    OWNER_PHONE: '255615944741',
    IMAGES: [
        'https://files.catbox.moe/h85xpq.jpg',
        'https://files.catbox.moe/hvyjsr.jpg',
        'https://files.catbox.moe/efh3k3.jpg'
    ]
};

async function ownerCommand(sock, chatId, message) {
    try {
        const cards = [
            {
                title: "👨‍💻 Developer Profile",
                text: "Mimi ni Mickey, mwanzilishi wa Mickey Glitch. Napenda teknolojia na kutengeneza bots.",
                image: CONFIG.IMAGES[0]
            },
            {
                title: "🚀 Professional Skills",
                text: "Nabobea katika Node.js, WhatsApp Automation, na System Security. Karibu kwa huduma.",
                image: CONFIG.IMAGES[1]
            },
            {
                title: "📞 Contact Support",
                text: "Unahitaji msaada au biashara? Bofya kitufe hapo chini ili unipigie simu moja kwa moja.",
                image: CONFIG.IMAGES[2]
            }
        ];

        // Kutayarisha kila kadi moja baada ya nyingine
        let cardsPayload = [];
        for (const card of cards) {
            const media = await sock.prepareMessageMedia({ image: { url: card.image } }, { upload: sock.waUploadToServer });
            
            cardsPayload.push({
                header: proto.Message.InteractiveMessage.Header.create({
                    title: card.title,
                    hasMediaAttachment: true,
                    imageMessage: media.imageMessage
                }),
                body: proto.Message.InteractiveMessage.Body.create({ text: card.text }),
                footer: proto.Message.InteractiveMessage.Footer.create({ text: CONFIG.FOOTER }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: [
                        {
                            name: "cta_call",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📞 CALL OWNER",
                                phone_number: CONFIG.OWNER_PHONE
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "💬 WHATSAPP",
                                url: `https://wa.me/${CONFIG.OWNER_PHONE}`
                            })
                        }
                    ]
                })
            });
        }

        // Kuunganisha kadi zote kwenye Carousel imara
        let msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: "👑 *MICKEY GLITCH - OWNER INFO CAROUSEL*" }),
                        carouselMessage: proto.Message.CarouselMessage.create({
                            cards: cardsPayload
                        })
                    })
                }
            }
        }, { quoted: message });

        return await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error("❌ Owner Carousel Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu ya Owner: ${error.message}` });
    }
}

module.exports = ownerCommand;
