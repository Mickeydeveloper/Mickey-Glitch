const fs = require('fs');
const path = require('path');
const { fetchBuffer } = require('../lib/myfunc');

// Hifadhi data ya asili (original profile)
const originalProfile = {
    profilePicture: null,
    status: null,
    isCloned: false
};

// Path ya kuhifadhi original data (ili isipotee hata ukirestart bot)
const dataPath = path.join(__dirname, '../data/original_profile.json');

 // Load original data kama ipo
if (fs.existsSync(dataPath)) {
    try {
        const saved = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        originalProfile.profilePicture = saved.profilePicture ? Buffer.from(saved.profilePicture, 'base64') : null;
        originalProfile.status = saved.status;
        originalProfile.isCloned = saved.isCloned || false;
    } catch (e) {}
}

async function cloneCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || '';
        
        const isUnclone = text.startsWith('.unclone');

        // ===================== UNCLONE =====================
        if (isUnclone) {
            if (!originalProfile.isCloned) {
                return await sock.sendMessage(chatId, { 
                    text: "❌ *Bot haijaclone bado! Hakuna cha kurudisha.*" 
                }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });
            await sock.sendMessage(chatId, { text: '🔄 *Inarudisha profile ya asili...*' }, { quoted: message });

            // Rudisha Status
            if (originalProfile.status) {
                await sock.updateProfileStatus(originalProfile.status);
            }

            // Rudisha Profile Picture
            if (originalProfile.profilePicture) {
                await sock.updateProfilePicture(sock.user.id.split(':')[0] + '@s.whatsapp.net', originalProfile.profilePicture);
            }

            originalProfile.isCloned = false;

            await sock.sendMessage(chatId, {
                text: `✅ *UNCLONE IMEFANIKIWA!*\n\nBot imerudi kwenye hali yake ya asili.`
            }, { quoted: message });

            return;
        }

        // ===================== CLONE =====================
        // Pata target
        let targetJid;
        const context = message.message?.extendedTextMessage?.contextInfo;

        if (context?.mentionedJid?.length > 0) {
            targetJid = context.mentionedJid[0];
        } else if (context?.quotedMessage) {
            targetJid = context.participant || message.key.remoteJid;
        } else {
            return await sock.sendMessage(chatId, {
                text: "❌ *Usage:*\nReply kwenye ujumbe au tag mtu\n\n`.clone @user` au `.unclone`"
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '👥', key: message.key } });
        await sock.sendMessage(chatId, { text: '👥 *Inaclone identity...*' }, { quoted: message });

        // Hifadhi original profile (mara ya kwanza tu)
        if (!originalProfile.isCloned) {
            try {
                originalProfile.status = await sock.fetchStatus(sock.user.id.split(':')[0] + '@s.whatsapp.net');
                originalProfile.status = originalProfile.status[0]?.status || "Powered by Mickey Glitch Tech";
            } catch (e) {}

            try {
                const ppUrl = await sock.profilePictureUrl(sock.user.id.split(':')[0] + '@s.whatsapp.net', 'image');
                originalProfile.profilePicture = await fetchBuffer(ppUrl);
            } catch (e) {
                console.log("No original PP found");
            }

            originalProfile.isCloned = true;

            // Save to file
            fs.writeFileSync(dataPath, JSON.stringify({
                profilePicture: originalProfile.profilePicture ? originalProfile.profilePicture.toString('base64') : null,
                status: originalProfile.status,
                isCloned: true
            }));
        }

        // Pata Profile Picture ya mtu
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (e) {
            ppUrl = 'https://i.ibb.co/vzVv8Yp/mickey.jpg';
        }

        // Pata jina
        let name = "Unknown User";
        try {
            const contact = await sock.onWhatsApp(targetJid);
            name = contact[0]?.notify || contact[0]?.name || name;
        } catch (e) {}

        // Update Status
        await sock.updateProfileStatus(`Cloned from ${name} | Powered by Mickey Glitch Tech`);

        // Update Profile Picture
        const buffer = await fetchBuffer(ppUrl);
        if (buffer) {
            await sock.updateProfilePicture(sock.user.id.split(':')[0] + '@s.whatsapp.net', buffer);
        }

        await sock.sendMessage(chatId, {
            text: `✅ *CLONE IMEFANIKIWA!*\n\n👤 *Cloned from:* ${name}\n📸 *Profile Picture:* Imebadilishwa\n\nTumia *.unclone* kurudisha hali ya asili.`
        }, { quoted: message });

    } catch (err) {
        console.error("Clone Error:", err.message);
        await sock.sendMessage(chatId, {
            text: "❌ *Operesheni imeshindwa!*\nJaribu tena au angalia ruhusa za bot."
        }, { quoted: message });
    }
}

module.exports = cloneCommand;