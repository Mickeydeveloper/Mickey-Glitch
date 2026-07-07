const { AIRich } = require('../lib/messageBuilder');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        
        const [
            title = 'Zero-Tr4sh', 
            subtitle = 'View details', 
            profileUrl = 'https://telegra.ph/file/6f714e30054a1dbd65fb4.png', 
            caption = 'Hi! This is button8 test.'
        ] = input.split('|').map((part) => part.trim()).filter(Boolean);

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

        const fallbackText = [
            `📱 ${title}`,
            subtitle,
            '',
            caption,
            '',
            `🖼️ ${profileUrl}`,
        ].filter(Boolean).join('\n');

        await richBuilder.send(chatId, { quoted: msg, forwarded: false, fallbackText });
        return;
    } catch (error) {
        console.error('Profile card AIRich error:', error);
        await sock.sendMessage(chatId, { text: '❌ WhatsApp could not render this AIRich profile card. Please try again with a different image URL.' }, { quoted: msg });
    }
}

profileCardCommand.category = 'UTILITY';
profileCardCommand.description = 'Send an AIRich profile card using addPost';

module.exports = profileCardCommand;