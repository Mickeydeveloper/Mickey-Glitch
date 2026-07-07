const { AIRich } = require('../lib/messageBuilder');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        
        // Default values zinafanana na picha yako
        const [
            title = 'Zero-Tr4sh', 
            subtitle = 'View details', 
            profileUrl = 'https://telegra.ph/file/6f714e30054a1dbd65fb4.png', 
            caption = 'Hi! This is button8 test.'
        ] = input.split('|').map((part) => part.trim()).filter(Boolean);

        const richBuilder = new AIRich(sock)
            .setTitle('QUANTUM FAMILY')
            .setFooter('6 online')
            .addPost({
                title: title,
                subtitle: subtitle,
                username: title,
                profile_picture_url: profileUrl,
                post_caption: caption,
                post_url: 'https://bot-connect.emmyhenztech.site',
                source_app: 'INSTAGRAM',
                is_verified: true,
                orientation: 'LANDSCAPE',
                post_type: 'IMAGE', // Badilisha kuwa IMAGE kwa profile card
                // Hizi ni metadata za ziada kama kwenye picha
                watchers: '3.2k',
                size: '2.46 MB',
                last_updated: '23/08/25 - 13:21:11',
                forks: '2.7k',
                stars: '2.4k',
                contact: '+255 719 632 816',
                status: "I'M SICK ABOUT YOUR SHIT`_-`"
            });

        await richBuilder.send(chatId, { quoted: msg, forwarded: false });
        return;
    } catch (error) {
        console.error('Profile card error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to send profile card.' }, { quoted: msg });
    }
}

profileCardCommand.category = 'UTILITY';
profileCardCommand.description = 'Send an AIRich profile-style post card using MessageBuilder';

module.exports = profileCardCommand;