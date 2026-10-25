/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: vcf
 * @description: Sends a business contact card with interactive Message and Shop buttons.
 */

async function vcfCommand(sock, chatId, senderId, text, message) {
    try {
        // Weka namba ya biashara au ya owner
        const businessJid = "255612130873@s.whatsapp.net";
        const businessName = "Glitch Center";
        const businessDescription = "Internet Marketing Service, Int...";

        // Onyesha typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Kutuma vcard / contact card ya biashara yenye buttons za Message na Shop
        await sock.sendMessage(chatId, {
            contacts: {
                displayName: businessName,
                contacts: [
                    {
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${businessName}\nORG:${businessDescription}\nTEL;type=CELL;type=VOICE;waid=255612130873:+255 612 130 873\nEND:VCARD`
                    }
                ]
            }
        }, { quoted: message });

        // Hiari: Unaweza pia kutuma maelezo ya ziada ya biashara kama ujumbe mfupi
        await sock.sendMessage(chatId, {
            text: `🏢 *${businessName}*\n📝 ${businessDescription}\n\n✅ Status: Open now`
        }, { quoted: message });

    } catch (e) {
        console.error('vcfCommand error:', e && e.message ? e.message : e);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ An error occurred while generating the contact card.' 
            }, { quoted: message });
        } catch (err) {}
    }
}

module.exports = vcfCommand;
