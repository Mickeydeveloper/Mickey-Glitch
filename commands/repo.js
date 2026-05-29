// commands/repo.js
const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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
            
            output.on('close', () => {
                resolve({ path: zipFilePath, size: archive.pointer(), name: zipFileName });
            });
            
            archive.on('error', reject);
            archive.pipe(output);
            
            // Add project files
            const projectDir = path.join(__dirname, '..');
            const excludeDirs = ['node_modules', 'temp', '.git', 'sessions', 'cache', 'logs', 'uploads'];
            
            function addDirectory(dirPath, archivePath = '') {
                try {
                    const items = fs.readdirSync(dirPath);
                    
                    for (const item of items) {
                        const fullPath = path.join(dirPath, item);
                        const stat = fs.statSync(fullPath);
                        const relativePath = archivePath ? path.join(archivePath, item) : item;
                        
                        if (excludeDirs.includes(item) || item.startsWith('.')) continue;
                        
                        if (stat.isDirectory()) {
                            try {
                                archive.directory(fullPath, relativePath);
                                addDirectory(fullPath, relativePath);
                            } catch(e) {}
                        } else {
                            try {
                                archive.file(fullPath, { name: relativePath });
                            } catch(e) {}
                        }
                    }
                } catch(e) {}
            }
            
            addDirectory(projectDir);
            await archive.finalize();
            
        } catch (error) {
            reject(error);
        }
    });
}

async function repoCommand(sock, chatId, m, body = '') {
    try {
        // SAFE CHECK - Prevent undefined errors
        const safeM = m || {};
        const safeKey = safeM.key || {};
        
        // TAMBUA INPUT
        let input = (
            safeM.message?.conversation || 
            safeM.message?.extendedTextMessage?.text || 
            safeM.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            safeM.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).toLowerCase().trim();

        console.log('📝 Repo Command Input:', input); // Debug

        // 1. HANDLE DOWNLOAD ZIP BUTTON
        if (input === 'download_zip' || input === '.download_zip') {
            try {
                await sock.sendMessage(chatId, { react: { text: '📦', key: safeKey } });
            } catch(e) {}
            
            const processingMsg = await sock.sendMessage(chatId, {
                text: '📦 *CREATING ZIP FILE...*\n\nPlease wait while I package the bot files...\n⏳ This may take 10-20 seconds...'
            });
            
            try {
                const zipInfo = await createProjectZip();
                const zipBuffer = fs.readFileSync(zipInfo.path);
                const fileSizeMB = (zipInfo.size / (1024 * 1024)).toFixed(2);
                
                await sock.sendMessage(chatId, {
                    document: zipBuffer,
                    mimetype: 'application/zip',
                    fileName: zipInfo.name,
                    caption: `✅ *ZIP FILE READY!*\n\n📦 *File:* ${zipInfo.name}\n💾 *Size:* ${fileSizeMB} MB\n📁 *Files:* Complete bot source code\n\n🔧 *Installation:*\n1. Extract the zip file\n2. Run \`npm install\`\n3. Configure \`settings.js\`\n4. Run \`npm start\`\n\n🌟 *MICKEY GLITCH BOT v3.3*`
                }, { quoted: safeM });
                
                // Cleanup
                setTimeout(() => {
                    try { fs.unlinkSync(zipInfo.path); } catch(e) {}
                }, 5000);
                
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
            } catch (error) {
                console.error('Zip error:', error);
                await sock.sendMessage(chatId, {
                    text: `❌ *FAILED TO CREATE ZIP!*\n\nError: ${error.message}\n\n📌 *Alternative:*\nClone from: ${CONFIG.REPO_URL}\n\nOr contact owner for direct access.`
                });
            }
            return;
        }

        // 2. HANDLE VIEW REPO BUTTON
        if (input === 'view_repo' || input === '.view_repo') {
            await sock.sendMessage(chatId, {
                text: `📂 *GITHUB REPOSITORY*\n\n🔗 ${CONFIG.REPO_URL}\n\n🌟 Star & Fork the repo to support!\n\n📌 *Available Commands:*\n• *.repo* - Show this menu\n• *.download_zip* - Download source code\n• *.owner* - Contact owner`
            });
            return;
        }

        // 3. MAIN MENU - Ikipigwa ".repo"
        if (input === '.repo') {
            try {
                await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } });
            } catch(e) {}

            const repoText = `╭━━━━━━━━━━━━━━━━━━╮
┃    📂 *REPO MENU* 📂
┃━━━━━━━━━━━━━━━━━━
┃
┃ 🤖 *Bot:* MICKEY GLITCH
┃ 📦 *Version:* 3.3
┃ 📁 *Files:* Complete Source
┃ 💾 *Size:* ~15-20 MB
┃
┃ 🔗 *GitHub:* 
┃ ${CONFIG.REPO_URL}
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 *Tap buttons below*`;

            return await sendInteractiveMessage(sock, chatId, {
                text: repoText,
                footer: CONFIG.FOOTER,
                interactiveButtons: [
                    { 
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📦 DOWNLOAD ZIP",
                            id: "download_zip"
                        })
                    },
                    { 
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📂 VIEW REPO",
                            id: "view_repo"
                        })
                    }
                ]
            }, { quoted: safeM });
        }

    } catch (e) {
        console.error("Repo Command Error:", e);
        await sock.sendMessage(chatId, {
            text: `❌ *Repo Command Error!*\n\n${e.message}\n\nUse .repo to access repository menu.`
        });
    }
}

module.exports = repoCommand;