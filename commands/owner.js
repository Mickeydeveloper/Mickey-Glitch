const settings = require('../settings');
const { getBuffer } = require('../lib/myfunc');
const QRCode = require('qrcode');

/**
 * Handles the Owner Information Command
 * Improvements: Better UI, centralized error handling, and streamlined flow.
 */
async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255615944741';
        const waLink = `https://wa.me/${ownerNumberRaw}`;
        
        // 1. Generate QR Buffer & Fetch Thumbnail in Parallel for Speed
        const [qrBuffer, thumbnailBuffer] = await Promise.all([
            QRCode.toBuffer(waLink, { 
                width: 600, 
                margin: 2, 
                color: { dark: '#000000', light: '#ffffff' } 
            }),
            getBuffer(settings.ownerImage || 'https://water-billimg.onrender.com/1761205727440.png').catch(() => null)
        ]);

        // 2. Construct Professional vCard
        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      `FN:${settings.botOwner}\n` +
                      `ORG:${settings.botName} Official;\n` +
                      `TEL;type=CELL;type=VOICE;waid=${ownerNumberRaw}:+${ownerNumberRaw}\n` +
                      `URL:${settings.updateZipUrl || ''}\n` +
                      `ADR:;;Tanzania;;;;\n` +
                      `NOTE:Secure Bot Owner Contact\n` +
                      'END:VCARD';

        // 3. Send Main Identity Message (Ad + Contact Card)
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: settings.botOwner,
                contacts: [{ vcard }]
            },
            contextInfo: {
                externalAdReply: {
                    title: `Contact ${settings.botOwner}`,
                    body: `Official Developer of ${settings.botName}`,
                    mediaType: 1,
                    sourceUrl: waLink,
                    thumbnail: thumbnailBuffer,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        }, { quoted: message });

        // 4. Send Scannable QR Code
        await sock.sendMessage(chatId, {
            image: qrBuffer,
            caption: `*─「 OWNER PROFILE 」─*\n\n` +
                     `👤 *Name:* ${settings.botOwner}\n` +
                     `📱 *Contact:* +${ownerNumberRaw}\n` +
                     `🔗 *Link:* ${waLink}\n\n` +
                     `_Scan the code above to start a direct chat._`
        }, { quoted: message });

    } catch (error) {
        console.error('Owner Command Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Error:* Failed to retrieve owner details. Please contact support.'
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
