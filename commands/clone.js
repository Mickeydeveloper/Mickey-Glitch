const fs = require('fs');
const path = require('path');
const { fetchBuffer } = require('../lib/myfunc');
const Jimp = require('jimp');
const { generateProfilePicture, getProfilePictureUrl } = require('@whiskeysockets/baileys');

const dataPath = path.join(__dirname, '../data/original_profile.json');

let originalProfile = {
    profilePicture: null,
    status: null,
    name: null,
    isCloned: false
};

// Load original data
if (fs.existsSync(dataPath)) {
    try {
        const saved = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        originalProfile.status = saved.status;
        originalProfile.name = saved.name;
        originalProfile.isCloned = saved.isCloned || false;
        if (saved.profilePicture) {
            originalProfile.profilePicture = Buffer.from(saved.profilePicture, 'base64');
        }
    } catch (e) {
        console.error('Error loading profile data:', e.message);
    }
}

async function optimizeImage(buffer) {
    try {
        console.log('[Clone] Starting image optimization...');
        const image = await Jimp.read(buffer);
        
        // Get dimensions
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        console.log(`[Clone] Original size: ${width}x${height}`);
        
        // Resize to 720x720 (WhatsApp profile picture standard)
        image.resize(720, 720);
        
        // Compress and convert to JPEG
        const optimized = await image.quality(85).getBufferAsync(Jimp.MIME_JPEG);
        console.log(`[Clone] Image optimized to 720x720 JPEG, size: ${optimized.length} bytes`);
        
        return optimized;
    } catch (err) {
        console.error('[Clone] Image optimization failed:', err.message);
        return buffer;
    }
}

async function getProfilePictureFromBaileys(sock, jid) {
    try {
        console.log(`[Clone] Fetching profile picture via Baileys for ${jid}...`);
        
        // Try to get from store cache first
        if (sock.store?.contacts && sock.store.contacts[jid]?.imgUrl) {
            console.log('[Clone] Found profile picture in store cache');
            const buffer = await fetchBuffer(sock.store.contacts[jid].imgUrl);
            if (buffer) return buffer;
        }
        
        // Use Baileys profilePictureUrl method
        const pictureUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);
        if (pictureUrl) {
            console.log('[Clone] Profile picture URL obtained via Baileys');
            const buffer = await fetchBuffer(pictureUrl);
            if (buffer) return buffer;
        }
        
        return null;
    } catch (err) {
        console.error('[Clone] Error getting profile picture via Baileys:', err.message);
        return null;
    }
}

async function updateProfilePictureViaBaileys(sock, buffer) {
    try {
        console.log('[Clone] Updating profile picture via Baileys...');
        
        const presenceJid = sock.user.id;
        
        // Use Baileys updateProfilePicture method
        await sock.updateProfilePicture(presenceJid, buffer);
        console.log('[Clone] Profile picture updated successfully via Baileys');
        
        return true;
    } catch (err) {
        console.error('[Clone] Failed to update profile picture via Baileys:', err.message);
        return false;
    }
}

async function updateStatusViaBaileys(sock, statusText) {
    try {
        console.log('[Clone] Updating status via Baileys...');
        
        // Use Baileys updateProfileStatus method
        await sock.updateProfileStatus(statusText);
        console.log('[Clone] Status updated successfully via Baileys');
        
        return true;
    } catch (err) {
        console.error('[Clone] Failed to update status via Baileys:', err.message);
        return false;
    }
}

async function getCurrentProfileViaBaileys(sock) {
    try {
        console.log('[Clone] Fetching current profile via Baileys...');
        
        const presenceJid = sock.user.id;
        const profileData = {
            name: sock.user.name || "Bot",
            status: null,
            picture: null
        };
        
        // Get status via Baileys
        try {
            const statuses = await sock.fetchStatus(presenceJid);
            if (statuses && statuses.length > 0) {
                profileData.status = statuses[0].status || "Powered by Mickey Glitch";
            }
        } catch (err) {
            console.log('[Clone] Could not fetch status via Baileys:', err.message);
        }
        
        // Get profile picture via Baileys
        try {
            const picture = await getProfilePictureFromBaileys(sock, presenceJid);
            if (picture) {
                profileData.picture = picture;
            }
        } catch (err) {
            console.log('[Clone] Could not fetch profile picture via Baileys:', err.message);
        }
        
        return profileData;
    } catch (err) {
        console.error('[Clone] Error fetching current profile via Baileys:', err.message);
        return null;
    }
}

