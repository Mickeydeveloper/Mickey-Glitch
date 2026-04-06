const axios = require('axios');

async function whoisCommand(sock, chatId, message, args) {
    try {
        // --- 1. Pata Body kwa usalama (Kuzuia .slice error) ---
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || "";
        
        // --- 2. Tafuta namba ya simu (User ID) ---
        let user;
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            // Kama amem-tag mtu (e.g. .whois @255xxx)
            user = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            // Kama amereply meseji ya mtu
            user = message.message.extendedTextMessage.contextInfo.participant;
        } else if (args[0]) {
            // Kama ameandika namba (e.g. .whois 2557xxx)
            user = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
            // Kama hajataja mtu, angalia namba yake mwenyewe
            user = message.key.participant || message.key.remoteJid;
        }

        if (!user) return await sock.sendMessage(chatId, { text: "❌ *Taja mtu au andika namba ya simu!*" }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        // --- 3. Pata Info za WhatsApp (Bio & Profile Pic) ---
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(user, 'image');
        } catch {
            ppUrl = 'https://telegra.ph/file/02324707639e7b2353396.jpg'; // Default pic kama hana
        }

        const status = await sock.fetchStatus(user).catch(() => ({ status: "No Bio available" }));
        const pushName = message.pushName || "Mtumiaji";
        const phoneNumber = user.split('@')[0];

        // --- 4. Tengeneza Ripoti ---
        const caption = `
👤 *USER INFORMATION*
━━━━━━━━━━━━━━━━━━━━━━
📝 *Name:* ${pushName}
📞 *Number:* ${phoneNumber}
📖 *Bio:* ${status.status || "Hidden"}
🔗 *Link:* wa.me/${phoneNumber}
━━━━━━━━━━━━━━━━━━━━━━
*Mickey Glitch Technology*`;

        await sock.sendMessage(chatId, {
            image: { url: ppUrl },
            caption: caption
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("WHOIS ERROR:", err);
        // Hatuwezi kutuma error kama sock imekufa, ila hapa tunahakikisha bot haizimi
    }
}

module.exports = whoisCommand;
