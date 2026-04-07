
const fs = require('fs');
const path = require('path');
const { fetchBuffer } = require('../lib/myfunc'); // Change path if needed

const dataPath = path.join(__dirname, '../data/original_profile.json');

let originalProfile = {
    profilePicture: null,
    status: null,
    isCloned: false
};

// Load original profile data if it exists
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

            // Restore Status
            if (originalProfile.status) {
                await sock.updateProfileStatus(originalProfile.status).catch(() => {});
            }

            // Restore Profile Picture
            if (originalProfile.profilePicture) {
                await sock.updateProfilePicture(sock.user.id, originalProfile.profilePicture).catch(() => {});
            }

            originalProfile.isCloned = false;

            return sock.sendMessage(chatId, {
                text: `✅ *UNCLONE SUCCESSFUL*\n\nBot has been restored to its original identity.`
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
                text: "❌ *Usage:*\nReply to someone's message or tag a user\n\nExample: `.clone @2557xxxxxxxx`"
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '👥', key: message.key } });
        await sock.sendMessage(chatId, { text: '👥 *Cloning identity... Please wait*' }, { quoted: message });

        // Save original profile (only once)
        if (!originalProfile.isCloned) {
            try {
                const myStatus = await sock.fetchStatus(sock.user.id);
                originalProfile.status = myStatus[0]?.status || "Powered by Mickey Glitch Tech";
            } catch (e) {}

            try {
                const myPpUrl = await sock.profilePictureUrl(sock.user.id, 'image');
                originalProfile.profilePicture = await fetchBuffer(myPpUrl);
            } catch (e) {
                console.log("Original profile picture not found");
            }

            originalProfile.isCloned = true;

            // Save to file
            fs.writeFileSync(dataPath, JSON.stringify({
                status: originalProfile.status,
                profilePicture: originalProfile.profilePicture ? originalProfile.profilePicture.toString('base64') : null,
                isCloned: true
            }, null, 2));
        }

        // Get target's profile picture
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (e) {
            return sock.sendMessage(chatId, { 
                text: "❌ *This user has no profile picture or it is hidden.*" 
            }, { quoted: message });
        }

        const buffer = await fetchBuffer(ppUrl);

        if (!buffer) {
            throw new Error("Failed to download profile picture");
        }

        // Update Bot's Profile Picture
        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.updateProfilePicture(myJid, buffer);

        // Get target's name
        let name = "Unknown User";
        try {
            const contact = await sock.onWhatsApp(targetJid);
            name = contact[0]?.notify || name;
        } catch {}

        // Update Status
        await sock.updateProfileStatus(`Cloned from ${name} | Mickey Glitch Tech`);

        await sock.sendMessage(chatId, {
            text: `✅ *CLONE SUCCESSFUL!*\n\n👤 *Cloned from:* ${name}\n📸 *Profile Picture:* Updated\n\nUse *.unclone* to restore original identity.`
        }, { quoted: message });

    } catch (err) {
        console.error("Clone Error:", err.message);
        await sock.sendMessage(chatId, {
            text: `❌ *Clone Failed!*\n\nPossible reasons:\n• Target user has hidden their profile picture\n• Bot doesn't have permission to change profile\n• Hosting platform blocks profile update\n\nTry again later or use a different hosting.`
        }, { quoted: message });
    }
}

module.exports = cloneCommand;