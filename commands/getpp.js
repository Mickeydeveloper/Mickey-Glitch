const axios = require('axios');

/**
 * @param {Object} sock - Baileys socket instance
 * @param {Object} m - Message object
 * @param {Array} args - Arguments
 */
const getProfilePictureCommand = async (sock, m, args) => {
    // 1. Check kama 'm' au 'm.key' zipo (Safety check)
    if (!m || !m.key) {
        console.error("Error: Message object 'm' is undefined.");
        return;
    }

    const sender = m.key.remoteJid;

    try {
        // 2. Tambua mlengwa (Identify target)
        let target;
        
        // Check mentions
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        // Check kama ni reply kwa mtu
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentioned) {
            target = mentioned;
        } else if (quoted) {
            target = quoted;
        } else if (args && args[0]) {
            // Safisha namba na ongeza suffix
            let num = args[0].replace(/[^0-9]/g, '');
            target = num + '@s.whatsapp.net';
        } else {
            target = sender;
        }

        // 3. Pata PP URL
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            return await sock.sendMessage(sender, { text: '❌ Mtumiaji hana picha au privacy imebana.' }, { quoted: m });
        }

        // 4. Download na Tuma (Download & Send)
        const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
        
        await sock.sendMessage(sender, { 
            image: Buffer.from(response.data), 
            caption: `✅ PP ya @${target.split('@')[0]} imepatikana.`,
            mentions: [target]
        }, { quoted: m });

    } catch (err) {
        console.error('❌ Failed to process command:', err.message);
        // Hakikisha sender yupo kabla ya kutuma error message
        if (sender) {
            await sock.sendMessage(sender, { text: '⚠️ Hitilafu imetokea wakati wa kupata picha.' });
        }
    }
};

module.exports = getProfilePictureCommand;
