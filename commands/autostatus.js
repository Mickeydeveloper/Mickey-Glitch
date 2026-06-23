const fs = require('fs/promises');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const DEFAULT_CONFIG = Object.freeze({
    enabled: false,
    viewEnabled: false,
    likeEnabled: false,
    forwardEnabled: false,
    forwardNumber: ''
});

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '😱', '👍', '🎉', '😍', '💯', '🙏', '😢', '🤔', '😁'];

let configCache = null;
const processedStatusIds = new Set();

async function loadConfig() {
    if (configCache) return configCache;
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
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
    if (!mimetype) return '📝 TEXT';
    if (mimetype.startsWith('image/')) return '🖼️ IMAGE';
    if (mimetype.startsWith('video/')) return '🎥 VIDEO';
    if (mimetype.startsWith('audio/')) return '🎵 AUDIO';
    return '📄 DOC';
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;
    try {
        await sock.readMessages([statusKey]);
    } catch (err) {
        console.error(`[AutoView] Failed:`, err.message);
    }
}

async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;
    const emoji = getRandomEmoji();
    try {
        await sock.sendMessage('status@broadcast', {
            react: { text: emoji, key: statusKey }
        }, { statusJidList: [statusKey.participant] });
    } catch (err) {
        console.error(`[AutoLike] Failed:`, err.message);
    }
}

async function forwardStatusToBot(sock, statusKey, fullMessage, botNumber) {
    if (!statusKey?.id) return null;
    
    try {
        const cfg = await loadConfig();
        const targetNumber = botNumber || cfg.forwardNumber;
        if (!targetNumber) return null;

        const senderJid = statusKey.participant;
        const senderName = senderJid.split('@')[0];
        const message = fullMessage.message;
        if (!message) return null;

        // Extract metadata
        let mimetype = null;
        let caption = '';
        if (message.imageMessage) { mimetype = message.imageMessage.mimetype; caption = message.imageMessage.caption; }
        else if (message.videoMessage) { mimetype = message.videoMessage.mimetype; caption = message.videoMessage.caption; }
        else if (message.audioMessage) { mimetype = message.audioMessage.mimetype; }
        else if (message.documentMessage) { mimetype = message.documentMessage.mimetype; caption = message.documentMessage.caption; }
        else if (message.conversation) { caption = message.conversation; }

        const statusType = getStatusType(mimetype);
        const shortId = statusKey.id.slice(-6);

        const headerText = `✨ *STATUS UPDATE*\n👤 @${senderName}\n📁 ${statusType} (${shortId})\n💬 ${caption || 'No caption'}\n───`;

        // Method 1: Try Native Forward (Fastest & saves data)
        if (sock.copyNForward && (message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage)) {
            try {
                await sock.sendMessage(targetNumber, { text: headerText, mentions: [senderJid] });
                await sock.copyNForward(targetNumber, fullMessage, false);
                return true;
            } catch (fwdErr) {
                console.log('[AutoForward] Native forward failed, falling back to download...');
            }
        }

        // Method 2: Fallback to manual download if native forward fails or it's text
        if (message.conversation) {
            await sock.sendMessage(targetNumber, { text: headerText, mentions: [senderJid] });
            return true;
        }

        const mediaBuffer = await sock.downloadMediaMessage(fullMessage);
        if (!mediaBuffer) return null;

        const mediaSize = formatFileSize(mediaBuffer.length);
        const forwardCaption = `${headerText}\n📊 Size: ${mediaSize}`;

        const msgOptions = { caption: forwardCaption, mentions: [senderJid] };
        if (message.imageMessage) msgOptions.image = mediaBuffer;
        else if (message.videoMessage) msgOptions.video = mediaBuffer;
        else if (message.audioMessage) { msgOptions.audio = mediaBuffer; msgOptions.mimetype = mimetype; delete msgOptions.caption; }
        else if (message.documentMessage) { 
            msgOptions.document = mediaBuffer; 
            msgOptions.mimetype = mimetype; 
            msgOptions.fileName = `status_${senderName}.${mimetype.split('/')[1]}`; 
        }

        await sock.sendMessage(targetNumber, msgOptions);
        if (message.audioMessage) {
            await sock.sendMessage(targetNumber, { text: `👆 Audio from @${senderName}`, mentions: [senderJid] });
        }
        return true;

    } catch (err) {
        console.error('[AutoForward] Failed:', err.message);
        return null;
    }
}

