const { exec } = require('child_process');
const fs = require('fs-extra'); 
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

/**
 * @project: MICKEY GLITCH
 * @command: UPDATE (Fixed Edition)
 */

async function updateCommand(sock, chatId, message, zipUrl) {
    try {
        const isOwner = message.key.fromMe;
        if (!isOwner) return;

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // --- 🛡️ FIXED URL LOGIC ---
        const repoUrl = "https://github.com/Mickeydeveloper/Mickey-Glitch";
        
        // Hapa tunahakikisha kuwa lazima kuwe na URL, vinginevyo inatumia default
        let updateZipUrl = zipUrl && zipUrl.startsWith('http') 
            ? zipUrl.trim() 
            : `${repoUrl}/archive/refs/heads/main.zip`;

        console.log(chalk.blue(`[Update] Link inayotumika: ${updateZipUrl}`));

        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bot_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
        fs.ensureDirSync(tmpDir);

        // --- 🛡️ AXIOS WITH ERROR HANDLING ---
        const response = await axios({ 
            method: 'get', 
            url: updateZipUrl, 
            responseType: 'stream',
            timeout: 60000 
        }).catch(err => {
            throw new Error(`Imeshindwa kupata file: ${err.message}`);
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Extraction
        await sock.sendMessage(chatId, { text: "📦 *Mchakato wa ku-update umeanza...*" });

        exec(`unzip -o ${zipPath} -d ${extractPath}`, (err) => {
            if (err) {
                console.log(chalk.red("Unzip failed!"));
                return sock.sendMessage(chatId, { text: "❌ *Unzip Failed:* Hakikisha Panel yako inaruhusu amri ya unzip." });
            }

            const folders = fs.readdirSync(extractPath);
            if (folders.length === 0) return;
            
            const rootFolder = path.join(extractPath, folders[0]); 
            const ignore = ['node_modules', 'session', 'auth_info_baileys', '.git', 'settings.js', 'config.js', '.env'];

            const files = fs.readdirSync(rootFolder);
            for (const file of files) {
                if (!ignore.includes(file)) {
                    fs.copySync(path.join(rootFolder, file), path.join(process.cwd(), file), { overwrite: true });
                }
            }

            fs.removeSync(tmpDir);

            sock.sendMessage(chatId, { text: "✅ *Update Imekamilika kwa mafanikio!*\n\nBot inajizima na kuwaka upya." });
            console.log(chalk.green.bold('📢 UPDATE SUCCESSFUL!'));

            setTimeout(() => {
                process.exit(1); 
            }, 3000);
        });

    } catch (err) {
        console.error(chalk.red("Update Error:"), err.message);
        // Hapa bot haitazima (crash), itatuma tu ujumbe wa kosa
        await sock.sendMessage(chatId, { text: `❌ *Update Imefeli:* ${err.message}` }).catch(() => {});
    }
}

module.exports = updateCommand;
