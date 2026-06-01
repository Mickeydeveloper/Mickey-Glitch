const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
// Hakikisha ume-import ButtonV2 kwa usahihi kulingana na muundo wa bot yako
const { ButtonV2 } = require('gifted-btns'); 

const CONFIG = {
    FOOTER: '🌟 MICKEY GLITCH BOT • 2026 🌟',
    REPO_URL: 'https://github.com/MICKEYGLITCH/Mickey-Glitch-Bot'
};

async function createProjectZip() {
    return new Promise(async (resolve, reject) => {
        const timestamp = Date.now();
        const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
        const zipFilePath = path.join(__dirname, '../temp', zipFileName);
        const tempDir = path.join(__dirname, '../temp');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        try {
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            output.on('close', () => resolve({ path: zipFilePath, size: archive.pointer(), name: zipFileName }));
            archive.on('error', reject);
            archive.pipe(output);

            const projectDir = path.join(__dirname, '..');
            const excludeDirs = ['node_modules', 'temp', '.git', 'sessions', 'cache', 'logs', 'uploads'];

            function addDirectory(dirPath, archivePath = '') {
                const items = fs.readdirSync(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = fs.statSync(fullPath);
                    const relativePath = archivePath ? path.join(archivePath, item) : item;
                    if (excludeDirs.includes(item) || item.startsWith('.')) continue;
                    if (stat.isDirectory()) {
                        archive.directory(fullPath, relativePath);
                        addDirectory(fullPath, relativePath);
                    } else {
                        archive.file(fullPath, { name: relativePath });
                    }
                }
            }
            addDirectory(projectDir);
            await archive.finalize();
        } catch (error) { reject(error); }
    });
}

async function repoCommand(sock, chatId, m, body = '') {
    const ctx = { core: sock, _msg: m };
    let input = (m.message?.conversation || m.message?.extendedTextMessage?.text || body || '').toLowerCase().trim();

    // 1. HANDLE DOWNLOAD ZIP
    if (input === 'download_zip' || input === '.download_zip') {
        const msg = await sock.sendMessage(chatId, { text: '📦 *CREATING ZIP FILE...*' });
        try {
            const zipInfo = await createProjectZip();
            const zipBuffer = fs.readFileSync(zipInfo.path);
            await sock.sendMessage(chatId, { document: zipBuffer, mimetype: 'application/zip', fileName: zipInfo.name, caption: `✅ *ZIP READY!*` }, { quoted: m });
            fs.unlinkSync(zipInfo.path);
            await sock.sendMessage(chatId, { delete: msg.key });
        } catch (e) { await sock.sendMessage(chatId, { text: `❌ *FAILED:* ${e.message}` }); }
        return;
    }

    // 2. HANDLE VIEW REPO
    if (input === 'view_repo' || input === '.view_repo') {
        return await sock.sendMessage(chatId, { text: `🔗 ${CONFIG.REPO_URL}` });
    }

    // 3. MAIN MENU (BUTTONV2)
    if (input === '.repo') {
        await new ButtonV2(ctx.core)
            .setTitle('📂 REPO MENU')
            .setSubtitle('Mickey Glitch Technology')
            .setBody('Chagua unachotaka kufanya na source code ya bot hii hapa chini:')
            .setFooter(CONFIG.FOOTER)
            .setThumbnail('https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png')
            .addButton('📦 Download Zip', 'download_zip')
            .addButton('📂 View Repo', 'view_repo')
            .send(ctx._msg.key.remoteJid);
    }
}

module.exports = repoCommand;
