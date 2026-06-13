const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

const CONFIG = {
    FOOTER: '👑 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ • 𝟸𝟶𝟸𝟼 👑',
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
                title: "👑 ᴅᴇᴠᴇʟᴏᴘᴇʀ ᴘʀᴏғɪʟᴇ", 
                text: "Mimi ni Mickey Developer, mtengenezaji mkuu wa mifumo na WhatsApp bots chini ya jina Mickey Glitch. Karibu kwenye ulimwengu wa teknolojia ya kisasa!", 
                image: CONFIG.IMAGES[0] 
            },
            { 
                title: "🚀 sᴘᴇᴄɪᴀʟ sᴋɪʟʟs", 
                text: "Nabobea katika lugha ya JavaScript (Node.js), usalama wa mifumo (Cybersecurity), na kutatua matatizo (Debugging). Kila script hapa imetengenezwa kwa umakini mkubwa.", 
                image: CONFIG.IMAGES[1] 
            },
            { 
                title: "📞 ᴄᴏɴᴛᴀᴄᴛ & sᴜᴘᴘᴏʀᴛ", 
                text: "Unahitaji msaada, script maalum (custom bot), au unataka kufanya biashara? Bofya kitufe cha 'CALL OWNER' hapo chini.", 
                image: CONFIG.IMAGES[2] 
            }
        ];

        let cardsPayload = [];
        
        for (const card of cards) {
            const media = await prepareWAMessageMedia({ image: { url: card.image } }, { upload: sock.waUploadToServer });
            
            // Tumeondoa kabisa ".create" na kutumia Plain Object
            cardsPayload.push({
                header: {
                    title: card.title,
                    hasMediaAttachment: true,
                    imageMessage: media.imageMessage
                },
                body: { text: card.text },
                footer: { text: CONFIG.FOOTER },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_call",
                            buttonParamsJson: JSON.stringify({
                                display_text: " CALL OWNER",
                                phone_number: CONFIG.OWNER_PHONE
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: " CHAT WITH ME",
                                url: `https://wa.me/${CONFIG.OWNER_PHONE}`
                            })
                        }
                    ]
                }
            });
        }

        let msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: "✨ *ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴏᴡɴᴇʀ ᴄᴀʀᴏᴜsᴇʟ* ✨\n\n_Gusa na uteleze (slide) kushoto kuona kadi zote._" },
                        carouselMessage: {
                            cards: cardsPayload
                        }
                    }
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
