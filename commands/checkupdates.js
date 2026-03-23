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
    } catch (err) { console.error('[UpdateReminder] Error:', err.message); }
}

function generateUpdateHash(files, mode) {
    // Hakikisha files ni array kabla ya kutumia slice
    const fileList = Array.isArray(files) ? files : String(files).split('\n').filter(Boolean);
    const summary = `${mode}:${fileList.length}:${fileList.slice(0, 3).join(',')}`;
    return Buffer.from(summary).toString('base64');
}

// --- MABORESHO: CHUJA MAFAILI YASIYO NA LAZIMA ---
function categorizeChanges(files) {
    const categories = {
        commands: [],
        core: [],
        lib: [],
        other: []
    };

    files.forEach(f => {
        const fileName = f.trim();
        
        // 1. PUUZA (IGNORE) NPM NA NODE_MODULES
        if (fileName.startsWith('.npm/') || fileName.includes('node_modules/') || fileName.includes('.cache')) {
            return; 
        }

        if (fileName.startsWith('commands/')) {
            categories.commands.push(fileName.replace('commands/', ''));
        } else if (['index.js', 'main.js', 'package.json', 'server.js', 'settings.js', 'config.js'].includes(fileName)) {
            categories.core.push(fileName);
        } else if (fileName.startsWith('lib/')) {
            categories.lib.push(fileName.replace('lib/', ''));
        } else {
            // Usiongeze mafaili marefu sana ya cache hapa pia
            if (fileName.length < 100) categories.other.push(fileName);
        }
    });

    return categories;
}

function formatUpdateInfo(res) {
    if (!res || res.mode === 'none' || !res.available) {
        return '✅ *Mfumo upo vizuri* — Bot yako haina update mpya kwa sasa.';
    }

    // Pata list ya mafaili
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
        return '✅ *Mabadiliko yaliyopo ni ya mfumo wa ndani (cache) tu.* Hakuna haja ya ku-update.';
    }

    let message = '🔄 *TAARIFA ZA UPDATE MPYA*\n\n';
    message += `📦 *Aina:* ${res.mode.toUpperCase()}\n━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📊 *Mafaili Muhimu:* (${totalRelevant})\n\n`;

    if (cat.core.length > 0) {
        message += `⚙️ *Core Files:*\n└ ${cat.core.join(', ')}\n\n`;
    }
    if (cat.commands.length > 0) {
        message += `🛠️ *Commands:*\n└ ${cat.commands.join(', ')}\n\n`;
    }
    if (cat.lib.length > 0) {
        message += `📚 *Library:*\n└ ${cat.lib.join(', ')}\n\n`;
    }
    if (cat.other.length > 0) {
        message += `📁 *Mengineyo:*\n└ ${cat.other.join(', ')}\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━\n💡 *Tumia .update kuweka mabadiliko haya.*`;
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

        if (res && res.available) {
            const reminder = await loadReminder();
            const hash = generateUpdateHash(res.files || '', res.mode);
            if (hash !== reminder.updateHash) {
                reminder.updateFound = true;
                reminder.updateHash = hash;
                await saveReminder();
            }
        }
    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Kosa limetokea wakati wa kukagua updates.` });
    }
}

module.exports = checkUpdatesCommand;
