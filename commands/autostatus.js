const fs = require('fs/promises');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const DEFAULT_CONFIG = Object.freeze({
    viewEnabled: true,
    likeEnabled: true,
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

// AUTO VIEW - Sasa ni HARAKA (Immediate)
async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;
    try {
        // Imeondolewa delay hapa
        await sock.readMessages([statusKey]);
    } catch (err) {
        console.error(`[AutoView] Failed:`, err.message);
    }
}

// AUTO LIKE - Sasa ni HARAKA (Immediate)
async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;

    const emoji = getRandomEmoji();
    const participantJid = statusKey.participant;

    try {
        // Imeondolewa delay hapa kwa ajili ya action ya papo hapo
        await sock.sendMessage('status@broadcast', {
            react: {
                text: emoji,
                key: statusKey
            }
        }, {
            statusJidList: [participantJid]
        });
    } catch (err) {
        console.error(`[AutoLike] Failed:`, err.message || err);
    }
}

async function handleStatusUpdate(sock, ev) {
    const cfg = await loadConfig();
    let statusKey = null;

    if (ev.messages?.[0]?.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.messages[0].key;
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
    }

    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;
    
    processedStatusIds.add(statusKey.id);

    // Limit memory
    if (processedStatusIds.size > 1500) {
        const arr = Array.from(processedStatusIds);
        processedStatusIds.clear();
        arr.slice(-750).forEach(id => processedStatusIds.add(id));
    }

    // Muhimu: Tunatumia Promise.all au kutoweka 'await' ili zifanye kazi kwa pamoja papo hapo
    const promises = [];
    if (cfg.viewEnabled) promises.push(autoView(sock, statusKey));
    if (cfg.likeEnabled) promises.push(autoLike(sock, statusKey));
    
    await Promise.allSettled(promises);
}

// ... (autoStatusCommand remains the same)

module.exports = {
    autoStatusCommand,
    handleStatusUpdate,
    autoLike,
    autoView
};
