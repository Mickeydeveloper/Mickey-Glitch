const updateCommand = require('./update');
const isOwnerOrSudo = require('../lib/isOwner');
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
        console.error('[UpdateReminder] Save failed:', err.message);
    }
}

function generateUpdateHash(files, mode) {
    const summary = `${mode}:${files.length}:${files.slice(0, 3).join(',')}`;
    return Buffer.from(summary).toString('base64');
}

// --- MABORESHO YA CATEGORIZATION ---
function categorizeChanges(files) {
    const categories = {
        commands: [],
        core: [], // index.js, main.js, package.json nk.
        lib: [],
        other: []
    };

    files.forEach(f => {
        const fileName = f.trim();
        if (fileName.startsWith('commands/')) {
            categories.commands.push(fileName.replace('commands/', ''));
        } else if (['index.js', 'main.js', 'package.json', 'server.js', 'settings.js', 'config.js'].includes(fileName)) {
            categories.core.push(fileName);
        } else if (fileName.startsWith('lib/')) {
            categories.lib.push(fileName.replace('lib/', ''));
        } else {
            categories.other.push(fileName);
        }
    });

    return categories;
}

// --- MABORESHO YA FORMATTING ---
function formatUpdateInfo(res) {
    if (!res || res.mode === 'none' || !res.available) {
        return '✅ *Mfumo upo vizuri* — Bot yako haina update mpya kwa sasa.';
    }

    let message = '🔄 *TAARIFA ZA UPDATE MPYA*\n\n';
    const timeStr = new Date().toLocaleString('en-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
    message += `📅 *Muda:* ${timeStr}\n`;
    message += `📦 *Aina:* ${res.mode.toUpperCase()}\n━━━━━━━━━━━━━━━━━━\n\n`;

    let allFiles = [];
    if (res.mode === 'git') {
        const lines = res.files.split('\n').filter(Boolean);
        allFiles = lines.map(l => {
            const m = l.match(/^[A-Z\s]+\t?(.+)$/i);
            return m ? m[1].trim() : l.split(/\s+/).pop();
        });
    } else if (res.mode === 'zip' && res.changes) {
        allFiles = [...(res.changes.added || []), ...(res.changes.modified || []), ...(res.changes.removed || [])];
    }

    const cat = categorizeChanges(allFiles);

    message += `📊 *Mafaili Yaliyobadilika:* (${allFiles.length})\n\n`;

    if (cat.core.length > 0) {
        message += `⚙️ *Core Files (Muhimu):*\n└ ${cat.core.join(', ')}\n\n`;
    }
    if (cat.commands.length > 0) {
        message += `🛠️ *Commands Zilizoongezwa/Badilishwa:*\n└ ${cat.commands.join(', ')}\n\n`;
    }
    if (cat.lib.length > 0) {
        message += `📚 *Library Updates:*\n└ ${cat.lib.join(', ')}\n\n`;
    }
    if (cat.other.length > 0) {
        message += `📁 *Mengineyo:*\n└ ${cat.other.slice(0, 5).join(', ')}${cat.other.length > 5 ? '...' : ''}\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━\n💡 *Tumia .update sasa hivi kuweka mabadiliko haya.*`;
    return message;
}

async function checkUpdatesCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) return;

    try {
        const res = await updateCommand.checkUpdates();
        const updateMsg = formatUpdateInfo(res);
        
        await sock.sendMessage(chatId, { text: updateMsg }, { quoted: message });

        const reminder = await loadReminder();
        if (res && res.available) {
            const hash = generateUpdateHash(res.files || '', res.mode);
            if (hash !== reminder.updateHash) {
                reminder.updateFound = true;
                reminder.updateHash = hash;
                await saveReminder();
            }
        }
    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Kosa limetokea: ${err.message}` });
    }
}

module.exports = checkUpdatesCommand;
