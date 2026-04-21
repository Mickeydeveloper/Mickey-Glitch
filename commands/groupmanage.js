/**
 * groupSettings.js
 * Set Group Name, Description & Profile Picture
 * Imeboreshwa na kutumia isAdmin mpya
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { isAdmin } = require('../lib/isAdmin');

const TMP_DIR = path.join(process.cwd(), 'tmp');

// Hakikisha tmp folder ipo
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Helper function - Inatumia isAdmin mpya
 */
async function ensureGroupAndAdmin(sock, chatId, senderId, message) {
    try {
        const adminStatus = await isAdmin(sock, chatId, senderId);

        if (!adminStatus.isGroup) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
            return { ok: false };
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Bot lazima iwe Admin ili kubadilisha group settings!_\n\nNipandishe vyeo kwanza.' 
            }, { quoted: message });
            return { ok: false };
        }

        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Only group admins can use this command!_*' 
            }, { quoted: message });
            return { ok: false };
        }

        return { ok: true };

    } catch (err) {
        console.error('Admin check error:', err);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Hitilafu katika kuangalia admin status._*' 
        }, { quoted: message });
        return { ok: false };
    }
}

// ====================== SET GROUP DESCRIPTION ======================
async function setGroupDescription(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
    if (!check.ok) return;

    const desc = (text || '').trim();
    if (!desc) {
        return sock.sendMessage(chatId, { 
            text: '*_Usage: .setgdesc <maelezo mapya ya group>_*' 
        }, { quoted: message });
    }

    try {
        await sock.groupUpdateDescription(chatId, desc);
        await sock.sendMessage(chatId, { 
            text: '✅ *Group description imebadilishwa vizuri!*' 
        }, { quoted: message });
    } catch (e) {
        console.error('Set description error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Imeshindwa kubadilisha group description.*' 
        }, { quoted: message });
    }
}

// ====================== SET GROUP NAME ======================
async function setGroupName(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
    if (!check.ok) return;

    const name = (text || '').trim();
    if (!name) {
        return sock.sendMessage(chatId, { 
            text: '*_Usage: .setgname <jina jipya la group>_*' 
        }, { quoted: message });
    }

    try {
        await sock.groupUpdateSubject(chatId, name);
        await sock.sendMessage(chatId, { 
            text: '✅ *Group name imebadilishwa vizuri!*' 
        }, { quoted: message });
    } catch (e) {
        console.error('Set name error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Imeshindwa kubadilisha group name.*' 
        }, { quoted: message });
    }
}

// ====================== SET GROUP PROFILE PICTURE ======================
async function setGroupPhoto(sock, chatId, senderId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
    if (!check.ok) return;

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage || quoted?.stickerMessage;

    if (!imageMessage) {
        return sock.sendMessage(chatId, { 
            text: '*_Reply kwenye picha au sticker kisha tumia .setgpp_*' 
        }, { quoted: message });
    }

    try {
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const imgPath = path.join(TMP_DIR, `gpp_${Date.now()}.jpg`);
        fs.writeFileSync(imgPath, buffer);

        await sock.updateProfilePicture(chatId, { url: imgPath });

        // Cleanup
        setTimeout(() => {
            try { fs.unlinkSync(imgPath); } catch {}
        }, 5000);

        await sock.sendMessage(chatId, { 
            text: '✅ *Picha ya group imebadilishwa vizuri!*' 
        }, { quoted: message });

    } catch (e) {
        console.error('Set profile photo error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Imeshindwa kubadilisha picha ya group.*\nHakikisha bot ni admin.' 
        }, { quoted: message });
    }
}

module.exports = {
    setGroupDescription,
    setGroupName,
    setGroupPhoto
};