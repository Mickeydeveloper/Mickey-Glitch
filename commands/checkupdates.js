/**
 * COMMAND: .repo
 * DESIGN: Updated to Template Buttons for "Copy" feel
 */

const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

async function repoCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📦', key: message.key } });

        const repoText = `Hello 
This is *Mickey Glitch*, A Whatsapp Bot Built by *Mickey*.

[❏] *NAME:* MICKEY GLITCH 
|  This is officiall whatsapp bot from Mickey and Quantum Team bot `;

        // Kuandaa picha
        const msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text: repoText
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: "© 2026 Mickey Glitch Tech"
                        }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: "MICKEY GLITCH REPO",
                            hasMediaAttachment: true,
                            ...(await prepareWAMessageMedia({ url: "https://i.ibb.co/vzVv8Yp/mickey.jpg" }, { upload: sock.waUploadToServer }))
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                // Hii itafanya kazi ya COPY moja kwa moja (kama bot inasupport)
                                {
                                    "name": "cta_copy",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "📋 Copy Link",
                                        "id": "https://github.com/Mickeydeveloper/Mickey-Glitch",
                                        "copy_code": "https://github.com/Mickeydeveloper/Mickey-Glitch"
                                    })
                                },
                                {
                                    "name": "cta_url",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "🔗 Visit Repo",
                                        "url": "https://github.com/Mickeydeveloper/Mickey-Glitch"
                                    })
                                },
                                {
                                    "name": "quick_reply",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "📥 Download Zip",
                                        "id": ".downloadzip"
                                    })
                                }
                            ],
                        })
                    })
                }
            }
        }, { quoted: message });

        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (err) {
        console.error("Repo Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Error:* Tumia .repo tena." });
    }
}

module.exports = repoCommand;
