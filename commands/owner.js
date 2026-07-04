const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

// ==============================================
// 🛡️ CONFIGURATION - MICKEY GLITCH BOT 🛡️
// ==============================================
const CONFIG = {
    FOOTER: '👑 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ • 𝟸𝟶𝟸𝟼 👑',
    OWNER_PHONE: '255615944741',
    IMAGES: [
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy1.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy2.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy3.jpg',
        'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/privacy4.jpg'
    ]
};

/**
 * 🚀 OWNER COMMAND - PRIVACY & SECURITY CAROUSEL
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} chatId - Target chat ID
 * @param {Object} message - Quoted message object
 * @returns {Promise} - Relayed message
 */
async function ownerCommand(sock, chatId, message) {
    try {
        // ============================================
        // 📋 CARD DEFINITIONS - PRIVACY FEATURES
        // ============================================
        const cards = [
            { 
                title: "🛡️ ᴍɪᴄᴋᴇʏ-ᴘʀɪᴠᴀᴄʏ 🛡️", 
                text: "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickey-Privacy\n" +
                      "▪️ Type-Data-Protection\n" +
                      "▪️ Status-Active\n" +
                      "▪️ Level-Maximum\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "Ulinzi wa faragha yako ndio\n" +
                      "kipaumbele chetu kikuu. Mfumo\n" +
                      "wa Mickey Glitch hautunzi\n" +
                      "taarifa zako binafsi, chats,\n" +
                      "wala namba za siri kwenye\n" +
                      "server zetu.\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━",
                image: CONFIG.IMAGES[0] 
            },
            { 
                title: "🔐 ᴍɪᴄᴋᴇʏ-ᴇɴᴄʀʏᴘᴛɪᴏɴ 🔐", 
                text: "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickey-Encryption\n" +
                      "▪️ Type-End-to-End\n" +
                      "▪️ Status-Enabled\n" +
                      "▪️ Protocol-AES-256\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "Mifumo yote inayopita kwenye\n" +
                      "bot hii inalindwa kwa itifaki\n" +
                      "thabiti ya usalama (Encryption).\n" +
                      "Hakuna mtu wa tatu (ikiwemo\n" +
                      "mimi developer) anayeweza\n" +
                      "kusoma data zako.\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━",
                image: CONFIG.IMAGES[1] 
            },
            { 
                title: "⚙️ ᴍɪᴄᴋᴇʏ-ᴄᴏɴᴛʀᴏʟ ⚙️", 
                text: "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickey-Control\n" +
                      "▪️ Type-User-Session\n" +
                      "▪️ Status-Full-Access\n" +
                      "▪️ Command-.clearsession\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "Una mamlaka kamili 100%\n" +
                      "juu ya bot yako. Unaweza\n" +
                      "kufuta session yako wakati\n" +
                      "wowote ukitumia amri ya\n" +
                      "`.clearsession` ili kusafisha\n" +
                      "data zako zote.\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━",
                image: CONFIG.IMAGES[2] 
            },
            { 
                title: "📜 ᴍɪᴄᴋᴇʏ-ᴛᴇʀᴍs 📜", 
                text: "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "▪️ Name-Mickey-Terms\n" +
                      "▪️ Type-Compliance\n" +
                      "▪️ Status-Approved\n" +
                      "▪️ Policy-Transparent\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                      "Kwa kutumia bot hii, unakubali\n" +
                      "kutumia teknolojia hii kwa\n" +
                      "malengo halali bila kukiuka\n" +
                      "sheria za WhatsApp. Tunaamini\n" +
                      "katika teknolojia salama na\n" +
                      "yenye uwazi!\n\n" +
                      "━━━━━━━━━━━━━━━━━━━━━━━",
                image: CONFIG.IMAGES[3] 
            }
        ];

        // ============================================
        // 🎨 CARD PAYLOAD GENERATION
        // ============================================
        let cardsPayload = [];

        for (const card of cards) {
            // Prepare image media
            const media = await prepareWAMessageMedia(
                { image: { url: card.image } }, 
                { upload: sock.waUploadToServer }
            );

            // Build card structure
            cardsPayload.push({
                header: {
                    title: card.title,
                    hasMediaAttachment: true,
                    imageMessage: media.imageMessage
                },
                body: { 
                    text: card.text 
                },
                footer: { 
                    text: CONFIG.FOOTER 
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_call",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📞 CALL-OWNER",
                                phone_number: `+${CONFIG.OWNER_PHONE}`
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "💬 WHATSAPP-CHAT",
                                url: `https://wa.me/${CONFIG.OWNER_PHONE}`
                            })
                        }
                    ]
                }
            });
        }

        // ============================================
        // 🚀 MAIN CAROUSEL MESSAGE STRUCTURE
        // ============================================
        let carouselMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { 
                            text: "═══════════════════════════════\n\n" +
                                  "🔒 *ᴍɪᴄᴋᴇʏ-ɢʟɪᴛᴄʜ-ᴘʀɪᴠᴀᴄʏ* 🔒\n\n" +
                                  "═══════════════════════════════\n\n" +
                                  "▪️ Name-Mickey-Security\n" +
                                  "▪️ Type-Data-Protection\n" +
                                  "▪️ Status-Active\n" +
                                  "▪️ Version-4.0\n\n" +
                                  "═══════════════════════════════\n\n" +
                                  "_📱 Teleza (slide) kushoto kuona_\n" +
                                  "_vipengele vikuu 4 vya ulinzi_\n" +
                                  "_wa faragha yako._\n\n" +
                                  "═══════════════════════════════" 
                        },
                        carouselMessage: {
                            cards: cardsPayload
                        }
                    }
                }
            }
        };

        // ============================================
        // 📤 SEND CAROUSEL MESSAGE
        // ============================================
        const msg = generateWAMessageFromContent(
            chatId, 
            carouselMessage, 
            { quoted: message }
        );
        
        return await sock.relayMessage(chatId, msg.message, { 
            messageId: msg.key.id 
        });

    } catch (error) {
        console.error("❌ Owner Carousel Error:", error);
        await sock.sendMessage(chatId, { 
            text: `❌ *Error-Mickey:* ${error.message}\n\n` +
                  `▪️ Status-Failed\n` +
                  `▪️ Action-Retry\n` +
                  `▪️ Contact-Owner` 
        });
    }
}

module.exports = ownerCommand;