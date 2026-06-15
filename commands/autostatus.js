const fs = require('fs/promises');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const DEFAULT_CONFIG = Object.freeze({
    enabled: false,
    viewEnabled: false,
    likeEnabled: false,
    forwardEnabled: false  // Changed from downloadEnabled to forwardEnabled
});

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '😱', '👍', '🎉', '😍', '💯', '🙏', '😢', '🤔', '😁'];

let configCache = null;
const processedStatusIds = new Set();

async function loadConfig() {
    if (configCache) return configCache;
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(data);
        configCache = { ...DEFAULT_CONFIG, ...parsed };
    } catch (err) {
        configCache = { ...DEFAULT_CONFIG };
        await saveConfig(configCache);
    }
    
    return configCache;
}

async function saveConfig(updates) {
    configCache = { ...configCache, ...updates };
    try {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2), 'utf8');
    } catch (err) {
        console.error('[AutoStatus] Save failed:', err.message);
    }
}

function getRandomEmoji() {
    return EMOJI_REACTIONS[Math.floor(Math.random() * EMOJI_REACTIONS.length)];
}

function getStatusType(mimetype) {
    if (mimetype.startsWith('image/')) return '🖼️ IMAGE';
    if (mimetype.startsWith('video/')) return '🎥 VIDEO';
    if (mimetype.startsWith('audio/')) return '🎵 AUDIO';
    return '📄 DOCUMENT';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;
    try {
        await sock.readMessages([statusKey]);
        console.log(`[AutoView] Successfully viewed status: ${statusKey.id}`);
    } catch (err) {
        console.error(`[AutoView] Failed:`, err.message);
    }
}

async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;

    const emoji = getRandomEmoji();
    const participantJid = statusKey.participant;

    try {
        await sock.sendMessage('status@broadcast', {
            react: {
                text: emoji,
                key: statusKey
            }
        }, {
            statusJidList: [participantJid]
        });
        console.log(`[AutoLike] Successfully liked status: ${statusKey.id} with ${emoji}`);
    } catch (err) {
        console.error(`[AutoLike] Failed:`, err.message || err);
    }
}

async function forwardStatusToBot(sock, statusKey, fullMessage, botNumber) {
    if (!statusKey?.id || !botNumber) return null;
    
    try {
        const message = fullMessage.message;
        if (!message) return null;
        
        // Get sender info
        const senderJid = statusKey.participant;
        const senderName = senderJid.split('@')[0];
        
        // Check if message contains media
        let mediaBuffer = null;
        let mimetype = null;
        let caption = '';
        let messageType = '';
        
        if (message.imageMessage) {
            mediaBuffer = await sock.downloadMediaMessage(fullMessage);
            mimetype = message.imageMessage.mimetype;
            caption = message.imageMessage.caption || '';
            messageType = 'image';
        } else if (message.videoMessage) {
            mediaBuffer = await sock.downloadMediaMessage(fullMessage);
            mimetype = message.videoMessage.mimetype;
            caption = message.videoMessage.caption || '';
            messageType = 'video';
        } else if (message.audioMessage) {
            mediaBuffer = await sock.downloadMediaMessage(fullMessage);
            mimetype = message.audioMessage.mimetype;
            messageType = 'audio';
        } else if (message.documentMessage) {
            mediaBuffer = await sock.downloadMediaMessage(fullMessage);
            mimetype = message.documentMessage.mimetype;
            caption = message.documentMessage.caption || '';
            messageType = 'document';
        } else if (message.conversation) {
            // Text status
            const textMessage = `📝 *STATUS UPDATE*\n\n👤 From: @${senderName}\n💬 Message: ${message.conversation}\n\n⏰ Time: ${new Date().toLocaleString()}`;
            await sock.sendMessage(botNumber, { 
                text: textMessage,
                mentions: [senderJid]
            });
            return true;
        } else {
            console.log('[AutoForward] No media or text to forward');
            return null;
        }
        
        if (!mediaBuffer) {
            console.log('[AutoForward] Failed to download media');
            return null;
        }
        
        // Prepare caption with status info
        const mediaSize = formatFileSize(mediaBuffer.length);
        const statusType = getStatusType(mimetype);
        const timestamp = new Date().toLocaleString();
        
        const forwardCaption = `📬 *NEW STATUS RECEIVED*\n\n` +
                               `👤 *From:* @${senderName}\n` +
                               `📱 *JID:* ${senderJid}\n` +
                               `📁 *Type:* ${statusType}\n` +
                               `📊 *Size:* ${mediaSize}\n` +
                               `⏰ *Time:* ${timestamp}\n` +
                               `🆔 *ID:* ${statusKey.id.slice(-10)}\n\n` +
                               `${caption ? `💬 *Caption:* ${caption}\n\n` : ''}` +
                               `───────────────────\n` +
                               `⚡ *Auto-Forwarded by Bot*`;
        
        // Forward based on message type
        if (messageType === 'image') {
            await sock.sendMessage(botNumber, {
                image: mediaBuffer,
                caption: forwardCaption,
                mentions: [senderJid]
            });
        } else if (messageType === 'video') {
            await sock.sendMessage(botNumber, {
                video: mediaBuffer,
                caption: forwardCaption,
                mentions: [senderJid]
            });
        } else if (messageType === 'audio') {
            await sock.sendMessage(botNumber, {
                audio: mediaBuffer,
                mimetype: mimetype,
                caption: forwardCaption,
                mentions: [senderJid]
            });
        } else if (messageType === 'document') {
            await sock.sendMessage(botNumber, {
                document: mediaBuffer,
                mimetype: mimetype,
                fileName: `status_${senderName}_${Date.now()}.${mimetype.split('/')[1]}`,
                caption: forwardCaption,
                mentions: [senderJid]
            });
        }
        
        console.log(`[AutoForward] Successfully forwarded status to bot number: ${botNumber}`);
        return true;
        
    } catch (err) {
        console.error('[AutoForward] Failed:', err.message);
        return null;
    }
}

