const fs = require('fs');
const path = require('path');
const { fetchBuffer } = require('../lib/myfunc'); 

const dataPath = path.join(__dirname, '../data/original_profile.json');

let originalProfile = {
    profilePicture: null,
    status: null,
    isCloned: false
};

// Load saved original profile
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
        const text = (message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || "").toLowerCase().trim();

        const isUnclone = text.startsWith('.unclone');

        // ===================== UNCLONE =====================
        if (isUnclone) {
            if (!originalProfile.isCloned) {
                return sock.sendMessage(chatId, { 
                    text: "❌ *Bot is not cloned yet. Nothing to restore.*" 
                }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

            if (originalProfile.status) {
                await sock.updateProfileStatus(originalProfile.status).catch(() => {});
            }

            if (originalProfile.profilePicture) {
                await sock.updateProfilePicture(sock.user.id, originalProfile.profilePicture).catch(() => {});
            }

            originalProfile.isCloned = false;

            return sock.sendMessage(chatId, {
                text: `✅ *UNCLONE SUCCESSFUL*\n\nBot has been restored to original identity.`
            }, { quoted: message });
        }

        // ===================== CLONE =====================
        let targetJid = null;
        const context = message.message?.extendedTextMessage?.contextInfo;

        if (context?.mentionedJid?.length > 0) {
            targetJid = context.mentionedJid[0];
        } else if (context?.quotedMessage) {
            targetJid = context.participant || message.key.remoteJid;
        }

        if (!targetJid) {
            return sock.sendMessage(chatId, {
                text: "❌ *Usage:*\n• Reply to someone's message\n• Or tag a user\n\nExample: `.clone @255712345678`"
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '👥', key: message.key } });
        await sock.sendMessage(chatId, { text: '👥 *Cloning profile... Please wait*' }, { quoted: message });

        // Save original profile (only first time)
        if (!originalProfile.isCloned) {
            try {
                const myStatus = await sock.fetchStatus(sock.user.id);
                originalProfile.status = myStatus[0]?.status || "Powered by Mickey Glitch Tech";
            } catch {}

            try {
                const myPpUrl = await sock.profilePictureUrl(sock.user.id, 'image');
                originalProfile.profilePicture = await fetchBuffer(myPpUrl);
            } catch {}

            originalProfile.isCloned = true;

            fs.writeFileSync(dataPath, JSON.stringify({
                status: originalProfile.status,
                profilePicture: originalProfile.profilePicture ? originalProfile.profilePicture.toString('base64') : null,
                isCloned: true
            }, null, 2));
        }

        // Get target profile picture
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (e) {
            return sock.sendMessage(chatId, { 
                text: "❌ *Target user has hidden their profile picture or it is not available.*" 
            }, { quoted: message });
        }

        const buffer = await fetchBuffer(ppUrl);
        if (!buffer) throw new Error("Failed to download image");

        // Update Profile Picture (Fixed version)
        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        await sock.updateProfilePicture(myJid, buffer);

        // Get name
        let name = "Unknown User";
        try {
            const contact = await sock.onWhatsApp(targetJid);
            name = contact[0]?.notify || name;
        } catch {}

        await sock.updateProfileStatus(`Cloned from ${name} | Mickey Glitch Tech`);

        await sock.sendMessage(chatId, {
            text: `✅ *CLONE SUCCESSFUL!*\n\n👤 *Cloned from:* ${name}\n📸 *Profile Picture:* Changed successfully\n\nUse *.unclone* to restore original.`
        }, { quoted: message });

    } catch (err) {
        console.error("Clone Error:", err.message);
        
        let errorMsg = "❌ *Clone Failed!*";

        if (err.message?.includes("unauthorized") || err.message?.includes("forbidden")) {
            errorMsg += "\n\nBot does not have permission to change profile picture.";
        } else if (err.message?.includes("bad request") || err.message?.includes("image")) {
            errorMsg += "\n\nImage processing failed. Make sure 'jimp' is installed.";
        } else {
            errorMsg += "\n\nThis feature is often blocked by WhatsApp or your hosting provider (Railway, Render, etc.).";
        }

        errorMsg += "\n\nTry on Termux or a VPS for better success rate.";

        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = cloneCommand;