async function getTargetProfileViaBaileys(sock, targetJid) {
    try {
        console.log(`[Clone] Fetching target profile via Baileys for ${targetJid}...`);
        
        const targetData = {
            jid: targetJid,
            name: "Unknown",
            picture: null
        };
        
        // Get name via Baileys
        try {
            const contact = await sock.onWhatsApp(targetJid);
            if (contact && contact.length > 0) {
                targetData.name = contact[0].notify || targetJid.split('@')[0];
            }
        } catch (err) {
            console.log('[Clone] Could not fetch name via Baileys:', err.message);
        }
        
        // Get profile picture via Baileys
        try {
            const picture = await getProfilePictureFromBaileys(sock, targetJid);
            if (picture) {
                targetData.picture = picture;
            } else {
                throw new Error("No profile picture found");
            }
        } catch (err) {
            console.error('[Clone] Could not fetch profile picture via Baileys:', err.message);
            return null;
        }
        
        return targetData;
    } catch (err) {
        console.error('[Clone] Error fetching target profile via Baileys:', err.message);
        return null;
    }
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

            console.log('[Clone] Starting UNCLONE process via Baileys...');
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

            let restored = false;

            // Restore Status
            if (originalProfile.status) {
                const statusRestored = await updateStatusViaBaileys(sock, originalProfile.status);
                if (statusRestored) restored = true;
            }

            // Restore Profile Picture
            if (originalProfile.profilePicture) {
                const picRestored = await updateProfilePictureViaBaileys(sock, originalProfile.profilePicture);
                if (picRestored) restored = true;
            }

            originalProfile.isCloned = false;
            
            if (restored) {
                return sock.sendMessage(chatId, { 
                    text: `✅ *Successfully Uncloned!*\n\n👤 Restored to: ${originalProfile.name || 'original profile'}` 
                }, { quoted: message });
            } else {
                return sock.sendMessage(chatId, { text: "⚠️ *Unclone attempted but had issues. Try manually.*" }, { quoted: message });
            }
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

        console.log(`[Clone] Cloning user via Baileys: ${targetJid}`);
        await sock.sendMessage(chatId, { react: { text: '👥', key: message.key } });
        await sock.sendMessage(chatId, { text: '👥 *Cloning... Please wait*' }, { quoted: message });

        // Save Original Profile (First Time Only)
        if (!originalProfile.isCloned) {
            console.log('[Clone] Saving original profile via Baileys...');
            
            const currentProfile = await getCurrentProfileViaBaileys(sock);
            if (currentProfile) {
                originalProfile.status = currentProfile.status;
                originalProfile.name = currentProfile.name;
                originalProfile.profilePicture = currentProfile.picture;
                originalProfile.isCloned = true;

                // Save to file
                try {
                    fs.writeFileSync(dataPath, JSON.stringify({
                        status: originalProfile.status,
                        name: originalProfile.name,
                        profilePicture: originalProfile.profilePicture ? originalProfile.profilePicture.toString('base64') : null,
                        isCloned: true
                    }, null, 2));
                    console.log('[Clone] Original profile saved to file');
                } catch (err) {
                    console.error('[Clone] Could not save profile data:', err.message);
                }
            }
        }

        // Get Target Profile via Baileys
        console.log('[Clone] Fetching target profile via Baileys...');
        const targetProfile = await getTargetProfileViaBaileys(sock, targetJid);
        
        if (!targetProfile) {
            return sock.sendMessage(chatId, { 
                text: "❌ Target has hidden their profile picture or could not be accessed." 
            }, { quoted: message });
        }

        let buffer = targetProfile.picture;
        console.log(`[Clone] Buffer received: ${buffer.length} bytes`);

        // === OPTIMIZE IMAGE ===
        buffer = await optimizeImage(buffer);

        // Update Profile Picture via Baileys
        console.log('[Clone] Updating profile picture via Baileys...');
        const picUpdated = await updateProfilePictureViaBaileys(sock, buffer);
        
        if (!picUpdated) {
            throw new Error("Failed to update profile picture via Baileys");
        }

        // Update Status via Baileys
        console.log('[Clone] Updating status via Baileys...');
        const newStatus = `Cloned from ${targetProfile.name} | Mickey Glitch Tech`;
        const statusUpdated = await updateStatusViaBaileys(sock, newStatus);

        await sock.sendMessage(chatId, {
            text: `✅ *CLONE SUCCESSFUL!*\n\n👤 Cloned from: ${targetProfile.name}\n📸 Profile Picture Updated\n📝 Status Updated\n\nUse *.unclone* to restore.`
        }, { quoted: message });

    } catch (err) {
        console.error("Clone Error:", err);
        await sock.sendMessage(chatId, {
            text: `❌ *Clone Failed!*\n\nError: ${err.message}\n\nTroubleshooting:\n• Ensure Baileys is installed\n• Restart your bot\n• Avoid cloning frequently\n• Check console for details`
        }, { quoted: message });
    }
}

module.exports = cloneCommand;