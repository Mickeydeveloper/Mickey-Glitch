const fs = require('fs/promises');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const DEFAULT_CONFIG = Object.freeze({
    enabled: false,
    viewEnabled: false,
    likeEnabled: false,
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

async function handleStatusUpdate(sock, ev) {
    const cfg = await loadConfig();
    
    // Update enabled flag based on features
    const shouldBeEnabled = cfg.viewEnabled || cfg.likeEnabled;
    if (cfg.enabled !== shouldBeEnabled) {
        await saveConfig({ enabled: shouldBeEnabled });
        cfg.enabled = shouldBeEnabled;
    }
    
    if (!cfg.enabled) return;

    let statusKey = null;

    if (ev.messages?.[0]?.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.messages[0].key;
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
    }

    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;

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

    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }
}

async function autoStatusCommand(sock, chatId, msg, args = []) {
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
                likeEnabled: true 
            });
            return sock.sendMessage(chatId, { 
                text: '✅ *Auto Status:* ENABLED (View + Like)\n\n📌 Auto-view na auto-like zimewashwa kwa status zote.' 
            });
        }

        // Command: .autostatus off
        if (sub === 'off') {
            await saveConfig({ 
                enabled: false, 
                viewEnabled: false, 
                likeEnabled: false 
            });
            return sock.sendMessage(chatId, { 
                text: '❌ *Auto Status:* DISABLED\n\n📌 Auto-status imezimwa kabisa.' 
            });
        }

        // Command: .autostatus view on/off
        if (sub === 'view') {
            if (option === 'on' || option === 'off') {
                const viewEnabledValue = option === 'on';
                const currentCfg = await loadConfig();
                
                // Update viewEnabled
                await saveConfig({ viewEnabled: viewEnabledValue });
                
                // Update enabled based on either view or like being active
                const newConfig = await loadConfig();
                const shouldEnable = newConfig.viewEnabled || newConfig.likeEnabled;
                if (newConfig.enabled !== shouldEnable) {
                    await saveConfig({ enabled: shouldEnable });
                }
                
                const status = viewEnabledValue ? 'ON' : 'OFF';
                return sock.sendMessage(chatId, { 
                    text: `✅ *Auto View Status:* ${status}\n\n📌 Auto-view ya status sasa ime${viewEnabledValue ? 'washwa' : 'zimwa'}.\n${!viewEnabledValue && !newConfig.likeEnabled ? '\n⚠️ Auto-status imezimwa kabisa kwa sababu hakuna feature iliyowashwa.' : ''}` 
                });
            }
        }

        // Command: .autostatus like on/off
        if (sub === 'like') {
            if (option === 'on' || option === 'off') {
                const likeEnabledValue = option === 'on';
                const currentCfg = await loadConfig();
                
                // Update likeEnabled
                await saveConfig({ likeEnabled: likeEnabledValue });
                
                // Update enabled based on either view or like being active
                const newConfig = await loadConfig();
                const shouldEnable = newConfig.viewEnabled || newConfig.likeEnabled;
                if (newConfig.enabled !== shouldEnable) {
                    await saveConfig({ enabled: shouldEnable });
                }
                
                const status = likeEnabledValue ? 'ON' : 'OFF';
                return sock.sendMessage(chatId, { 
                    text: `✅ *Auto Like Status:* ${status}\n\n📌 Auto-like ya status sasa ime${likeEnabledValue ? 'washwa' : 'zimwa'}.\n${!likeEnabledValue && !newConfig.viewEnabled ? '\n⚠️ Auto-status imezimwa kabisa kwa sababu hakuna feature iliyowashwa.' : ''}` 
                });
            }
        }

        // Command: .autostatus (show settings)
        const cfg = await loadConfig();
        const overall = cfg.enabled ? '🟢 ACTIVE' : '🔴 INACTIVE';
        const view = cfg.viewEnabled ? '✅ ON' : '❌ OFF';
        const like = cfg.likeEnabled ? '✅ ON' : '❌ OFF';
        
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
        statusText += `└─── 🛠️ COMMANDS\n`;
        statusText += `   • .autostatus on - Washa zote\n`;
        statusText += `   • .autostatus off - Zima zote\n`;
        statusText += `   • .autostatus view on/off - Washa/zima auto-view\n`;
        statusText += `   • .autostatus like on/off - Washa/zima auto-like\n`;
        
        if (!cfg.viewEnabled && !cfg.likeEnabled) {
            statusText += `\n⚠️ *Hakuna feature iliyowashwa.*\nTumia .autostatus on kuwasha zote au washa moja kwa moja.`;
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
    autoView
};