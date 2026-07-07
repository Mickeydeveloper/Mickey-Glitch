const { AIRich } = require('../lib/messageBuilder');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        
        // Tenganisha data kwa kutumia "|"
        const [
            title = 'Zero-Tr4sh', 
            subtitle = 'View details', 
            profileUrl = 'https://picsum.photos/200', // Picha ya duara ya profile
            caption = 'Hi! This is button8 test.'
        ] = input.split('|').map((part) => part.trim()).filter(Boolean);

        const richBuilder = new AIRich(sock)
            .setTitle(title)
            .setFooter('MICKEY BOT');

        // Kutengeneza Post Primitive inayofanana kabisa na ile kadi ya kwanza
        richBuilder.addPost({
            title: title,                        // Jina karibu na picha (Zero-Tr4sh)
            subtitle: subtitle,                  // Maandishi ya kijivu (View details)
            username: title,
            profile_picture_url: profileUrl,     // Hii inatengeneza picha ndogo ya duara (Avatar)
            thumbnail_url: profileUrl,           // SIRI: Lazima uweke hii ili kadi isikae tupu na kubwa!
            post_caption: caption,               // Maandishi ya chini (Hi! This is button8 test.)
            post_url: 'https://mickeyglitch.tech',
            source_app: 'WHATSAPP',              // Badili kuwa WHATSAPP ili kuondoa logo ya Instagram
            is_verified: true,                   // Tiki ya Verified (Green/Blue tick)
            orientation: 'LANDSCAPE',
            post_type: 'IMAGE',                  // Weka IMAGE au VIDEO
        });

        // Muhimu: "forwarded: false" ili isilete yale maandishi ya "Forwarded" juu ya ujumbe
        await richBuilder.send(chatId, { quoted: msg, forwarded: false });
        return;
    } catch (error) {
        console.error('Profile card error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to send profile card.' }, { quoted: msg });
    }
}

profileCardCommand.category = 'UTILITY';
profileCardCommand.description = 'Send an AIRich profile card exactly like the screenshot';

module.exports = profileCardCommand;
