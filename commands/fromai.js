const { prepareWAMessageMedia, generateWAMessageFromContent } = require('baileys');
const { createCtx } = require('../lib/messageBuilder');

async function fromaiCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        // Tuma ujumbe wa kusubiri (Kupakia files huchukua sekunde chache)
        await ctx.reply('⏳ _Processing AI media engine, please wait..._');

        // 1. Kupakia Picha kwenye seva za WhatsApp
        const image = await prepareWAMessageMedia(
            {
                image: {
                    url: 'https://cdn.ornzora.eu.cc/a6a1e8f4-b83d-4694-9bba-0f22a58bfd4f-FIORA.jpg'
                }
            },
            {
                upload: sock.waUploadToServer
            }
        );

        // 2. Kupakia Video kwenye seva za WhatsApp
        const video = await prepareWAMessageMedia(
            {
                video: {
                    url: 'https://cdn.ornzora.eu.cc/ed7ebb66-9bf4-44b6-858a-b6b7405e53c5-FIORA.mp4'
                }
            },
            {
                upload: sock.waUploadToServer
            }
        );

        // 3. Kutengeneza Ujumbe Mama (Picha)
        const msg = generateWAMessageFromContent(
            ctx.chatId,
            {
                imageMessage: {
                    ...image.imageMessage,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0
                    }
                }
            },
            {}
        );

        // 4. Kurusha Ujumbe Mama (Picha)
        await sock.relayMessage(ctx.chatId, msg.message, {
            messageId: msg.key.id
        });

        // 5. Kurusha Ujumbe wa Pacha (Video) na kuunganisha na ule wa Picha
        await sock.relayMessage(
            ctx.chatId,
            {
                videoMessage: {
                    ...video.videoMessage,
                    contextInfo: {
                        pairedMediaType: 6,
                        statusSourceType: 0
                    }, 
                },
                messageContextInfo: {
                    messageAssociation: {
                        associationType: 12,
                        parentMessageKey: msg.key
                    }
                }
            },
            {}
        );

    } catch (error) {
        console.error("FromAI Media Error:", error);
        ctx.reply(`❌ FromAI Engine failed: ${error.message}`);
    }
}

// Inatumia mfumo wako wa exporter ya chini wenye jina jipya la command
module.exports = fromaiCommand;
