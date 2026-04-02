const { sendButtons } = require('gifted-btns');
const updateCommand = require('./update');
const isOwnerOrSudo = require('../lib/isOwner');
const settings = require('../settings');
const fs = require('fs/promises');
const path = require('path');

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
        console.error('[UpdateReminder] Error:', err.message); 
    }
}

function generateUpdateHash(files, mode) {
    const fileList = Array.isArray(files) ? files : String(files).split('\n').filter(Boolean);
    const summary = `${mode}:${fileList.length}:${fileList.slice(0, 3).join(',')}`;
    return Buffer.from(summary).toString('base64');
}

/**
 * Filters and categorizes system changes
 */
function categorizeChanges(files) {
    const categories = { commands: [], core: [], lib: [], other: [] };

    files.forEach(f => {
        const fileName = f.trim();
        // Ignore node_modules and cache files
        if (fileName.startsWith('.npm/') || fileName.includes('node_modules/') || fileName.includes('.cache')) return;

        if (fileName.startsWith('commands/')) {
            categories.commands.push(fileName.replace('commands/', ''));
        } else if (['index.js', 'main.js', 'package.json', 'server.js', 'settings.js', 'config.js'].includes(fileName)) {
            categories.core.push(fileName);
        } else if (fileName.startsWith('lib/')) {
            categories.lib.push(fileName.replace('lib/', ''));
        } else {
            if (fileName.length < 100) categories.other.push(fileName);
        }
    });

    return categories;
}

/**
 * Generates English Status Message
 */
function formatUpdateInfo(res) {
    if (!res || res.mode === 'none' || !res.available) {
        return '✅ *System Up to Date* — Your bot is currently running the latest version.';
    }

    let allFilesRaw = [];
    if (res.mode === 'git' && res.files) {
        allFilesRaw = res.files.split('\n').filter(Boolean).map(l => {
            const m = l.match(/^[A-Z\s]+\t?(.+)$/i);
            return m ? m[1].trim() : l.split(/\s+/).pop();
        });
    } else if (res.mode === 'zip' && res.changes) {
        allFilesRaw = [...(res.changes.added || []), ...(res.changes.modified || []), ...(res.changes.removed || [])];
    }

    const cat = categorizeChanges(allFilesRaw);
    const totalRelevant = cat.commands.length + cat.core.length + cat.lib.length + cat.other.length;

    if (totalRelevant === 0) {
        return '✅ *Minor Internal Changes Detected.* No critical update required.';
    }

    let message = '🔄 *NEW UPDATE AVAILABLE*\n\n';
    message += `📦 *Type:* ${res.mode.toUpperCase()}\n━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📊 *Relevant Files:* (${totalRelevant})\n\n`;

    if (cat.core.length > 0) message += `⚙️ *Core:*\n└ ${cat.core.join(', ')}\n\n`;
    if (cat.commands.length > 0) message += `🛠️ *Commands:*\n└ ${cat.commands.join(', ')}\n\n`;
    if (cat.lib.length > 0) message += `📚 *Library:*\n└ ${cat.lib.join(', ')}\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━\n💡 *Use the buttons below to manage the update.*`;
    return message;
}

/**
 * Main Check Updates Command
 */
async function checkUpdatesCommand(sock, chatId, message) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
    if (!message.key.fromMe && !isOwner) return;

    try {
        const res = await updateCommand.checkUpdates();
        const updateMsg = formatUpdateInfo(res);

        if (res && res.available) {
            const reminder = await loadReminder();
            const hash = generateUpdateHash(res.files || '', res.mode);
            
            if (hash !== reminder.updateHash) {
                reminder.updateFound = true;
                reminder.updateHash = hash;
                await saveReminder();
            }

            // Interactive Buttons
            await sendButtons(sock, chatId, {
                title: 'SYSTEM UPDATE CENTER',
                text: updateMsg,
                footer: 'Mickey Glitch Technology',
                buttons: [
                    { id: '.update', text: '🚀 Apply Now' },
                    { id: '.sendzip', text: '📦 Send ZIP' },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 Open Repository",
                            url: "https://github.com/Mickeydeveloper/Mickey-Glitch",
                        })
                    }
                ]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: updateMsg }, { quoted: message });
        }
    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error occurred while checking for updates.` });
    }
}

/**
 * Download ZIP Logic
 */
async function downloadZipCommand(sock, chatId, message) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
    if (!message.key.fromMe && !isOwner) return;

    const zipUrl = (process.env.UPDATE_ZIP_URL || settings.updateZipUrl || '').trim();
    if (!zipUrl) {
        return sock.sendMessage(chatId, { text: '❌ No Update URL found in settings.' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { text: '⏳ Fetching update package... please wait.' }, { quoted: message });
        await sock.sendMessage(chatId, {
            document: { url: zipUrl },
            fileName: `update-package-${Date.now()}.zip`,
            mimetype: 'application/zip'
        }, { quoted: message });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ Failed to send ZIP: ${err.message}` }, { quoted: message });
    }
}

module.exports = {
    checkUpdatesCommand,
    downloadZipCommand
};
