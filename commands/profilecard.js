const { ButtonV2 } = require('../lib/messageBuilder');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        const [
            title = 'Zero-Tr4sh', 
            subtitle = 'Quantum Family', 
            profileUrl = 'https://picsum.photos/300', // Weka link ya picha ya uhakika au buffer
            caption = 'Hi! This is button8 test.'
        ] = input.split('|').map((part) => part.trim()).filter(Boolean);

        // Tunatumia ButtonV2 ambayo ni standard na inakubalika kila mahali
        const builder = new ButtonV2(sock)
            .setTitle(title)           // Jina kuu la juu
            .setSubtitle(subtitle)     // Maelezo ya chini ya jina
            .setBody(caption)          // Ujumbe mkuu (Hi! This is button8 test)
            .setFooter('MICKEY BOT')   // Maelezo ya chini kabisa
            .setThumbnail(profileUrl)  // Hii itaweka picha kwenye ujumbe
            .addButton('View details', '.button8'); // Inatengeneza button inayobofya

        // Kutuma ujumbe (Inafanya kazi kwa mtu yeyote)
        await builder.send(chatId, { quoted: msg });
        return;
    } catch (error) {
        console.error('Profile card error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to send profile card.' }, { quoted: msg });
    }
}

profileCardCommand.category = 'UTILITY';
profileCardCommand.description = 'Send a working profile button message to anyone';

module.exports = profileCardCommand;
