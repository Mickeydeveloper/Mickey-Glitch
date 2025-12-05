const settings = require('../settings');
const { getBuffer } = require('../lib/myfunc');

async function ownerCommand(sock, chatId, message) {
    try {
        // First: Send info box with buttons
        const contactInfo = `╔═══════════════════════════════╗\n` +
                           `║  👤 ${settings.botOwner.padEnd(24)}║\n` +
                           `╚═══════════════════════════════╝\n\n` +
                           `🤖 *Bot Owner Information*\n\n` +
                           `📱 Phone: +${settings.ownerNumber}\n` +
                           `🎯 Role: ${settings.botName} Owner\n` +
                           `💼 Status: Available\n\n` +
                           `📞 *Connect with Owner:*\n` +
                           `• Tap to Call\n` +
                           `• Send WhatsApp Message\n` +
                           `• Visit Facebook Profile`;

        await sock.sendMessage(chatId, {
            text: contactInfo,
            contextInfo: {
                externalAdReply: {
                    title: `${settings.botOwner} - Call Now`,
                    body: 'Tap to connect via WhatsApp',
                    mediaType: 1,
                    sourceUrl: `https://wa.me/${settings.ownerNumber}`,
                    thumbnail: null,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: message });

        // Second: Send body image with Facebook / Project link button
        try {
            const imageBuffer = await getBuffer('https://water-billimg.onrender.com/1761205727440.png');
                // Build template buttons (URL + Call + Quick Reply)
                const projectUrl = settings.updateZipUrl || 'https://github.com/Mickeydeveloper/Mickey-Glitch';
                const fbUrl = settings.facebookUrl || 'https://www.facebook.com';

                const templateButtons = [
                    { urlButton: { displayText: '🔗 My Project', url: projectUrl } },
                    { callButton: { displayText: '📞 Call Owner', phoneNumber: `+${settings.ownerNumber}` } },
                    { quickReplyButton: { displayText: '💬 Message Owner', id: `.msgowner` } }
                ];

                await sock.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: `🎯 *Connect with ${settings.botOwner}*\n\nSelect an action below or tap the link.`,
                    footer: settings.botName,
                    templateButtons: templateButtons
                }, { quoted: message });
            } catch (imgErr) {
            console.error('Error sending image:', imgErr);
            // Fallback if image fails
            await sock.sendMessage(chatId, {
                text: `📱 *Visit Facebook Profile*\n\nConnect on social media for more updates!`
            }, { quoted: message });
        }

            // Third: Send vCard contact (after image)
            const vcard = `BEGIN:VCARD
    VERSION:3.0
    FN:${settings.botOwner}
    TEL;type=CELL;waid=${settings.ownerNumber}:+${settings.ownerNumber}
    ORG:${settings.botName}
    END:VCARD`;

            await sock.sendMessage(chatId, {
                contacts: { 
                    displayName: settings.botOwner, 
                    contacts: [{ vcard }] 
                },
            }, { quoted: message });

        } catch (error) {
        console.error('Error in owner command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error retrieving owner info. Please try again.' 
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
