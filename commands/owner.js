const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

// ==============================================
// 👑 OWNER INFO CONFIG
// ==============================================
const CONFIG = {
    FOOTER: '👑 MICKDADY • PROFILE 👑',
    OWNER: {
        NAME: 'Mickdady',
        PHONE: '255615944741',
        COUNTRY: 'Tanzania',
        TITLE: 'Quantum Base Dev'
    },
    IMAGES: [
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
    ]
};

async function ownerCommand(sock, chatId, message) {
    try {
        // ============================================
        // 📋 PERSONAL INFO CARDS (Taarifa za Mtu)
        // ============================================
        const cards = [
            { 
                title: "👤 ABOUT ME", 
                text: "✨ *MICKDADY*\n\n" +
                      "▪️ *Role:* Quantum Dev\n" +
                      "▪️ *Loc:* Tanzania 🇹🇿\n" +
                      "▪️ *Status:* Available",
                image: CONFIG.IMAGES[0] 
            },
            { 
                title: "💻 SKILLS & STACK", 
                text: "🚀 *EXPERTISE*\n\n" +
                      "▪️ *Tech:* Node.js & Bot Dev\n" +
                      "▪️ *Focus:* Automation\n" +
                      "▪️ *Level:* Advanced",
                image: CONFIG.IMAGES[1] 
            },
            { 
                title: "📞 MY CONTACTS", 
                text: "📱 *GET IN TOUCH*\n\n" +
                      "▪️ *WhatsApp:* Active\n" +
                      "▪️ *Call:* Direct Line\n" +
                      "▪️ *Response:* Fast",
                image: CONFIG.IMAGES[2] 
            },
            { 
                title: "🌐 SOCIAL & PROJECTS", 
                text: "📂 *WORK & LIFE*\n\n" +
                      "▪️ *GitHub:* Mickeymozy\n" +
                      "▪️ *Hobby:* Coding\n" +
                      "▪️ *Aim:* Innovation",
                image: CONFIG.IMAGES[3] 
            }
        ];

        // ============================================
        // 🎨 BUILD CARDS
        // ============================================
        let cardsPayload = [];

        for (const card of cards) {
            const media = await prepareWAMessageMedia(
                { image: { url: card.image } }, 
                { upload: sock.waUploadToServer }
            );

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
                                display_text: "📞 CALL OWNER",
                                phone_number: `+${CONFIG.OWNER.PHONE}`
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "💬 WHATSAPP",
                                url: `https://wa.me/${CONFIG.OWNER.PHONE}`
                            })
                        }
                    ]
                }
            });
        }

        // ============================================
        // 📤 SEND CAROUSEL
        // ============================================
        let carouselMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { 
                            text: "*MICKDADY OFFICIAL PROFILE*\n_👉 Teleza kushoto (swipe) kuona taarifa zangu_" 
                        },
                        carouselMessage: {
                            cards: cardsPayload
                        }
                    }
                }
            }
        };

        const msg = generateWAMessageFromContent(
            chatId, 
            carouselMessage, 
            { quoted: message }
        );

        return await sock.relayMessage(chatId, msg.message, { 
            messageId: msg.key.id 
        });

    } catch (error) {
        console.error("❌ Error:", error);
        await sock.sendMessage(chatId, { 
            text: `❌ *Error!*\n\nJaribu tena baadae.` 
        });
    }
}

module.exports = ownerCommand;
