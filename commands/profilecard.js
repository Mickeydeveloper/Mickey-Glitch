const { AIRich } = require('../lib/messageBuilder');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        const [title = 'Zero-Tr4sh', subtitle = 'View details', profileUrl = 'https://picsum.photos/200', caption = 'Hi! This is button8 test.'] =
            input.split('|').map((part) => part.trim()).filter(Boolean);

        const richBuilder = new AIRich(sock)
            .setTitle(title)
            .setFooter('MICKEY BOT');

        richBuilder.addPost({
            title,
            subtitle,
            username: title,
            profile_picture_url: profileUrl,
            thumbnail_url: profileUrl,
            post_caption: caption,
            post_url: 'https://mickeyglitch.tech',
            source_app: 'WHATSAPP',
            is_verified: true,
            orientation: 'LANDSCAPE',
            post_type: 'IMAGE',
        });

        await richBuilder.send(chatId, { quoted: msg, forwarded: false });
    } catch (error) {
        console.error('Profile card error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to send profile card.' }, { quoted: msg });
    }
}

profileCardCommand.category = 'UTILITY';
profileCardCommand.description = 'Send an AIRich profile card';

module.exports = profileCardCommand;
