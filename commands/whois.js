const axios = require('axios');
const truecallerjs = require('truecallerjs');

async function whoisCommand(sock, chatId, message, args) {
    try {
        // --- 1. Get Body safely (Prevent .slice error) ---
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || "";
        
        // --- 2. Find phone number (User ID) ---
        let user;
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            // If tagged someone (e.g. .whois @255xxx)
            user = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            // If replied to someone's message
            user = message.message.extendedTextMessage.contextInfo.participant;
        } else if (args[0]) {
            // If wrote a number (e.g. .whois 2557xxx)
            user = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
            // If didn't mention anyone, check own number
            user = message.key.participant || message.key.remoteJid;
        }

        if (!user) return await sock.sendMessage(chatId, { text: "❌ *Mention someone or write a phone number!*" }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        // --- 3. Get WhatsApp Info (Bio & Profile Pic) ---
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(user, 'image');
        } catch {
            ppUrl = 'https://telegra.ph/file/02324707639e7b2353396.jpg'; // Default pic if none
        }

        const status = await sock.fetchStatus(user).catch(() => ({ status: "No Bio available" }));
        const pushName = message.pushName || "User";
        const phoneNumber = user.split('@')[0];

        // --- 4. Get Truecaller information ---
        let truecallerInfo = null;
        try {
            const searchData = await truecallerjs.search(phoneNumber);
            if (searchData && searchData.data && searchData.data.length > 0) {
                truecallerInfo = searchData.data[0];
            }
        } catch (err) {
            console.log("Truecaller lookup failed:", err.message);
        }

        // --- 5. Create Report ---
        let caption = `
👤 *USER INFORMATION*
━━━━━━━━━━━━━━━━━━━━━━
📝 *Name:* ${pushName}
📞 *Number:* ${phoneNumber}
📖 *Bio:* ${status.status || "Hidden"}
🔗 *Link:* wa.me/${phoneNumber}`;

        // Add Truecaller info if available
        if (truecallerInfo) {
            caption += `
━━━━━━━━━━━━━━━━━━━━━━
📱 *TRUECALLER INFO*
━━━━━━━━━━━━━━━━━━━━━━
👤 *Truecaller Name:* ${truecallerInfo.name || "Unknown"}
🌍 *Country:* ${truecallerInfo.countryCode || "Unknown"}
📍 *Location:* ${truecallerInfo.city || "Unknown"}
🏢 *Carrier:* ${truecallerInfo.carrier || "Unknown"}
⭐ *Score:* ${truecallerInfo.score || "N/A"}`;
        }

        caption += `
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
        await sock.sendMessage(chatId, { text: '❌ *Error:* Could not fetch user information.' }, { quoted: message });
    }
}

module.exports = whoisCommand;
