module.exports = async function button1Command(sock, chatId, msg) {
    const stickerMessage = {
        messageContextInfo: {
            messageAssociation: {
                associationType: 11,
                parentMessageKey: msg.key
            }
        },
        stickerMessage: {
            url: 'https://mmg.whatsapp.net/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_Q5Aa5gHNe2HdbLE-cWkJXND2kbQ-dPCK_OUE8yMZftwYLe7BsQ&oe=6ADAC196&_nc_sid=5e03e0&mms3=true',
            fileSha256: 'Uoa2mnXeustnlPHuKU4SBDRzKn/Tfi7Yn8zDAbYCnos=',
            fileEncSha256: 'L2lSGKLAk7SXkVhBHuNwy2gyET1OhAcR8O7hTmFx0Ss=',
            mediaKey: 'rsI+FYArjYdzSdlGH4R6G5OUviYNZmBrFvoAitAlI7U=',
            mimetype: 'application/was',
            directPath: '/v/t62.15575-24/818766779_1129097639778153_6590267083545743956_n.enc?ccb=11-4&oh=01_Q5Aa5gHNe2HdbLE-cWkJXND2kbQ-dPCK_OUE8yMZftwYLe7BsQ&oe=6ADAC196&_nc_sid=5e03e0',
            isLottie: true
        }
    };

    await sock.relayMessage(chatId, stickerMessage, {});
};

module.exports.name = 'button1';
module.exports.description = 'Send the button1 sticker';
module.exports.category = 'TOOLS';
module.exports.aliases = [];
