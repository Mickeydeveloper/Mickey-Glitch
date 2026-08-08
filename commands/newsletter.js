const baileys = require('@whiskeysockets/baileys');

const newsletterCommand = async (sock, chatId, msg, args) => {
    try {
        const newsletterId = '120363430168497381@newsletter';
        const imageUrl = args[0] || 'https://cdn.ornzora.eu.cc/8ca98c18-a7ab-4472-b234-6f9cf8b02f86-FIORA.jpg';
        const caption = args.slice(1).join(' ') || 'NIXCODE';

        const media = await baileys.prepareWAMessageMedia(
            { image: { url: imageUrl }, caption },
            { upload: sock.waUploadToServer, jid: '@newsletter' }
        );

        const node = {
            tag: 'message',
            attrs: {
                to: newsletterId,
                id: baileys.generateMessageIDV2(),
                type: 'media',
            },
            content: [
                {
                    tag: 'plaintext',
                    attrs: { mediatype: 'image' },
                    content: await baileys.proto.Message.encode(media).finish(),
                },
            ],
        };

        await sock.query(node);
        if (sock?.sendMessage) {
            await sock.sendMessage(chatId, { text: '✅ Newsletter message sent.' }, { quoted: msg });
        }
    } catch (error) {
        console.error('newsletterCommand error:', error);
        if (sock?.sendMessage) {
            await sock.sendMessage(chatId, { text: '❌ Failed to send newsletter message.' }, { quoted: msg });
        }
    }
};

newsletterCommand.description = 'Send a media newsletter message to the newsletter endpoint';
newsletterCommand.aliases = ['news', 'newsletter'];

module.exports = newsletterCommand;
