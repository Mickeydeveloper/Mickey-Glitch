const isOwnerOrSudo = require('../lib/isOwner');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { Button } = require('../lib/messageBuilder');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════
const REPO_OWNER = 'Mickeydeveloper';
const REPO_NAME = 'Mickey-Glitch';
const BRANCH = 'main';
const USER_AGENT = 'MickeyBot-UpdateChecker';

// Files/folders that should NEVER be compared or updated
const IGNORED_NAMES = new Set([
    '.git',
    'node_modules',
    'session',
    'auth_info_baileys',
    'temp_update',
    'data',
    'settings.js',
    'config.js',
    '.env',
    '.env.local',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'storage',
    'logs',
    '.cache',
    '.vscode',
    'backups',
    'tmp',
    'temp',
]);

// Core repo files that matter (everything else is considered "other")
const CORE_FILES = new Set([
    'index.js', 'main.js', 'server.js', 'app.js',
    'config.js', 'settings.js', 'package.json',
]);

// ═══════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════
const DATA_DIR = path.join(__dirname, '../data');
const REMINDER_FILE = path.join(DATA_DIR, 'updateReminder.json');
const VERSION_FILE = path.join(DATA_DIR, 'currentVersion.json');

let reminderCache = null;
let versionCache = null;

async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
}

async function loadReminder() {
    if (reminderCache) return reminderCache;
    await ensureDataDir();
    try {
        const data = await fs.readFile(REMINDER_FILE, 'utf8');
        reminderCache = JSON.parse(data);
    } catch {
        reminderCache = {
            lastCheck: null,
            updateFound: false,
            updateHash: null,
            autoReminder: false,
            latestSha: null,
        };
        await saveReminder();
    }
    return reminderCache;
}

async function saveReminder() {
    try {
        await ensureDataDir();
        await fs.writeFile(REMINDER_FILE, JSON.stringify(reminderCache, null, 2));
    } catch (err) {
        console.error('[UpdateReminder] Save failed:', err.message);
    }
}

async function loadVersion() {
    if (versionCache) return versionCache;
    await ensureDataDir();
    try {
        const data = await fs.readFile(VERSION_FILE, 'utf8');
        versionCache = JSON.parse(data);
    } catch {
        versionCache = { sha: null, updatedAt: null };
    }
    return versionCache;
}

async function saveCurrentVersion(sha) {
    try {
        await ensureDataDir();
        versionCache = { sha, updatedAt: new Date().toISOString() };
        await fs.writeFile(VERSION_FILE, JSON.stringify(versionCache, null, 2));
    } catch (err) {
        console.error('[UpdateVersion] Save failed:', err.message);
    }
}

// ═══════════════════════════════════════════════════════════
// PATH FILTERING
// ═══════════════════════════════════════════════════════════
function isIgnoredPath(filePath) {
    if (!filePath) return true;
    const parts = filePath.split('/').filter(Boolean);
    return parts.some(part => IGNORED_NAMES.has(part));
}

// ═══════════════════════════════════════════════════════════
// FILE COLLECTION & HASHING
// ═══════════════════════════════════════════════════════════
async function collectLocalFiles(rootDir, currentDir = rootDir, files = new Map()) {
    let entries;
    try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
        return files;
    }

    for (const entry of entries) {
        if (IGNORED_NAMES.has(entry.name)) continue;

        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');

        if (isIgnoredPath(relativePath)) continue;

        if (entry.isDirectory()) {
            await collectLocalFiles(rootDir, fullPath, files);
        } else if (entry.isFile()) {
            files.set(relativePath, fullPath);
        }
    }

    return files;
}

function gitBlobSha(buffer) {
    const header = Buffer.from(`blob ${buffer.length}\0`);
    return crypto.createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex');
}

