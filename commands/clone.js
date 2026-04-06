const fs = require('fs');

/**
 * COMMAND: .clone
 * FUNCTION: Inachukua Profile Picture na Jina la mtu na kuweka kwenye bot
 */

async function cloneCommand(sock, chatId, message) {
    try {
        // 1. Check kama kuna mtu ametag-iwa (mentioned) au kureply-iwa
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const target = mentioned || message.message?.extendedTextMessage?.contextInfo?.participant;

        if (!target) {
            return await sock.sendMessage(chatId, { text: "❌ *Usage:* Reply to a message or tag someone to clone them.\nExample: `.clone @user`" }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '👥', key: message.key } });

        // 2. Pata Profile Picture ya mlengwa
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            ppUrl = 'https://i.ibb.co/vzVv8Yp/mickey.jpg'; // Default kama hana picha
        }

        // 3. Pata Jina lake (Contact Info)
        const contact = await sock.onWhatsApp(target);
        const name = contact[0]?.notify || "Mickey Glitch User";

        // 4. Update Profile ya Bot (Jina na Picha)
        // Kumbuka: Baadhi ya hosting panels zinaweza kuzuia hili, lakini hapa ndio logic yake
        await sock.updateProfileStatus(`Cloned from ${name} | Powered by Mickey Glitch`);
        
        // Download picha na ku-update PP ya bot
        const { fetchBuffer } = require('../lib/myfunc');
        const buffer = await fetchBuffer(ppUrl);
        await sock.updateProfilePicture(sock.user.id, buffer);

        await sock.sendMessage(chatId, { 
            text: `✅ *IDENTITY CLONED SUCCESSFUL*\n\n👤 *Name:* ${name}\n📸 *Status:* Profile Picture Updated.\n\n_Bot now mirrors this user._` 
        }, { quoted: message });

    } catch (err) {
        console.error("Clone Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Clone Failed:* Bot lacks permission or target hidden profile." });
    }
}

module.exports = cloneCommand;
