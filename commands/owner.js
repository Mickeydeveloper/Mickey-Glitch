const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

const CONFIG = {
    FOOTER: '👑 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ • 𝟸𝟶𝟸𝟼 👑',
    OWNER_PHONE: '255615944741',
    IMAGES: [
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Water/main/privacy/privacy1.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Water/main/privacy/privacy2.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Water/main/privacy/privacy3.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Water/main/privacy/privacy4.jpg'
    ]
};

async function ownerCommand(sock, chatId, message) {
    try {
        const cards = [
            { 
                title: "🛡️ ᴍɪᴄᴋᴇʏ ᴘʀɪᴠᴀᴄʏ 🛡️", 
                text: "Ulinzi wa faragha yako ndio kipaumbele chetu kikuu. Mfumo wa Mickey Glitch hautunzi taarifa zako binafsi, chats, wala namba za siri kwenye server zetu.", 
                image: CONFIG.IMAGES[0] 
            },
            { 
                title: "🔐 ᴇɴᴅ-ᴛᴏ-ᴇɴᴅ ᴇɴᴄʀʏᴘᴛɪᴏɴ", 
                text: "Mifumo yote inayopita kwenye bot hii inalindwa kwa itifaki thabiti ya usalama (Encryption). Hakuna mtu wa tatu (ikiwemo mimi developer) anayeweza kusoma data zako.", 
                image: CONFIG.IMAGES[1] 
            },
            { 
                title: "⚙️ ᴜsᴇʀ ᴄᴏɴᴛʀᴏʟ & sᴇssɪᴏɴs", 
                text: "Una mamlaka kamili 100% juu ya bot yako. Unaweza kufuta session yako wakati wowote ukitumia amri ya `.clearsession` ili kusafisha data zako zote.", 
                image: CONFIG.IMAGES[2] 
            },
            { 
                title: "📜 ᴛᴇʀᴍs & ᴄᴏᴍᴘʟɪᴀɴᴄᴇ", 
                text: "Kwa kutumia bot hii, unakubali kutumia teknolojia hii kwa malengo halali bila kukiuka sheria za WhatsApp. Tunaamini katika teknolojia salama na yenye uwazi!", 
                image: CONFIG.IMAGES[3] 
            }
        ];

        let cardsPayload = [];
        
        for (const card of cards) {
            const media = await prepareWAMessageMedia({ image: { url: card.image } }, { upload: sock.waUploadToServer });
            
            // Tumetumia Plain Objects {} moja kwa moja, bila protobuffers .create()
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
                                phone_number: `+${CONFIG.OWNER_PHONE}`
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: " WHATSAPP CHAT",
                                url: `https://wa.me/${CONFIG.OWNER_PHONE}`
                            })
                        }
                    ]
                }
            });
        }

        // Muundo mkuu wa Carousel uliosafishwa
        let carouselMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: "🔒 *ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ - ᴘʀɪᴠᴀᴄʏ & sᴇᴄᴜʀɪᴛʏ* 🔒\n\n_Teleza (slide) kushoto kuona vipengele vikuu 4 vya ulinzi wa faragha yako._" },
                        carouselMessage: {
                            cards: cardsPayload
                        }
                    }
                }
            }
        };

        const msg = generateWAMessageFromContent(chatId, carouselMessage, { quoted: message });
        return await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error("❌ Owner Carousel Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu ya Owner: ${error.message}` });
    }
}

module.exports = ownerCommand;
