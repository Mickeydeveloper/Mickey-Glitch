const { sendButtons } = require('gifted-btns');
const updateCommand = require('./update');
const isOwnerOrSudo = require('../lib/isOwner');
const settings = require('../settings');
const fs = require('fs/promises');
const path = require('path');

const REMINDER_FILE = path.join(__dirname, '../data/updateReminder.json');
let reminderCache = null;

// --- Helper Functions ---
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

// Mpya: Inatuma file la ZIP kwa mtumiaji
async function sendUpdateZip(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { text: "⏳ Inatengeneza ZIP... (Generating ZIP...)" }, { quoted: message });
        
        // Hapa tunaita logic ya zip kutoka update module yako
        const zipBuffer = await updateCommand.getUpdateZip(); 
        
        await sock.sendMessage(chatId, {
            document: zipBuffer,
            mimetype: 'application/zip',
            fileName: `Mickey-Update-${Date.now()}.zip`,
            caption: "✅ Hili hapa file lako la update (Here is your update file)."
        }, { quoted: message });
    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ Kushindwa kutuma ZIP (ZIP Error): ${err.message}` });
    }
}

function generateUpdateHash(files, mode) {
    const fileList = Array.isArray(files) ? files : String(files).split('\n').filter(Boolean);
    const summary = `${mode}:${fileList.length}:${fileList.slice(0, 3).join(',')}`;
    return Buffer.from(summary).toString('base64');
}

function categorizeChanges(files) {
    const categories = { commands: [], core: [], lib: [], other: [] };
    files.forEach(f => {
        const fileName = f.trim();
        if (fileName.startsWith('.npm/') || fileName.includes('node_modules/') || fileName.includes('.cache')) return;
        if (fileName.startsWith('commands/')) categories.commands.push(fileName.replace('commands/', ''));
        else if (['index.js', 'main.js', 'package.json', 'server.js', 'settings.js', 'config.js'].includes(fileName)) categories.core.push(fileName);
        else if (fileName.startsWith('lib/')) categories.lib.push(fileName.replace('lib/', ''));
        else if (fileName.length < 100) categories.other.push(fileName);
    });
    return categories;
}

function formatUpdateInfo(res) {
    if (!res || res.mode === 'none' || !res.available) {
        return '✅ *System Up to Date* — Mfumo wako upo kwenye toleo jipya.';
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

    if (totalRelevant === 0) return '✅ *Minor Internal Changes.* Hakuna update muhimu.';

    let message = '🔄 *NEW UPDATE AVAILABLE*\n\n';
    message += `📦 *Type:* ${res.mode.toUpperCase()}\n━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📊 *Files:* (${totalRelevant})\n\n`;
    if (cat.core.length > 0) message += `⚙️ *Core:*\n└ ${cat.core.join(', ')}\n\n`;
    if (cat.commands.length > 0) message += `🛠️ *Cmds:*\n└ ${cat.commands.join(', ')}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━\n💡 Tumia button hapo chini (Use buttons below).`;
    return message;
}

// --- Main Command Logic ---
async function checkUpdatesCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
    if (!message.key.fromMe && !isOwner) return;

    // Angalia kama user amebonyeza button ya sendzip au ameandika .sendzip
    const body = (message.message?.conversation || message.message?.extendedTextMessage?.text || "").toLowerCase();
    if (body.includes('.sendzip')) {
        return await sendUpdateZip(sock, chatId, message);
    }

    try {
        const res = await updateCommand.checkUpdates();

        if (!res) {
            return await sock.sendMessage(chatId, { text: "⚠️ Server haijatoa jibu (Server error)." }, { quoted: message });
        }

        const updateMsg = formatUpdateInfo(res);

        if (res.available) {
            const reminder = await loadReminder();
            const hash = generateUpdateHash(res.files || '', res.mode);

            if (hash !== reminder.updateHash) {
                reminder.updateFound = true;
                reminder.updateHash = hash;
                await saveReminder();
            }

            await sendButtons(sock, chatId, {
                title: 'SYSTEM UPDATE CENTER',
                text: updateMsg,
                footer: 'Mickey Glitch Technology',
                buttons: [
                    { id: '.update', text: '🚀 Apply Now' },
                    { id: '.sendzip', text: '📦 Send ZIP' } // Button itatuma cmd ya .sendzip
                ]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: updateMsg }, { quoted: message });
        }
    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu (Error): ${err.message}` });
    }
}

module.exports = checkUpdatesCommand;
