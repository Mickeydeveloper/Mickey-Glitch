const settings = require('../settings');
const { getBuffer } = require('../lib/myfunc');
const QRCode = require('qrcode');
const { sendButtons } = require('gifted-btns');

/**
 * Handles the Owner Information Command
 * Improvements: Better UI, centralized error handling, and streamlined flow.
 */
async function ownerCommand(sock, chatId, message) {
    try {
        const ownerNumberRaw = settings.ownerNumber || '255615944741';
        const waLink = `https://wa.me/${ownerNumberRaw}`;
        
        // 1. Generate QR Buffer
        const qrBuffer = await QRCode.toBuffer(waLink, { 
            width: 600, 
            margin: 2, 
            color: { dark: '#000000', light: '#ffffff' } 
        });

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

        // 3. Send Main Identity Message (Contact Card)
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: settings.botOwner,
                contacts: [{ vcard }]
            }
        }, { quoted: message });

        // 4. Send Scannable QR Code
        await sock.sendMessage(chatId, {
            image: qrBuffer,
            caption: `*👤 ${settings.botOwner}*\n📱 +${ownerNumberRaw}\n\n_Scan to chat_`
        }, { quoted: message });

        // 5. Send Interactive Contact Options
        const contactButtons = [
            { id: '1', text: '📞 Call Owner', url: `tel:+${ownerNumberRaw}` },
            { id: '2', text: '💬 Send Message', url: waLink },
            { id: '3', text: '📺 Join Channel', url: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610' }
        ];

        await sendButtons(sock, chatId, {
            title: `👑 ${settings.botOwner}`,
            text: `📱 *Contact:* +${ownerNumberRaw}\n*Developer of ${settings.botName}*`,
            footer: 'Mickey Glitch',
            buttons: contactButtons
        }, { quoted: message });

    } catch (error) {
        console.error('Owner Command Error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Error:* Failed to retrieve owner details. Please contact support.'
        }, { quoted: message });
    }
}

module.exports = ownerCommand;
