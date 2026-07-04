const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

// ==============================================
// 🛡️ MICKEY GLITCH - OWNER PRIVACY 🛡️
// ==============================================
const CONFIG = {
    FOOTER: '👑 MICKEY GLITCH • 2026 👑',
    OWNER: {
        NAME: 'Mickdady',
        PHONE: '255615944741',
        COUNTRY: 'Tanzania',
        TITLE: 'Quantum Base Developer'
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
        // 📋 OWNER INFO CARDS
        // ============================================
        const cards = [
            { 
                title: "👑 MICKEY-OWNER", 
                text: "━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickdady\n" +
                      "▪️ Title-Quantum-Dev\n" +
                      "▪️ Country-Tanzania\n" +
                      "▪️ Status-Active\n\n" +
                      "━━━━━━━━━━━━━━━━\n\n" +
                      "Muundaji wa Mickey Glitch\n" +
                      "Bot. Mtaalamu wa usalama\n" +
                      "na teknolojia za kisasa.\n\n" +
                      "━━━━━━━━━━━━━━━━",
                image: CONFIG.IMAGES[0] 
            },
            { 
                title: "🔐 MICKEY-SECURITY", 
                text: "━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickey-Secure\n" +
                      "▪️ Type-End-to-End\n" +
                      "▪️ Status-Encrypted\n" +
                      "▪️ Protocol-AES-256\n\n" +
                      "━━━━━━━━━━━━━━━━\n\n" +
                      "Mifumo yote inalindwa kwa\n" +
                      "usalama wa hali ya juu.\n" +
                      "Hakuna data zinazohifadhiwa.\n\n" +
                      "━━━━━━━━━━━━━━━━",
                image: CONFIG.IMAGES[1] 
            },
            { 
                title: "⚙️ MICKEY-CONTROL", 
                text: "━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickey-Admin\n" +
                      "▪️ Type-Full-Access\n" +
                      "▪️ Status-Owner-Only\n" +
                      "▪️ Command-.owner\n\n" +
                      "━━━━━━━━━━━━━━━━\n\n" +
                      "Amri maalum kwa ajili ya\n" +
                      "developer pekee. Udhibiti\n" +
                      "kamili wa mfumo wote.\n\n" +
                      "━━━━━━━━━━━━━━━━",
                image: CONFIG.IMAGES[2] 
            },
            { 
                title: "📜 MICKEY-TERMS", 
                text: "━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickey-Policy\n" +
                      "▪️ Type-Compliance\n" +
                      "▪️ Status-Approved\n" +
                      "▪️ Policy-Transparent\n\n" +
                      "━━━━━━━━━━━━━━━━\n\n" +
                      "Matumizi ya bot hii inakubali\n" +
                      "sheria na kanuni za WhatsApp.\n" +
                      "Faragha ni haki yako!\n\n" +
                      "━━━━━━━━━━━━━━━━",
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
                                display_text: "📞 CALL-OWNER",
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
                            text: "════════════════════════\n\n" +
                                  "👑 *MICKEY GLITCH* 👑\n\n" +
                                  "════════════════════════\n\n" +
                                  "▪️ Owner-Mickdady\n" +
                                  "▪️ Title-Quantum-Dev\n" +
                                  "▪️ Country-Tanzania\n" +
                                  "▪️ Version-4.0\n\n" +
                                  "════════════════════════\n\n" +
                                  "_📱 Teleza kuona vipengele_\n\n" +
                                  "════════════════════════" 
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
            text: `❌ *Error*\n\n▪️ Status-Failed\n▪️ Contact-Owner` 
        });
    }
}

module.exports = ownerCommand;