const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    OWNER_PHONE: '255615944741', // Namba uliyotaka
    IMAGES: [
        'https://files.catbox.moe/h85xpq.jpg',
        'https://files.catbox.moe/hvyjsr.jpg',
        'https://files.catbox.moe/efh3k3.jpg'
    ]
};

async function ownerCommand(sock, chatId, message) {
    try {
        // Data za kadi tatu tofauti
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

        // Kuandaa kadi za carousel
        const cardsPayload = cards.map(card => ({
            header: {
                hasMediaAttachment: true,
                imageMessage: { url: card.image }
            },
            body: { text: card.title + "\n\n" + card.text },
            footer: { text: CONFIG.FOOTER },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_call",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📞 CALL OWNER",
                            phone_number: `+${CONFIG.OWNER_PHONE}`
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
            }
        }));

        const interactiveMessage = {
            body: { text: "👑 *MICKEY GLITCH - OWNER INFO CAROUSEL*" },
            carouselMessage: { cards: cardsPayload }
        };

        const sendOptions = message?.key ? { quoted: message } : {};
        
        // Kutumia sendInteractiveMessage (Make sure library yako ina support carousel)
        return await sendInteractiveMessage(sock, chatId, interactiveMessage, sendOptions);

    } catch (error) {
        console.error("❌ Owner Carousel Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` });
    }
}

module.exports = ownerCommand;
