const { AIRich } = require('../lib/messageBuilder');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        const [title = '👤 Profile', subtitle = 'Mickey Glitch', profileUrl = 'https://telegra.ph/file/6f714e30054a1dbd65fb4.png', caption = 'This is a profile-style post card from MessageBuilder'] = input.split('|').map((part) => part.trim()).filter(Boolean);

        const richBuilder = new AIRich(sock)
            .setTitle(title)
            .setFooter('MICKEY BOT')
            .addPost({
                title,
                subtitle,
                username: subtitle,
                profile_picture_url: profileUrl,
                post_caption: caption,
                post_url: 'https://mickeyglitch.tech',
                source_app: 'MICKEY',
                footer_label: 'Profile Card',
                is_verified: true,
                orientation: 'LANDSCAPE',
                post_type: 'PROFILE',
            });

        await richBuilder.send(chatId, { quoted: msg, forwarded: true });
        return;
    } catch (error) {
        console.error('Profile card error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to send profile card.' }, { quoted: msg });
    }
}

profileCardCommand.category = 'UTILITY';
profileCardCommand.description = 'Send an AIRich profile-style post card using MessageBuilder';

module.exports = profileCardCommand;
