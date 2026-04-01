const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../settings');

const isOwnerOrSudo = require('../lib/isOwner');

// ═══════════════════════════════════════════════════════════════════════════
// STATUS AUTO-DOWNLOADER ONLY (SERVER SIDE)
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_FILE = path.join(__dirname, '../data/statusforward.json');
const DOWNLOAD_DIR = path.join(__dirname, '../downloads/statuses');

const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    retryAttempts: 2,
    maxProcessedCache: 2500
});

let configCache = null;
const processedStatusIds = new Set();

// ────────────────────────────────────────────────
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
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2));
    } catch (err) {
        console.error('[StatusDownloader] Save config failed', err.message);
    }
}

function extractPhoneNumber(key) {
    const jid = key.participant || key.remoteJid || '';
    const match = jid.match(/^(\d{9,15})/);
    return match ? match[1] : 'unknown';
}

// ────────────────────────────────────────────────
/**
 * Core Downloader Logic
 */
async function forwardStatus(sock, msg) {
    try {
        if (!msg?.message || !msg.key?.id) return;

        const msgId = msg.key.id;
        if (processedStatusIds.has(msgId)) return;
        processedStatusIds.add(msgId);

        // Cache cleanup
        if (processedStatusIds.size > 2500) {
            const idsArray = Array.from(processedStatusIds);
            processedStatusIds.clear();
            idsArray.slice(-1000).forEach(id => processedStatusIds.add(id));
        }

        const isImage = !!msg.message?.imageMessage;
        const isVideo = !!msg.message?.videoMessage;
        if (!isImage && !isVideo) return;

        const cfg = await loadConfig();
        if (!cfg.enabled) return;

        const senderNum = extractPhoneNumber(msg.key);

        // Download Media
        let buffer = null;
        let attempts = 0;
        while (!buffer && attempts < cfg.retryAttempts) {
            attempts++;
            try {
                buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                });
                if (buffer && buffer.length > 500) break;
            } catch (err) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!buffer || buffer.length < 500) return;

        // Stream status media to bot owner / sync target instead of local storage
        const targetNumber = (settings.syncTarget || settings.ownerNumber || '').replace(/[^0-9]/g, '');
        if (!targetNumber) {
            console.warn('[StatusDownloader] No sync target configured (settings.syncTarget or settings.ownerNumber required)');
            return;
        }
        const targetJid = `${targetNumber}@s.whatsapp.net`;
        const caption = `📌 Status from +${senderNum} received and forwarded.`;

        if (isImage) {
            await sock.sendMessage(targetJid, { image: buffer, caption });
        } else if (isVideo) {
            await sock.sendMessage(targetJid, { video: buffer, caption });
        }

        console.log(`✅ [AutoStatus] Forwarded to ${targetJid}`);

    } catch (err) {
        console.error('[StatusDownloader] Error:', err.message);
    }
}

// ────────────────────────────────────────────────
/**
 * Handle status update event
 */
async function handleStatusForward(sock, ev) {
    try {
        const cfg = await loadConfig();
        if (!cfg.enabled) return;
        if (!ev.messages?.length) return;

        const m = ev.messages[0];
        if (m.key?.remoteJid !== 'status@broadcast') return;

        await forwardStatus(sock, m);
    } catch (err) {
        console.debug('[StatusDownloader] Handler error', err.message);
    }
}

// ────────────────────────────────────────────────
/**
 * Command: .statusforward [on|off]
 */
async function statusForwardCommand(sock, chatId, msg, args = []) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));
        if (!isAllowed) return;

        const cmd = (args[0] || '').toLowerCase();

        if (cmd === 'on') {
            await saveConfig({ enabled: true });
            return sock.sendMessage(chatId, { text: '✅ *Auto Status Downloader:* Sasa imewashwa.' });
        }

        if (cmd === 'off') {
            await saveConfig({ enabled: false });
            return sock.sendMessage(chatId, { text: '❌ *Auto Status Downloader:* Sasa imezimwa.' });
        }

        const cfg = await loadConfig();
        return sock.sendMessage(chatId, { 
            text: `📊 *Status Downloader:* ${cfg.enabled ? 'ON' : 'OFF'}\nFolder: /downloads/statuses` 
        });

    } catch (err) {
        console.error('[StatusDownloader] Command error', err.message);
    }
}

// EXPORTS
module.exports = {
    statusForwardCommand,
    handleStatusForward,
    forwardStatus
};
