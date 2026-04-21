/**
 * antidelete.js
 * Imeboreshwa na kurekebishwa - Inafanya kazi vizuri sasa
 */

const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

// Ensure directories exist
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
}

// Folder size & cleanup
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath, { withFileTypes: true });
        let totalSize = 0;
        for (const file of files) {
            if (file.isFile()) {
                totalSize += fs.statSync(path.join(folderPath, file.name)).size;
            }
        }
        return totalSize / (1024 * 1024);
    } catch {
        return 0;
    }
};

const cleanTempFolderIfLarge = () => {
    try {
        if (getFolderSizeInMB(TEMP_MEDIA_DIR) > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                try { fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file)); } catch {}
            }
        }
    } catch {}
};

setInterval(cleanTempFolderIfLarge, 10 * 60 * 1000);

// Config functions
function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
        return { enabled: false };
    }
}

function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Antidelete config save error:', err);
    }
}

const { isOwnerOrSudo } = require('../lib/isOwner'); // Imeboreshwa import

// ====================== COMMAND HANDLER ======================
async function handleAntideleteCommand(sock, chatId, message, args = '') {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!isOwner) {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Only the bot owner can use this command._*' 
            }, { quoted: message });
        }

        const config = loadAntideleteConfig();
        const commandArgs = args.toString().toLowerCase().trim();

        if (!commandArgs || commandArgs === '') {
            const status = config.enabled ? '✅ Enabled' : '❌ Disabled';
            const usage = `*🛡️ ANTIDELETE SETUP*\n\n` +
                         `Current Status: ${status}\n\n` +
                         `*.antidelete on* - Washa\n` +
                         `*.antidelete off* - Zima\n` +
                         `*.antidelete status* - Angalia hali`;

            return sock.sendMessage(chatId, { text: usage }, { quoted: message });
        }

        let replyText = '';

        if (commandArgs === 'on') {
            config.enabled = true;
            replyText = '*_✅ Antidelete imewekwa ON!_*';
        } 
        else if (commandArgs === 'off') {
            config.enabled = false;
            replyText = '*_✅ Antidelete imewekwa OFF!_*';
        } 
        else if (commandArgs === 'status') {
            const status = config.enabled ? '✅ Enabled' : '❌ Disabled';
            replyText = `*📊 ANTIDELETE STATUS*\n\nCurrent Status: ${status}`;
        } 
        else {
            return sock.sendMessage(chatId, { 
                text: '*_❌ Invalid command. Tumia .antidelete kuona maelekezo_*' 
            }, { quoted: message });
        }

        saveAntideleteConfig(config);
        await sock.sendMessage(chatId, { text: replyText }, { quoted: message });

    } catch (error) {
        console.error('Error in handleAntideleteCommand:', error);
        await sock.sendMessage(chatId, { 
            text: '*_❌ Kuna tatizo katika kutekeleza antidelete command_*' 
        }, { quoted: message });
    }
}

// ====================== STORE MESSAGE ======================
async function storeMessage(sock, message) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        if (!message.key?.id) return;

        const messageId = message.key.id;
        const sender = message.key.participant || message.key.remoteJid;

        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;

        // Handle ViewOnce
        const viewOnceMsg = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        const msgContent = viewOnceMsg || message.message;

        if (viewOnceMsg) isViewOnce = true;

        if (msgContent?.imageMessage) {
            mediaType = 'image';
            content = msgContent.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(msgContent.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } 
        else if (msgContent?.videoMessage) {
            mediaType = 'video';
            content = msgContent.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(msgContent.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } 
        else if (msgContent?.conversation) {
            content = msgContent.conversation;
        } 
        else if (msgContent?.extendedTextMessage?.text) {
            content = msgContent.extendedTextMessage.text;
        } 
        else if (msgContent?.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(msgContent.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } 
        else if (msgContent?.audioMessage) {
            mediaType = 'audio';
            const buffer = await downloadContentFromMessage(msgContent.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: Date.now()
        });

        // Forward ViewOnce immediately to owner
        if (isViewOnce && mediaPath && fs.existsSync(mediaPath)) {
            const owner = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            await sock.sendMessage(owner, {
                text: `🔍 *Anti-ViewOnce Detected*\nFrom: @${sender.split('@')[0]}`,
                mentions: [sender]
            });

            if (mediaType === 'image') {
                await sock.sendMessage(owner, { image: { url: mediaPath } });
            } else if (mediaType === 'video') {
                await sock.sendMessage(owner, { video: { url: mediaPath } });
            }
        }

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// ====================== HANDLE DELETION ======================
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message?.protocolMessage?.key?.id;
        if (!messageId) return;

        const deletedBy = revocationMessage.participant || revocationMessage.key?.participant || revocationMessage.key?.remoteJid;
        const chatId = revocationMessage.key.remoteJid;
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Usiripoti kama ni bot au owner aliyefuta
        if (deletedBy?.includes(sock.user.id.split(':')[0]) || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const senderName = original.sender.split('@')[0];
        const deletedByName = deletedBy.split('@')[0];
        const isGroup = chatId.endsWith('@g.us');

        let groupName = 'Private Chat';
        if (isGroup) {
            try {
                const metadata = await sock.groupMetadata(chatId);
                groupName = metadata.subject || 'Unknown Group';
            } catch {}
        }

        const reportText = `🗑️ *ANTIDELETE ALERT*\n\n` +
            `Deleted By: @${deletedByName}\n` +
            `Original Sender: @${senderName}\n` +
            `Chat: ${groupName}\n` +
            `Time: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}\n\n` +
            (original.content ? `📝 *Message:*\n${original.content}` : '');

        await sock.sendMessage(ownerNumber, {
            text: reportText,
            mentions: [deletedBy, original.sender]
        });

        // Send media if exists
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = { caption: `*Deleted \( {original.mediaType} from @ \){senderName}*`, mentions: [original.sender] };

            if (original.mediaType === 'image') {
                await sock.sendMessage(ownerNumber, { image: { url: original.mediaPath }, ...mediaOptions });
            } else if (original.mediaType === 'video') {
                await sock.sendMessage(ownerNumber, { video: { url: original.mediaPath }, ...mediaOptions });
            } else if (original.mediaType === 'sticker') {
                await sock.sendMessage(ownerNumber, { sticker: { url: original.mediaPath } });
            }

            // Cleanup
            try { fs.unlinkSync(original.mediaPath); } catch {}
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

module.exports = {
    handleAntideleteCommand,
    storeMessage,
    handleMessageRevocation
};