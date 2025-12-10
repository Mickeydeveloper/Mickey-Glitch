const settings = require('../settings');
const { getBuffer } = require('../lib/myfunc');
const QRCode = require('qrcode'); // Add this dependency if not already installed: npm i qrcode

async function ownerCommand(sock, chatId, message) {
    try {
        // Generate QR code for direct WhatsApp chat
        const waLink = `https://wa.me/${settings.ownerNumber.replace(/^\+/, '')}`;
        const qrBuffer = await QRCode.toBuffer(waLink, { width: 512 });

        // Professional thumbnail (you can replace with a custom owner photo URL)
        const thumbnailUrl = 'https://example.com/owner-photo.jpg'; // Optional: use a real professional photo
        let thumbnailBuffer = null;
        try {
            thumbnailBuffer = thumbnailUrl ? await getBuffer(thumbnailUrl) : null;
        } catch (err) {
            console.warn('Failed to load thumbnail, proceeding without it');
        }

        // First: Professional ad-like message with call-to-action
        await sock.sendMessage(chatId, {
            text: `✅ *Official Bot Owner*\n\n` +
                  `👤 *${settings.botOwner}* ✅\n` +
                  `📱 +${settings.ownerNumber}\n` +
                  `🤖 Owner of ${settings.botName}\n\n` +
                  `Tap below to connect securely.`,
            contextInfo: {
                externalAdReply: {
                    title: `${settings.botOwner} (Verified Owner)`,
                    body: 'Direct WhatsApp Contact • Available Now',
                    mediaType: 1,
                    sourceUrl: waLink,
                    thumbnail: thumbnailBuffer,
                    renderLargerThumbnail: true,
                    showAdAttribution: false // Keeps it clean
                }
            }
        }, { quoted: message });

        // Second: Image with professional buttons + QR code fallback
        try {
            const imageBuffer = await getBuffer('https://water-billimg.onrender.com/1761205727440.png'); // Keep your existing image or replace with a more professional one

            const projectUrl = settings.updateZipUrl || 'https://github.com/Mickeydeveloper/Mickey-Glitch';
            const fbUrl = settings.facebookUrl || 'https://www.facebook.com';

            const templateButtons = [
                { urlButton: { displayText: '🌐 View Project', url: projectUrl } },
                { urlButton: { displayText: '📘 Facebook Profile', url: fbUrl } },
                { callButton: { displayText: '📞 Call Owner', phoneNumber: `+${settings.ownerNumber}` } },
                { quickReplyButton: { displayText: '💬 Message Owner', id: '.msgowner' } }
            ];

            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `✅ *Contact ${settings.botOwner}*\n\n` +
                         `Official owner of ${settings.botName}\n` +
                         `Secure & direct connection options below 👇`,
                footer: `© ${settings.botName} • Verified Contact`,
                templateButtons
            }, { quoted: message });

            // Bonus: Send QR code for easy scanning
            await sock.sendMessage(chatId, {
                image: qrBuffer,
                caption: '📲 *Scan to chat directly with the owner*'
            }, { quoted: message });

        } catch (imgErr) {
            console.error('Error sending image/QR:', imgErr);
            // Fallback text-only with links
            await sock.sendMessage(chatId, {
                text: `✅ *${settings.botOwner}*\n` +
                      `📱 Chat: ${waLink}\n` +
                      `🌐 Project: ${projectUrl || 'N/A'}\n` +
                      `📘 Facebook: ${fbUrl}`
            }, { quoted: message });
        }

        // Third: Send professional vCard
        const vcard = `BEGIN:VCARD\n` +
                      `VERSION:3.0\n` +
                      `FN:${settings.botOwner}\n` +
                      `ORG:${settings.botName};\n` +
                      `TEL;type=CELL;type=VOICE;waid=\( {settings.ownerNumber.replace(/^\+/, '')}:+ \){settings.ownerNumber}\n` +
                      `URL:${projectUrl || ''}\n` +
                      `NOTE:Official Bot Owner\n` +
                      `END:VCARD`;

        await sock.sendMessage(chatId, {
            contacts: {
                displayName: `${settings.botOwner} ✅`,
                contacts: [{ vcard }]
            }
        }, { quoted: message });

    } catch (error) {
        console.error('Error in owner command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while fetching owner information. Please try again later.'
        }, { quoted: message });
    }
}

module.exports = ownerCommand;