async function handleStatusUpdate(sock, ev, botNumber) {
    const cfg = await loadConfig();
    
    // Update enabled flag based on features
    const shouldBeEnabled = cfg.viewEnabled || cfg.likeEnabled || cfg.forwardEnabled;
    if (cfg.enabled !== shouldBeEnabled) {
        await saveConfig({ enabled: shouldBeEnabled });
        cfg.enabled = shouldBeEnabled;
    }
    
    if (!cfg.enabled) return;

    let statusKey = null;
    let fullMessage = null;

    if (ev.messages?.[0]?.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.messages[0].key;
        fullMessage = ev.messages[0];
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
        fullMessage = ev;
    }

    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;

    // Don't forward bot's own status
    if (statusKey.participant === sock.user.id) {
        console.log('[AutoStatus] Skipping bot\'s own status');
        return;
    }

    processedStatusIds.add(statusKey.id);

    // Limit memory usage
    if (processedStatusIds.size > 1500) {
        const arr = Array.from(processedStatusIds);
        processedStatusIds.clear();
        arr.slice(-750).forEach(id => processedStatusIds.add(id));
    }

    const promises = [];
    
    if (cfg.viewEnabled) {
        promises.push(autoView(sock, statusKey));
    }
    if (cfg.likeEnabled) {
        promises.push(autoLike(sock, statusKey));
    }
    if (cfg.forwardEnabled && fullMessage && botNumber) {
        promises.push(forwardStatusToBot(sock, statusKey, fullMessage, botNumber));
    }

    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }
}

