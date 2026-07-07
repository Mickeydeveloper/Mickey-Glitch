const { AIRich } = require('../lib/messageBuilder');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        
        // Tumeziweka default values zifanane kabisa na picha yako (Zero-Tr4sh, View details, Hi! This is button8 test.)
        const [
            title = 'Zero-Tr4sh', 
            subtitle = 'View details', 
            profileUrl = 'https://telegra.ph/file/6f714e30054a1dbd65fb4.png', 
            caption = 'Hi! This is button8 test.'
        ] = input.split('|').map((part) => part.trim()).filter(Boolean);

        const richBuilder = new AIRich(sock)
            .setTitle(title)
            .setFooter('MICKEY BOT') // Unaweza kufuta au kubadili hii
            .addPost({
                title: title,
                subtitle: subtitle, // Hii italeta maandishi ya "View details" kwenye button ya kijivu
                username: title,
                profile_picture_url: profileUrl,
                post_caption: caption, // Haya ni maandishi ya chini kabisa "Hi! This is button8 test."
                post_url: 'https://mickeyglitch.tech', // Link itakayofunguka mtumiaji akibofya button
                source_app: 'INSTAGRAM', // Kutumia INSTAGRAM au WHATSAPP inasaidia kuleta layout ya duara safi
                is_verified: true, // Hii inaweka kile alama cha tiki ya verified (green/blue tick)
                orientation: 'LANDSCAPE',
                post_type: 'VIDEO', // Kubadili kuwa VIDEO au IMAGE ili iendane na mfumo wa GenAIPostPrimitive
            });

        // Kwenye picha ujumbe haujawa forwarded, hivyo tumeweka forwarded: false au unaweza kuondoa kabisa
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