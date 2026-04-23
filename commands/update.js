const { exec } = require('child_process');
const fs = require('fs-extra'); 
const path = require('path');
const axios = require('axios');
const chalk = require('chalk'); // FIX: Nimeongeza hii hapa kuzuia error

/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: UPDATE (Bot-Hosting Edition)
 */

async function updateCommand(sock, chatId, message) {
    try {
        const isOwner = message.key.fromMe;
        if (!isOwner) return await sock.sendMessage(chatId, { text: "❌ *ACCESS DENIED*" });

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        
        const repoUrl = "https://github.com/Mickeydeveloper/Mickey-Glitch";
        const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`;
        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bot_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
        fs.ensureDirSync(tmpDir);

        // Download
        const response = await axios({ method: 'get', url: zipUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Extraction
        await sock.sendMessage(chatId, { text: "📦 *Extracting & Overwriting...*" });
        
        // Njia salama ya ku-unzip kwenye panels
        exec(`unzip -o ${zipPath} -d ${extractPath}`, (err) => {
            if (err) {
                console.log(chalk.red("Unzip failed, trying manual copy..."));
            }

            const folders = fs.readdirSync(extractPath);
            const rootFolder = path.join(extractPath, folders[0]); 
            const ignore = ['node_modules', 'session', 'auth_info_baileys', '.git', 'settings.js', 'config.js'];

            const files = fs.readdirSync(rootFolder);
            for (const file of files) {
                if (!ignore.includes(file)) {
                    fs.copySync(path.join(rootFolder, file), path.join(process.cwd(), file), { overwrite: true });
                }
            }

            fs.removeSync(tmpDir);

            // --- 🔄 IMPROVED AUTO RESTART FOR PANELS ---
            sock.sendMessage(chatId, { text: "✅ *Update Imekamilika!*\n\nBot itajizima na kuwaka upya sasa hivi. Kama haitawaka, iwashe manually kwenye Panel." });

            console.log(chalk.green.bold('📢 UPDATE SUCCESSFUL! RESTARTING...'));

            setTimeout(() => {
                // Tunatumia exit(1) badala ya 0 ili panel itambue kama 'crash' na iwashe bot upya
                process.exit(1); 
            }, 3000);
        });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ *Update Failed:* ${err.message}` });
    }
}

module.exports = {
    name: 'update',
    category: 'owner',
    execute: updateCommand
};
