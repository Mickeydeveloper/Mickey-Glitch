const updateCommand = require('./update');
const isOwnerOrSudo = require('../lib/isOwner');
const fs = require('fs/promises');
const path = require('path');

// Auto-reminder config
const REMINDER_FILE = path.join(__dirname, '../data/updateReminder.json');
let reminderCache = null;

async function loadReminder() {
    if (reminderCache) return reminderCache;
    try {
        const data = await fs.readFile(REMINDER_FILE, 'utf8');
        reminderCache = JSON.parse(data);
    } catch {
        reminderCache = { lastCheck: null, updateFound: false, updateHash: null };
        await saveReminder();
    }
    return reminderCache;
}

async function saveReminder() {
    try {
        await fs.mkdir(path.dirname(REMINDER_FILE), { recursive: true });
        await fs.writeFile(REMINDER_FILE, JSON.stringify(reminderCache, null, 2));
    } catch (err) {
        console.error('[UpdateReminder] Save failed:', err.message);
    }
}

// Calculate hash to detect if update is new
function generateUpdateHash(files, mode) {
    const summary = `${mode}:${files.length}:${files.slice(0, 3).join(',')}`;
    return Buffer.from(summary).toString('base64');
}

// Format file changes into readable info
function categorizeChanges(files) {
    const categories = {
        commands: [],
        core: [],
        lib: [],
        other: []
    };

    files.forEach(f => {
        if (f.startsWith('commands/')) categories.commands.push(f);
        else if (['index.js', 'main.js', 'server.js', 'config.js', 'settings.js'].includes(f)) categories.core.push(f);
        else if (f.startsWith('lib/')) categories.lib.push(f);
        else categories.other.push(f);
    });

    return categories;
}

// Create detailed update info message
function formatUpdateInfo(res) {
    let message = '🔄 *UPDATE CHECK RESULT*\n\n';
    
    if (!res || res.mode === 'none') {
        return '✅ *No updates available* — Your bot is up to date!';
    }

    const updateType = res.mode === 'git' ? 'GIT' : 'ZIP';
    message += `📦 *Update Type:* ${updateType}\n`;
    message += `📅 *Time:* ${new Date().toLocaleString()}\n\n`;

    if (res.mode === 'git') {
        const allFiles = res.files ? res.files.split('\n').map(f => f.trim()).filter(Boolean) : [];
        const total = allFiles.length;
        const categories = categorizeChanges(allFiles);

        if (res.available) {
            message += `🟢 *STATUS:* UPDATE AVAILABLE\n\n`;
            message += `📊 *Changes Summary:*\n`;
            message += `  • Total files: ${total}\n`;
            
            if (categories.commands.length > 0) {
                message += `  • Commands: ${categories.commands.length} ${categories.commands.length > 3 ? `(${categories.commands.slice(0, 2).join(', ')} +${categories.commands.length - 2})` : `(${categories.commands.join(', ')})`}\n`;
            }
            if (categories.core.length > 0) {
                message += `  • Core files: ${categories.core.length} (${categories.core.join(', ')})\n`;
            }
            if (categories.lib.length > 0) {
                message += `  • Libraries: ${categories.lib.length}\n`;
            }
            if (categories.other.length > 0) {
                message += `  • Other: ${categories.other.length}\n`;
            }
            message += `\n💡 *Use .update to install now*`;
            
            return message;
        } else {
            return `✅ *No updates available* — All files are up to date`;
        }
    }

    if (res.mode === 'zip') {
        if (res.available) {
            message += `🟢 *STATUS:* UPDATE AVAILABLE\n\n`;
            const meta = res.remoteMeta;
            message += `📁 *URL:* ${meta.url || 'Not available'}\n`;

            if (res.changes) {
                const { added = [], removed = [], modified = [] } = res.changes;
                const all = [...added, ...removed, ...modified].map(f => f.trim()).filter(Boolean);
                const total = all.length;
                const categories = categorizeChanges(all);

                message += `\n📊 *Changes Summary:*\n`;
                message += `  • Total files: ${total}\n`;
                message += `  • Added: ${added.length}\n`;
                message += `  • Modified: ${modified.length}\n`;
                message += `  • Removed: ${removed.length}\n`;

                if (categories.commands.length > 0) {
                    message += `  • Commands affected: ${categories.commands.length}\n`;
                }
                if (categories.core.length > 0) {
                    message += `  • Core changes: ${categories.core.length}\n`;
                }
            }
            message += `\n💡 *Use .update to install now*`;
            return message;
        } else {
            return `✅ *No updates available* — Your bot is up to date`;
        }
    }

    return message;
}

async function checkUpdatesCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { text: 'Only bot owner or sudo can use .checkupdates' }, { quoted: message });
        return;
    }

    const reminder = await loadReminder();
    const cmd = (args[0] || '').toLowerCase();

    // Check for update reminders if auto-enabled
    if (cmd === 'auto') {
        const enabled = reminder.autoReminder = !reminder.autoReminder;
        await saveReminder();
        await sock.sendMessage(chatId, {
            text: `✅ Auto update reminders ${enabled ? 'ENABLED' : 'DISABLED'} — I will notify you every time an update is available`
        }, { quoted: message });
        return;
    }

    // Show reminder status
    if (cmd === 'status') {
        const status = reminder.autoReminder ? '✅ ENABLED' : '❌ DISABLED';
        await sock.sendMessage(chatId, {
            text: `📢 *Update Reminder Status:* ${status}\n\n💡 Use .checkupdates auto to toggle`
        }, { quoted: message });
        return;
    }

    try {
        const res = await updateCommand.checkUpdates();
        const updateHash = res && res.files ? generateUpdateHash(res.files.split('\n'), res.mode) : null;
        
        // Format and send update info
        const updateMsg = formatUpdateInfo(res);
        await sock.sendMessage(chatId, { text: updateMsg }, { quoted: message });

        // Auto-reminder logic
        if (res && res.available) {
            // Only remind if it's a new update (different hash)
            if (updateHash !== reminder.updateHash) {
                reminder.updateFound = true;
                reminder.updateHash = updateHash;
                reminder.lastCheck = new Date().toISOString();
                await saveReminder();

                // Send quick reminder
                if (reminder.autoReminder) {
                    await sock.sendMessage(chatId, {
                        text: `🔔 *QUICK REMINDER*\n\nA new update is available! Type .update to install it now.`
                    });
                }
            }
        } else {
            reminder.updateFound = false;
            reminder.updateHash = null;
            await saveReminder();
        }

    } catch (err) {
        console.error('CheckUpdates failed:', err);
        await sock.sendMessage(chatId, {
            text: `❌ *Update Check Failed*\n\n${String(err.message || err).slice(0, 300)}`
        }, { quoted: message });
    }
}

module.exports = checkUpdatesCommand;
