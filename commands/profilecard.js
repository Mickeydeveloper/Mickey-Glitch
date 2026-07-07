const { WAProto } = require('@whiskeysockets/baileys');

async function profileCardCommand(sock, chatId, msg, args = []) {
    try {
        const input = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
        
        const [
            title = 'Zero-Tr4sh', 
            subtitle = 'View details', 
            profileUrl = 'https://telegra.ph/file/6f714e30054a1dbd65fb4.png', 
            caption = 'Hi! This is button8 test.'
        ] = input.split('|').map((part) => part.trim()).filter(Boolean);

        // Create interactive message using V1 format (buttons)
        const buttonMessage = {
            text: `*📱 QUANTUM FAMILY*\n_6 online_\n\n*${title}*\n${subtitle}\n\n${caption}\n\n🟢 ${profileUrl}\n\n📊 *Watchers:* 3.2k\n📁 *Size:* 2.46 MB\n🕐 *Last Updated:* 23/08/25 - 13:21:11\n🔗 *URL:* https://bot-connect.emmyhenztech.site\n📌 *Forks:* 2.7k\n⭐ *Stars:* 2.4k\n\n👤 *~ GHOST KING*\n📞 +255 719 632 816\n💬 "I'M SICK ABOUT YOUR SHIT\`_-\`"\n\n⏰ 6:52 PM`,
            footer: 'MICKEY BOT',
            buttons: [
                { buttonId: 'view_details', buttonText: { displayText: 'View details' }, type: 1 },
                { buttonId: 'contact_ghost', buttonText: { displayText: 'Contact Ghost King' }, type: 1 }
            ],
            headerType: 1,
            viewOnce: false
        };

        await sock.sendMessage(chatId, buttonMessage, { quoted: msg });
        return;
    } catch (error) {
        console.error('Profile card error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to send profile card.' }, { quoted: msg });
    }
}

profileCardCommand.category = 'UTILITY';
profileCardCommand.description = 'Send a profile-style card using buttons';

module.exports = profileCardCommand;