async function autoStatusCommand(sock, chatId, msg, args = [], botNumber = null) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));
        if (!isAllowed) return;

        const sub = (args[0] || '').toLowerCase();
        const option = (args[1] || '').toLowerCase();

        // Command: .autostatus on
        if (sub === 'on') {
            await saveConfig({ 
                enabled: true, 
                viewEnabled: true, 
                likeEnabled: true,
                forwardEnabled: true
            });
            return sock.sendMessage(chatId, { 
                text: '✅ *Auto Status:* ENABLED (View + Like + Forward)\n\n📌 Auto-view, auto-like na auto-forward zimewashwa kwa status zote.\n📬 Status zitakuwa forwarded kwa bot number.' 
            });
        }

        // Command: .autostatus off
        if (sub === 'off') {
            await saveConfig({ 
                enabled: false, 
                viewEnabled: false, 
                likeEnabled: false,
                forwardEnabled: false
            });
            return sock.sendMessage(chatId, { 
                text: '❌ *Auto Status:* DISABLED\n\n📌 Auto-status imezimwa kabisa.' 
            });
        }

        // Command: .autostatus view on/off
        if (sub === 'view') {
            if (option === 'on' || option === 'off') {
                const viewEnabledValue = option === 'on';
                await saveConfig({ viewEnabled: viewEnabledValue });
                
                const newConfig = await loadConfig();
                const shouldEnable = newConfig.viewEnabled || newConfig.likeEnabled || newConfig.forwardEnabled;
                if (newConfig.enabled !== shouldEnable) {
                    await saveConfig({ enabled: shouldEnable });
                }
                
                const status = viewEnabledValue ? 'ON' : 'OFF';
                return sock.sendMessage(chatId, { 
                    text: `✅ *Auto View Status:* ${status}\n\n📌 Auto-view ya status sasa ime${viewEnabledValue ? 'washwa' : 'zimwa'}.` 
                });
            }
        }

        // Command: .autostatus like on/off
        if (sub === 'like') {
            if (option === 'on' || option === 'off') {
                const likeEnabledValue = option === 'on';
                await saveConfig({ likeEnabled: likeEnabledValue });
                
                const newConfig = await loadConfig();
                const shouldEnable = newConfig.viewEnabled || newConfig.likeEnabled || newConfig.forwardEnabled;
                if (newConfig.enabled !== shouldEnable) {
                    await saveConfig({ enabled: shouldEnable });
                }
                
                const status = likeEnabledValue ? 'ON' : 'OFF';
                return sock.sendMessage(chatId, { 
                    text: `✅ *Auto Like Status:* ${status}\n\n📌 Auto-like ya status sasa ime${likeEnabledValue ? 'washwa' : 'zimwa'}.` 
                });
            }
        }

        // Command: .autostatus forward on/off
        if (sub === 'forward') {
            if (option === 'on' || option === 'off') {
                const forwardEnabledValue = option === 'on';
                await saveConfig({ forwardEnabled: forwardEnabledValue });
                
                const newConfig = await loadConfig();
                const shouldEnable = newConfig.viewEnabled || newConfig.likeEnabled || newConfig.forwardEnabled;
                if (newConfig.enabled !== shouldEnable) {
                    await saveConfig({ enabled: shouldEnable });
                }
                
                const status = forwardEnabledValue ? 'ON' : 'OFF';
                let response = `✅ *Auto Forward Status:* ${status}\n\n📌 Auto-forward ya status sasa ime${forwardEnabledValue ? 'washwa' : 'zimwa'}.`;
                
                if (forwardEnabledValue) {
                    response += `\n📬 Status zitakuwa forwarded kwa:\n📱 ${botNumber || 'Bot number'}`;
                }
                
                return sock.sendMessage(chatId, { text: response });
            }
        }

        // Command: .autostatus setnumber [number]
        if (sub === 'setnumber' && option) {
            const newBotNumber = option.includes('@') ? option : `${option}@s.whatsapp.net`;
            await saveConfig({ forwardNumber: newBotNumber });
            return sock.sendMessage(chatId, { 
                text: `✅ *Forward number updated*\n\n📬 Status zitakuwa forwarded kwa:\n📱 ${newBotNumber}` 
            });
        }

        // Command: .autostatus (show settings)
        const cfg = await loadConfig();
        const overall = cfg.enabled ? '🟢 ACTIVE' : '🔴 INACTIVE';
        const view = cfg.viewEnabled ? '✅ ON' : '❌ OFF';
        const like = cfg.likeEnabled ? '✅ ON' : '❌ OFF';
        const forward = cfg.forwardEnabled ? '✅ ON' : '❌ OFF';
        
        let statusText = `📊 *AUTO STATUS SETTINGS*\n\n`;
        statusText += `┌─── 📋 STATUS\n`;
        statusText += `│  ${overall}\n`;
        statusText += `│\n`;
        statusText += `├─── 👁️ AUTO VIEW\n`;
        statusText += `│  ${view}\n`;
        statusText += `│\n`;
        statusText += `├─── ❤️ AUTO LIKE\n`;
        statusText += `│  ${like}\n`;
        statusText += `│\n`;
        statusText += `├─── 📬 AUTO FORWARD\n`;
        statusText += `│  ${forward}\n`;
        statusText += `│\n`;
        
        if (cfg.forwardEnabled) {
            const forwardNumber = cfg.forwardNumber || botNumber || 'Not set';
            statusText += `├─── 📱 FORWARD TO\n`;
            statusText += `│  ${forwardNumber}\n`;
            statusText += `│\n`;
        }
        
        statusText += `└─── 🛠️ COMMANDS\n`;
        statusText += `   • .autostatus on - Washa zote\n`;
        statusText += `   • .autostatus off - Zima zote\n`;
        statusText += `   • .autostatus view on/off - Auto-view\n`;
        statusText += `   • .autostatus like on/off - Auto-like\n`;
        statusText += `   • .autostatus forward on/off - Auto-forward\n`;
        statusText += `   • .autostatus setnumber 255XXXXXX - Set target number\n`;
        
        if (!cfg.viewEnabled && !cfg.likeEnabled && !cfg.forwardEnabled) {
            statusText += `\n\n⚠️ *Hakuna feature iliyowashwa.*\nTumia .autostatus on kuwasha zote au washa moja kwa moja.`;
        }

        return sock.sendMessage(chatId, { text: statusText });

    } catch (err) {
        console.error('[AutoStatus] Command error', err.message);
        return sock.sendMessage(chatId, { 
            text: `❌ *Error:* ${err.message}` 
        });
    }
}

module.exports = {
    autoStatusCommand,
    handleAutoStatus: handleStatusUpdate,
    autoLike,
    autoView,
    forwardStatusToBot
};