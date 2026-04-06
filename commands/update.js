const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const settings = require('../settings');
const isOwnerOrSudo = require('../lib/isOwner');

// Utility ya kuendesha commands za terminal
function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString()));
            resolve((stdout || '').toString());
        });
    });
}

// 🤖 AUTO-DETECT URL: Inatafuta pa kwenda ikikwama
function getAutoUrl() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        let repoUrl = settings.updateZipUrl || process.env.UPDATE_ZIP_URL || pkg.repository?.url || pkg.homepage || "";
        
        if (repoUrl.includes('github.com')) {
            repoUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
            if (!repoUrl.endsWith('.zip')) {
                return `${repoUrl}/archive/refs/heads/main.zip`;
            }
        }
        return repoUrl;
    } catch (e) { return ""; }
}

// 📥 Download Engine na Redirect Handling
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? require('https') : require('http');
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(new URL(res.headers.location, url).toString(), dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', reject);
    });
}

// 📦 Extraction Engine (Universal)
async function extractZip(zipPath, outDir) {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    try {
        await run(`unzip -o "${zipPath}" -d "${outDir}"`);
    } catch (e) {
        // Backup kama unzip haipo kwenye panel
        try { await run(`7z x -y "${zipPath}" -o"${outDir}"`); }
        catch (e2) { throw new Error("No unzip tool found on host."); }
    }
}

// 🚀 MAIN UPDATE COMMAND
async function updateCommand(sock, chatId, message) {
    try {
        const sender = message.key.participant || message.key.remoteJid;
        if (!await isOwnerOrSudo(sender, sock, chatId)) return;

        await sock.sendMessage(chatId, { text: "🛰️ *Mickey Glitch Auto-Update Started...*" }, { quoted: message });

        const url = getAutoUrl();
        if (!url || !url.startsWith('http')) {
            return await sock.sendMessage(chatId, { text: "❌ *Error:* URL haijapatikana. Weka link kwenye settings.js." });
        }

        const tmpDir = path.join(process.cwd(), 'tmp');
        const zipPath = path.join(tmpDir, 'update.zip');
        const extractTo = path.join(tmpDir, 'extract');

        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
        
        // 1. Download
        await downloadFile(url, zipPath);
        
        // 2. Extract
        await extractZip(zipPath, extractTo);

        // 3. Sync Files (Copy over)
        const entries = fs.readdirSync(extractTo);
        const source = entries.length === 1 ? path.join(extractTo, entries[0]) : extractTo;
        
        const ignore = ['node_modules', '.git', 'session', 'tmp', 'temp', 'data', 'settings.js', 'package-lock.json'];
        
        // Copy recursive logic hapa (Nimeifupisha kwa ajili ya spidi)
        const copyFiles = (s, d) => {
            fs.readdirSync(s).forEach(file => {
                if (ignore.includes(file)) return;
                const src = path.join(s, file);
                const dst = path.join(d, file);
                if (fs.lstatSync(src).isDirectory()) {
                    if (!fs.existsSync(dst)) fs.mkdirSync(dst);
                    copyFiles(src, dst);
                } else {
                    fs.copyFileSync(src, dst);
                }
            });
        };
        copyFiles(source, process.cwd());

        // 4. Final Cleanup & Restart
        await sock.sendMessage(chatId, { text: "✅ *Update Successful!* Bot is restarting now..." });
        
        fs.rmSync(tmpDir, { recursive: true, force: true });
        
        setTimeout(() => process.exit(0), 2000); // Hii itasababisha panel i-restart bot yenyewe

    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ *Update Failed:* ${err.message}` });
    }
}

module.exports = updateCommand;