async function getLocalFileSha(fullPath) {
    try {
        const buffer = await fs.readFile(fullPath);
        return gitBlobSha(buffer);
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// GITHUB API HELPERS
// ═══════════════════════════════════════════════════════════
async function fetchLatestCommit() {
    const res = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits`,
        {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' },
            params: { per_page: 1, sha: BRANCH },
            timeout: 15000,
        }
    );
    return res.data?.[0] || null;
}

async function fetchRemoteTree(sha) {
    const res = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${sha}?recursive=1`,
        {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' },
            timeout: 20000,
        }
    );
    const map = new Map();
    for (const item of res.data.tree || []) {
        if (item.type !== 'blob') continue;
        if (isIgnoredPath(item.path)) continue;
        map.set(item.path, item.sha);
    }
    return map;
}

async function fetchCommitDiff(baseSha, headSha) {
    try {
        const res = await axios.get(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/compare/${baseSha}...${headSha}`,
            {
                headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' },
                timeout: 20000,
            }
        );
        const files = (res.data.files || [])
            .filter(f => !isIgnoredPath(f.filename))
            .map(f => ({ file: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }));
        return files;
    } catch {
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// CHANGE DETECTION
// ═══════════════════════════════════════════════════════════
/**
 * Compare local working tree against remote GitHub tree.
 * Only tracks files that belong to the repo — ignores install/build files.
 */
async function getLocalChanges(latestSha) {
    const remoteFiles = await fetchRemoteTree(latestSha);
    const localFiles = await collectLocalFiles(process.cwd());

    const changed = [];

    // Check local files against remote
    for (const [file, fullPath] of localFiles) {
        if (!remoteFiles.has(file)) {
            changed.push({ file, status: 'removed from GitHub' });
            continue;
        }
        const localSha = await getLocalFileSha(fullPath);
        if (localSha && localSha !== remoteFiles.get(file)) {
            changed.push({ file, status: 'modified' });
        }
    }

    // Check remote files missing locally
    for (const file of remoteFiles.keys()) {
        if (!localFiles.has(file)) {
            changed.push({ file, status: 'added' });
        }
    }

    return changed.sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * Detect changes based on commit history (last installed SHA vs latest SHA).
 * This is what `.update` actually installs — so this is the "real" update list.
 */
async function getCommitChanges(currentSha, latestSha) {
    if (!currentSha || currentSha === latestSha) return [];
    return fetchCommitDiff(currentSha, latestSha);
}

// ═══════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════
function categorizeChanges(files) {
    const categories = { commands: [], core: [], lib: [], other: [] };
    for (const f of files) {
        if (f.startsWith('commands/')) categories.commands.push(f);
        else if (CORE_FILES.has(f)) categories.core.push(f);
        else if (f.startsWith('lib/') || f.startsWith('utils/')) categories.lib.push(f);
        else categories.other.push(f);
    }
    return categories;
}

function statusEmoji(status) {
    switch ((status || '').toLowerCase()) {
        case 'added': return '🟢';
        case 'removed':
        case 'deleted': return '🔴';
        case 'modified':
        case 'changed': return '🟡';
        case 'renamed': return '🔵';
        default: return '⚪';
    }
}

function shortenList(list, max = 3) {
    if (list.length <= max) return list.join(', ');
    return `${list.slice(0, max).join(', ')} +${list.length - max}`;
}

function formatChangesBlock(changes, limit = 30) {
    if (!changes || changes.length === 0) return '';
    const lines = changes.slice(0, limit).map(c => {
        const emoji = statusEmoji(c.status);
        const name = c.file.length > 45 ? '…' + c.file.slice(-42) : c.file;
        return `  ${emoji} ${name}`;
    });
    let out = `\n📄 *Files zilizobadilika (${changes.length}):*\n${lines.join('\n')}`;
    if (changes.length > limit) {
        out += `\n  … na ${changes.length - limit} nyingine`;
    }
    return out;
}

function formatUpdateInfo(res) {
    const line = '━━━━━━━━━━━━━━━━━━━━━━━━━';
    const header = '🔄 *UPDATE CHECKER*';
    const ts = new Date().toLocaleString('en-GB', { hour12: false });

    // NO UPDATE CASE
    if (!res || (!res.available && res.mode !== 'error')) {
        return [
            header,
            line,
            '✅ *Your bot is up to date*',
            '',
            `📅 Checked: ${ts}`,
            res?.version ? `🔖 Commit: \`${res.version.slice(0, 7)}\`` : '',
        ].filter(Boolean).join('\n');
    }

    // ERROR CASE
    if (res.mode === 'error') {
        return [
            header,
            line,
            '❌ *Update check failed*',
            '',
            `⚠️ Reason: ${res.error || 'Unknown error'}`,
            '',
            '💡 Check your internet connection and try again.',
        ].join('\n');
    }

    // UPDATE AVAILABLE
    const parts = [header, line];
    parts.push(`🟢 *UPDATE AVAILABLE*`);
    parts.push('');
    parts.push(`📅 Checked: ${ts}`);
    if (res.version) parts.push(`🔖 Latest: \`${res.version.slice(0, 7)}\``);
    if (res.currentVersion) parts.push(`📌 Current: \`${res.currentVersion.slice(0, 7)}\``);
    parts.push('');

    const files = res.changes?.map(c => c.file) || [];
    const categories = categorizeChanges(files);

    parts.push('📊 *Change Summary*');
    parts.push(`  • Total files: *${files.length}*`);

    const counts = { added: 0, modified: 0, removed: 0 };
    for (const c of res.changes || []) {
        const s = (c.status || '').toLowerCase();
        if (s === 'added') counts.added++;
        else if (s === 'removed' || s === 'deleted') counts.removed++;
        else counts.modified++;
    }
    parts.push(`  • 🟢 Added: ${counts.added}   🟡 Modified: ${counts.modified}   🔴 Removed: ${counts.removed}`);

    if (categories.commands.length) parts.push(`  • 📂 Commands: ${shortenList(categories.commands)}`);
    if (categories.core.length) parts.push(`  • ⚙️ Core: ${shortenList(categories.core)}`);
    if (categories.lib.length) parts.push(`  • 📚 Libraries: ${shortenList(categories.lib)}`);
    if (categories.other.length) parts.push(`  • 📦 Other: ${categories.other.length} file(s)`);

    parts.push(formatChangesBlock(res.changes));
    parts.push('');
    parts.push(`💡 *Use* \`.update\` *to install now*`);

    return parts.join('\n').trim();
}

// ═══════════════════════════════════════════════════════════
// CORE CHECK LOGIC
// ═══════════════════════════════════════════════════════════
async function checkForUpdates() {
    try {
        const latestCommit = await fetchLatestCommit();
        if (!latestCommit) {
            return { available: false, mode: 'none', version: null };
        }

        const latestSha = latestCommit.sha;
        const version = await loadVersion();
        const currentSha = version?.sha || null;

        // Prefer commit-diff changes (what .update will actually install)
        let changes = await getCommitChanges(currentSha, latestSha);

        // Fallback: compare working tree against remote if no SHA tracked yet
        if (changes.length === 0 && !currentSha) {
            const localChanges = await getLocalChanges(latestSha);
            changes = localChanges;
        }

        return {
            available: changes.length > 0 || (!currentSha && latestSha),
            mode: 'git',
            files: changes.map(c => c.file).join('\n'),
            changes,
            version: latestSha,
            currentVersion: currentSha,
            commitMessage: latestCommit.commit?.message?.split('\n')[0] || '',
            author: latestCommit.commit?.author?.name || '',
        };
    } catch (err) {
        console.error('[UpdateChecker] Error:', err.message);
        return { available: false, mode: 'error', error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════
async function sendUpdateResult(sock, chatId, message, result, quoted) {
    if (!result?.available) {
        await sock.sendMessage(chatId, { text: message }, { quoted });
        return;
    }

    try {
        const updateButton = new Button(sock)
            .setBody(message)
            .setFooter('MICKEYGLITCH • UPDATE SYSTEM')
            .addReply('⬇️ Install Update', '.update')
            .addReply('🔄 Re-check', '.checkupdates');

        await updateButton.send(chatId, { quoted, fallbackText: message });
    } catch (err) {
        console.error('[UpdateChecker] Button send failed:', err.message);
        await sock.sendMessage(chatId, { text: message }, { quoted });
    }
}

// ═══════════════════════════════════════════════════════════
// COMMAND ENTRY
// ═══════════════════════════════════════════════════════════
async function checkUpdatesCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        return sock.sendMessage(
            chatId,
            { text: '⛔ Only bot owner or sudo can use this command.' },
            { quoted: message }
        );
    }

    const reminder = await loadReminder();
    const cmd = (args[0] || '').toLowerCase();

    // Toggle auto reminder
    if (cmd === 'auto') {
        reminder.autoReminder = !reminder.autoReminder;
        await saveReminder();
        return sock.sendMessage(
            chatId,
            {
                text: `✅ Auto update reminders *${reminder.autoReminder ? 'ENABLED' : 'DISABLED'}*\n\n💡 You will be notified when a new update is available.`,
            },
            { quoted: message }
        );
    }

    // Show reminder status
    if (cmd === 'status') {
        const version = await loadVersion();
        const status = reminder.autoReminder ? '✅ ENABLED' : '❌ DISABLED';
        return sock.sendMessage(
            chatId,
            {
                text: [
                    '📢 *Update System Status*',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━',
                    `🔔 Auto Reminder: ${status}`,
                    `🔖 Current Commit: ${version?.sha ? '`' + version.sha.slice(0, 7) + '`' : '_not tracked_'}`,
                    `📅 Last Updated: ${version?.updatedAt ? new Date(version.updatedAt).toLocaleString() : '_unknown_'}`,
                    '',
                    '💡 `.checkupdates auto` — toggle reminders',
                    '💡 `.checkupdates` — check for updates now',
                ].join('\n'),
            },
            { quoted: message }
        );
    }

    // Perform the check
    try {
        const res = await checkForUpdates();
        const updateHash = res?.version || null;

        const updateMsg = formatUpdateInfo(res);
        await sendUpdateResult(sock, chatId, updateMsg, res, message);

        // Update reminder cache
        if (res && res.available) {
            const isNew = updateHash && updateHash !== reminder.updateHash;
            if (isNew) {
                reminder.updateFound = true;
                reminder.updateHash = updateHash;
                reminder.latestSha = res.version;
                reminder.lastCheck = new Date().toISOString();
                await saveReminder();

                if (reminder.autoReminder) {
                    await sock.sendMessage(chatId, {
                        text: `🔔 *New update detected!*\n\n📌 ${res.changes?.length || 0} file(s) changed.\nType \`.update\` to install.`,
                    });
                }
            }
        } else {
            reminder.updateFound = false;
            reminder.updateHash = null;
            reminder.lastCheck = new Date().toISOString();
            await saveReminder();
        }
    } catch (err) {
        console.error('[CheckUpdates] Failed:', err);
        await sock.sendMessage(
            chatId,
            {
                text: [
                    '❌ *Update Check Failed*',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━',
                    `⚠️ ${err.message || err}`,
                    '',
                    '💡 Make sure you have internet connection and try again.',
                ].join('\n'),
            },
            { quoted: message }
        );
    }
}

// Export utilities for the `.update` command to use
module.exports = checkUpdatesCommand;
module.exports.checkForUpdates = checkForUpdates;
module.exports.formatUpdateInfo = formatUpdateInfo;
module.exports.getLocalChanges = getLocalChanges;
module.exports.saveCurrentVersion = saveCurrentVersion;
module.exports.IGNORED_NAMES = IGNORED_NAMES;
module.exports.isIgnoredPath = isIgnoredPath;