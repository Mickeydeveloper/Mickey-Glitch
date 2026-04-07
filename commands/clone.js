const fs = require('fs');
const path = require('path');
const { fetchBuffer } = require('../lib/myfunc');
const Jimp = require('jimp');   // Important for resizing

const dataPath = path.join(__dirname, '../data/original_profile.json');

let originalProfile = {
    profilePicture: null,
    status: null,
    isCloned: false
};

// Load original data
if (fs.existsSync(dataPath)) {
    try {
        const saved = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        originalProfile.status = saved.status;
        originalProfile.isCloned = saved.isCloned || false;
        if (saved.profilePicture) {
            originalProfile.profilePicture = Buffer.from(saved.profilePicture, 'base64');
        }
    } catch (e) {}
}

async function cloneCommand(sock, chatId, message) {
    try {
        const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || "").toLowerCase().trim();
        const isUnclone = text.startsWith('.unclone');

        // ===================== UNCLONE =====================
        if (isUnclone) {
            if (!originalProfile.isCloned) {
                return sock.sendMessage(chatId, { text: "❌ *Bot is not cloned yet.*" }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

            if (originalProfile.status) await sock.updateProfileStatus(originalProfile.status).catch(() => {});
            if (originalProfile.profilePicture) {
                await sock.updateProfilePicture(sock.user.id, originalProfile.profilePicture).catch(() => {});
            }

            originalProfile.isCloned = false;
            return sock.sendMessage(chatId, { text: "✅ *Successfully Uncloned!* Bot restored to original." }, { quoted: message });
        }

        // ===================== CLONE =====================
        let targetJid = null;
        const context = message.message?.extendedTextMessage?.contextInfo;

        if (context?.mentionedJid?.length > 0) targetJid = context.mentionedJid[0];
        else if (context?.quotedMessage) targetJid = context.participant || message.key.remoteJid;

        if (!targetJid) {
            return sock.sendMessage(chatId, { 
                text: "❌ *Usage:*\nReply to a message or tag someone.\n\n`.clone @user`" 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '👥', key: message.key } });
        await sock.sendMessage(chatId, { text: '👥 *Cloning... Please wait*' }, { quoted: message });

        // Save Original Profile (First Time Only)
        if (!originalProfile.isCloned) {
            try {
                const myStatus = await sock.fetchStatus(sock.user.id);
                originalProfile.status = myStatus[0]?.status || "Powered by Mickey Glitch";
            } catch {}

            try {
                const myPp = await sock.profilePictureUrl(sock.user.id, 'image');
                originalProfile.profilePicture = await fetchBuffer(myPp);
            } catch {}

            originalProfile.isCloned = true;

            fs.writeFileSync(dataPath, JSON.stringify({
                status: originalProfile.status,
                profilePicture: originalProfile.profilePicture ? originalProfile.profilePicture.toString('base64') : null,
                isCloned: true
            }, null, 2));
        }

        // Get Target PP
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (e) {
            return sock.sendMessage(chatId, { text: "❌ Target has hidden their profile picture." }, { quoted: message });
        }

        let buffer = await fetchBuffer(ppUrl);
        if (!buffer) throw new Error("Download failed");

        // === RESIZE IMAGE (Very Important for Baileys) ===
        try {
            const image = await Jimp.read(buffer);
            image.resize(720, Jimp.AUTO);           // Resize to recommended size
            buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        } catch (e) {
            console.log("Jimp resize failed, using original");
        }

        // Update Profile Picture
        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.updateProfilePicture(myJid, buffer);

        // Update Status
        let name = "Unknown";
        try {
            const contact = await sock.onWhatsApp(targetJid);
            name = contact[0]?.notify || name;
        } catch {}

        await sock.updateProfileStatus(`Cloned from ${name} | Mickey Glitch Tech`);

        await sock.sendMessage(chatId, {
            text: `✅ *CLONE SUCCESSFUL!*\n\n👤 Cloned from: ${name}\n📸 Profile Picture Updated\n\nUse *.unclone* to restore.`
        }, { quoted: message });

    } catch (err) {
        console.error("Clone Error:", err.message);
        await sock.sendMessage(chatId, {
            text: `❌ *Clone Failed!*\n\nThis feature is very sensitive in Baileys.\n\nBest working conditions:\n• Use Termux\n• Install: npm install jimp\n• Avoid Railway/Render (they block it)\n\nTry again after some time.`
        }, { quoted: message });
    }
}

module.exports = cloneCommand;