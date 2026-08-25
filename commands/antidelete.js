const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

async function downloadToBuffer(message, mediaType) {
    const stream = await downloadContentFromMessage(message, mediaType);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Function to get folder size in MB
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }

        return totalSize / (1024 * 1024); // Convert bytes to MB
    } catch (err) {
        console.error('Error getting folder size:', err);
        return 0;
    }
};

// Function to clean temp folder if size exceeds 10MB
const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        
        if (sizeMB > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
};

// Start periodic cleanup check every 1 minute
setInterval(cleanTempFolderIfLarge, 60 * 1000);

// Load config
function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return { enabled: false, notifyGroup: false, ...JSON.parse(fs.readFileSync(CONFIG_PATH)) };
    } catch {
        return { enabled: false, notifyGroup: false };
    }
}

// Save config
function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Config save error:', err);
    }
}

const isOwnerOrSudo = require('../lib/isOwner');

// Command Handler
async function handleAntideleteCommand(sock, chatId, message, match) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
    
    if (!message.key.fromMe && !isOwner) {
        return sock.sendMessage(chatId, { text: '*Only the bot owner can use this command.*' }, { quoted: message });
    }

    const config = loadAntideleteConfig();

    const action = String(match || '').trim().toLowerCase();

    if (!action) {
        return sock.sendMessage(chatId, {
            text: `*ANTIDELETE*\n\nStatus: ${config.enabled ? '✅ ON' : '❌ OFF'}\nGroup alerts: ${config.notifyGroup ? '✅ ON' : '❌ OFF'}\n\n.antidelete on\n.antidelete off\n.antidelete group on\n.antidelete group off`
        }, {quoted: message});
    }

    if (action === 'on') {
        config.enabled = true;
    } else if (action === 'off') {
        config.enabled = false;
    } else if (action === 'group on') {
        config.notifyGroup = true;
    } else if (action === 'group off') {
        config.notifyGroup = false;
    } else {
        return sock.sendMessage(chatId, { text: '*Invalid command. Use .antidelete to see usage.*' }, { quoted: message });
    }

    saveAntideleteConfig(config);
    const status = action === 'on' ? 'enabled' : action === 'off' ? 'disabled' : `group alerts ${action.endsWith('on') ? 'enabled' : 'disabled'}`;
    return sock.sendMessage(chatId, { text: `✅ *Antidelete ${status}*` }, { quoted: message });
}

// Store incoming messages (also handles anti-view-once by forwarding immediately)
async function storeMessage(sock, message) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return; // Don't store if antidelete is disabled

        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;

        const sender = message.key.participant || message.key.remoteJid;

        // Detect content (including view-once wrappers)
        const viewOnceContainer = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        if (viewOnceContainer) {
            // unwrap view-once content
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content = viewOnceContainer.imageMessage.caption || '';
                const buffer = await downloadToBuffer(viewOnceContainer.imageMessage, 'image');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content = viewOnceContainer.videoMessage.caption || '';
                const buffer = await downloadToBuffer(viewOnceContainer.videoMessage, 'video');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            }
        } else if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const buffer = await downloadToBuffer(message.message.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadToBuffer(message.message.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const buffer = await downloadToBuffer(message.message.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const mime = message.message.audioMessage.mimetype || '';
            const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3');
            const buffer = await downloadToBuffer(message.message.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.documentMessage) {
            mediaType = 'document';
            const document = message.message.documentMessage;
            const extension = (document.fileName || 'file').split('.').pop().replace(/[^a-z0-9]/gi, '') || 'bin';
            const buffer = await downloadToBuffer(document, 'document');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${extension}`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        // Anti-ViewOnce: forward immediately to owner if captured
        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const senderName = sender.split('@')[0];
                const mediaOptions = {
                    caption: `*Anti-ViewOnce ${mediaType}*
From: @${senderName}`,
                    mentions: [sender]
                };
                if (mediaType === 'image') {
                    await sock.sendMessage(ownerNumber, { image: { url: mediaPath }, ...mediaOptions });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(ownerNumber, { video: { url: mediaPath }, ...mediaOptions });
                }
                // Cleanup immediately for view-once forward
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch (e) {
                // ignore
            }
        }

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// Handle message deletion
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const chatId = revocationMessage.key.remoteJid;
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        if (deletedBy.includes(sock.user.id) || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const deletedByName = deletedBy.split('@')[0];
        const isGroup = chatId.endsWith('@g.us');
        const groupName = isGroup ? (await sock.groupMetadata(chatId)).subject : '';

        const time = new Date().toLocaleString('en-GB', {
            timeZone: 'Africa/Dar_es_Salaam',
            hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: 'short', year: 'numeric'
        });

        const messageText = String(original.content || '').trim();
        const preview = messageText.length > 2000
            ? `${messageText.slice(0, 2000)}...`
            : messageText;
        let reportText = [
            '╭─〔 🗑️ *DELETED MESSAGE* 〕',
            `│ 👤 From: @${senderName}`,
            `│ 🕒 Time: ${time}`,
            ...(isGroup ? [`│ 👥 Group: ${groupName}`] : []),
            `│ 📦 Type: ${original.mediaType || 'text'}`,
            '╰────────────────',
            ...(preview ? ['', `> ${preview.replace(/\n/g, '\n> ')}`] : []),
        ].join('\n');

        // Quiet mode: restore deleted content to the owner without group spam.
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption: reportText,
                mentions: [deletedBy, sender]
            };

            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(ownerNumber, {
                            image: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'sticker':
                        await sock.sendMessage(ownerNumber, {
                            sticker: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerNumber, {
                            video: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'audio':
                        await sock.sendMessage(ownerNumber, {
                            audio: { url: original.mediaPath },
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            ...mediaOptions
                        });
                        break;
                    case 'document':
                        await sock.sendMessage(ownerNumber, {
                            document: { url: original.mediaPath },
                            fileName: path.basename(original.mediaPath),
                            mimetype: 'application/octet-stream',
                            ...mediaOptions
                        });
                        break;
                }
            } catch (err) {
                console.error('Deleted media send error:', err.message);
            }

            // Cleanup
            try {
                fs.unlinkSync(original.mediaPath);
            } catch (err) {
                console.error('Media cleanup error:', err);
            }
        } else {
            await sock.sendMessage(ownerNumber, {
                text: reportText,
                mentions: [deletedBy, sender]
            });
        }

        if (config.notifyGroup && isGroup) {
            await sock.sendMessage(chatId, {
                text: `🗑️ Message deleted by @${deletedByName}`,
                mentions: [deletedBy]
            }).catch(() => {});
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

module.exports = {
    handleAntideleteCommand,
    handleMessageRevocation,
    storeMessage
};
