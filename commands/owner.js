const settings = require('../settings');
const { getBuffer } = require('../lib/myfunc');
const QRCode = require('qrcode'); // Ensure 'qrcode' is installed: npm i qrcode

async function ownerCommand(sock, chatId, message) {
    try {
        // Generate QR code for direct WhatsApp chat
        const waLink = `https://wa.me/${settings.ownerNumber.replace(/^\+/, '')}`;
        const qrBuffer = await QRCode.toBuffer(waLink, { width: 512 });

        // Optional professional thumbnail (replace with a real owner/business photo for better trust)
        const thumbnailUrl = null; // e.g., 'https://yourdomain.com/owner-professional-photo.jpg'
        let thumbnailBuffer = null;
        if (thumbnailUrl) {
            try {
                thumbnailBuffer = await getBuffer(thumbnailUrl);
            } catch (err) {
                console.warn('Failed to load thumbnail');
            }
        }

        // First: Clean ad-like message (removed misleading ✅ from caption section)
        await sock.sendMessage(chatId, {
            text: `*Official Bot Owner*\n\n` +
                  `👤 *${settings.botOwner}*\n` +
                  `📱 +${settings.ownerNumber}\n` +
                  `🤖 Owner of ${settings.botName}\n\n` +
                  `Tap below to connect securely.`,
            contextInfo: {
                externalAdReply: {
                    title: `${settings.botOwner} - Official Owner`,
                    body: 'Direct & Secure WhatsApp Contact',
                    mediaType: 1,
                    sourceUrl: waLink,
                    thumbnail: thumbnailBuffer,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // Second: Image with buttons + QR code
        try {
            const imageBuffer = await getBuffer('https://water-billimg.onrender.com/1761205727440.png'); // Replace with a more professional banner if possible

            const projectUrl = settings.updateZipUrl || 'https://github.com/Mickeydeveloper/Mickey-Glitch';
            const fbUrl = settings.facebookUrl || 'https://www.facebook.com';

            const templateButtons = [
                { urlButton: { displayText: '🌐 Project Repo', url: projectUrl } },
                { urlButton: { displayText: '📘 Facebook', url: fbUrl } },
                { callButton: { displayText: '📞 Call Now', phoneNumber: `+${settings.ownerNumber}` } },
                { quickReplyButton: { displayText: '💬 Message Owner', id: '.msgowner' } }
            ];

            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `*Owner Contact*\n\n` +
                         `Official owner of ${settings.botName}\n` +
                         `Choose an option below 👇`,
                footer: `${settings.botName} • Contact Info`,
                templateButtons
            }, { quoted: message });

            // Send QR code for easy scanning
            await sock.sendMessage(chatId, {
                image: qrBuffer,
                caption: '📲 *Scan QR to start chat with owner*'
            }, { quoted: message });

        } catch (imgErr) {
            console.error('Error sending image/QR:', imgErr);
            // Robust fallback
            await sock.sendMessage(chatId, {
                text: `*Owner Contact*\n\n` +
                      `👤 ${settings.botOwner}\n` +
                      `📱 Chat: ${waLink}\n` +
                      `🌐 Project: ${projectUrl}\n` +
                      `📘 Facebook: ${fbUrl}`
            }, { quoted: message });
        }

        // Third: Professional vCard (removed misleading ✅ from display name)
        const vcard = `BEGIN:VCARD\n` +
                      `VERSION:3.0\n` +
                      `FN:${settings.botOwner}\n` +
                      `ORG:${settings.botName}\n` +
                      `TEL;type=CELL;type=VOICE;waid=\( {settings.ownerNumber.replace(/^\+/, '')}:+ \){settings.ownerNumber}\n` +
                      `URL:${projectUrl || ''}\n` +
                      `NOTE:Official Bot Owner - Direct Contact\n` +
                      `END:VCARD`;

        await sock.sendMessage(chatId, {
            contacts: {
                displayName: `${settings.botOwner} (Owner)`,
                contacts: [{ vcard }]
            }
        }, { quoted: message });

    } catch (error) {
        console.error('Error in owner command:', error);
        // If error persists, check: image URL validity, QRCode dependency, or network issues
        await sock.sendMessage(chatId, {
            text: '⚠️ Temporary issue loading owner info. Please try again shortly.'
        }, { quoted: message });
    }
}

module.exports = ownerCommand;