async function handleStatusUpdate(sock, ev, botNumber) {
    const cfg = await loadConfig();
    const shouldBeEnabled = cfg.viewEnabled || cfg.likeEnabled || cfg.forwardEnabled;
    
    if (cfg.enabled !== shouldBeEnabled) {
        await saveConfig({ enabled: shouldBeEnabled });
        cfg.enabled = shouldBeEnabled;
    }

    if (!cfg.enabled) return;

    let statusKey = ev.messages?.[0]?.key?.remoteJid === 'status@broadcast' ? ev.messages[0].key : 
                    (ev.key?.remoteJid === 'status@broadcast' ? ev.key : null);
    
    let fullMessage = ev.messages?.[0]?.key?.remoteJid === 'status@broadcast' ? ev.messages[0] : 
                      (ev.key?.remoteJid === 'status@broadcast' ? ev : null);

    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;
    if (statusKey.participant === sock.user.id) return;

    processedStatusIds.add(statusKey.id);

    if (processedStatusIds.size > 1000) {
        const arr = Array.from(processedStatusIds);
        processedStatusIds.clear();
        arr.slice(-500).forEach(id => processedStatusIds.add(id));
    }

    const promises = [];
    if (cfg.viewEnabled) promises.push(autoView(sock, statusKey));
    if (cfg.likeEnabled) promises.push(autoLike(sock, statusKey));
    if (cfg.forwardEnabled && fullMessage) promises.push(forwardStatusToBot(sock, statusKey, fullMessage, botNumber));

    if (promises.length > 0) await Promise.allSettled(promises);
}

async function autoStatusCommand(sock, chatId, msg, args = [], botNumber = null) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));
        if (!isAllowed) return;

        const sub = (args[0] || '').toLowerCase();
        const option = (args[1] || '').toLowerCase();

        if (sub === 'on') {
            await saveConfig({ enabled: true, viewEnabled: true, likeEnabled: true, forwardEnabled: true });
            return sock.sendMessage(chatId, { text: '✅ *Auto Status:* ON (All features active)' });
        }

        if (sub === 'off') {
            await saveConfig({ enabled: false, viewEnabled: false, likeEnabled: false, forwardEnabled: false });
            return sock.sendMessage(chatId, { text: '❌ *Auto Status:* OFF' });
        }

        if (['view', 'like', 'forward'].includes(sub)) {
            if (option === 'on' || option === 'off') {
                const state = option === 'on';
                const updates = {};
                updates[`${sub}Enabled`] = state;
                await saveConfig(updates);

                const nCfg = await loadConfig();
                const shouldEnable = nCfg.viewEnabled || nCfg.likeEnabled || nCfg.forwardEnabled;
                if (nCfg.enabled !== shouldEnable) await saveConfig({ enabled: shouldEnable });

                return sock.sendMessage(chatId, { text: `✨ *Auto ${sub.toUpperCase()}:* ${state ? 'ON' : 'OFF'}` });
            }
        }

        if (sub === 'setnumber' && option) {
            const newBotNumber = option.includes('@') ? option : `${option}@s.whatsapp.net`;
            await saveConfig({ forwardNumber: newBotNumber });
            return sock.sendMessage(chatId, { text: `✅ *Forward Number Set:* ${option}` });
        }

        // Show simplified status text
        const cfg = await loadConfig();
        const target = cfg.forwardNumber || botNumber || 'Not Set';
        
        let statusText = `📊 *AUTO STATUS*\n`;
        statusText += `• Status: ${cfg.enabled ? '🟢 ON' : '🔴 OFF'}\n`;
        statusText += `• View: ${cfg.viewEnabled ? '✅' : '❌'}\n`;
        statusText += `• Like: ${cfg.likeEnabled ? '✅' : '❌'}\n`;
        statusText += `• Forward: ${cfg.forwardEnabled ? '✅' : '❌'}\n`;
        statusText += `• Target: ${target.split('@')[0]}\n\n`;
        statusText += `💡 *Commands:*\n`;
        statusText += `⚡ _.autostatus on | off_\n`;
        statusText += `⚙️ _.autostatus [view/like/forward] on/off_\n`;
        statusText += `📱 _.autostatus setnumber [number]_`;

        return sock.sendMessage(chatId, { text: statusText });

    } catch (err) {
        console.error('[AutoStatus] Command error', err.message);
        return sock.sendMessage(chatId, { text: `❌ *Error:* ${err.message}` });
    }
}

module.exports = {
    autoStatusCommand,
    handleAutoStatus: handleStatusUpdate,
    autoLike,
    autoView,
    forwardStatusToBot
};
