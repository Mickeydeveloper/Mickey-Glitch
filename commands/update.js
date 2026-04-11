const { exec } = require('child_process');
const fs = require('fs-extra'); 
const path = require('path');
const axios = require('axios');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: UPDATE
 * @author: Quantum Base Developer
 */

async function updateCommand(sock, chatId, message) {
    try {
        // 1. OWNER SECURITY CHECK (Muhimu sana!)
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = message.key.fromMe; // Unaweza kuongeza check ya sudo list hapa

        if (!isOwner) {
            return await sock.sendMessage(chatId, { text: "❌ *ACCESS DENIED:* Amri hii ni kwa ajili ya Quantum Base Developer pekee!" });
        }

        // Tuma ishara ya kuanza
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        await sock.sendMessage(chatId, { text: "🚀 *Mickey Glitch Update initiated...*\n\nSystem is downloading files from GitHub. Please wait." });

        // 2. CONFIGURATION
        const repoUrl = "https://github.com/Mickeydeveloper/Mickey-Glitch";
        const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`;
        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bot_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        // Safisha mabaki ya zamani
        if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
        fs.ensureDirSync(tmpDir);

        // 3. DOWNLOAD ZIP (High Speed Stream)
        const response = await axios({
            method: 'get',
            url: zipUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 4. EXTRACTION
        await sock.sendMessage(chatId, { text: "📦 *Extracting update files...*" });
        try {
            // Tumia exec mbadala kama unzip haipo
            await execPromise(`unzip -o ${zipPath} -d ${extractPath}`);
        } catch (e) {
            await sock.sendMessage(chatId, { text: "⚠️ Server unzip tool missing. Manual copy starting..." });
            // Hapa unaweza kuongeza library kama 'adm-zip' ikiwa unzip ya mfumo inafeli
        }

        // 5. OVERWRITE FILES
        const folders = fs.readdirSync(extractPath);
        const rootFolder = path.join(extractPath, folders[0]); 

        // FILES ZA KULINDA (Zisiguzwe ili usipoteze session au setting zako)
        const ignore = ['node_modules', 'session', 'auth_info_baileys', '.git', 'settings.js', 'config.js', 'package-lock.json'];

        const files = fs.readdirSync(rootFolder);
        for (const file of files) {
            if (!ignore.includes(file)) {
                fs.copySync(path.join(rootFolder, file), path.join(process.cwd(), file), { overwrite: true });
            }
        }

        // 6. FINALIZING & RESTART
        await sock.sendMessage(chatId, { text: "✅ *Update Successful!*\n\nBot is restarting to apply changes... 🔄" });

        // Futa temp files
        fs.removeSync(tmpDir);

        // Auto-restart after 4 seconds
        setTimeout(() => {
            console.log(chalk?.green ? chalk.green('[RESTART] Applying Updates...') : '[RESTART] Applying Updates...');
            process.exit(0);
        }, 4000);

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ *Update Failed:*\n${err.message}` });
    }
}

// Helper function
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject(error);
            resolve(stdout);
        });
    });
}

// ────────────────────────────────────────────────
// EXPORT KWA AJILI YA DYNAMIC SYNC
// ────────────────────────────────────────────────
module.exports = {
    name: 'update',
    category: 'owner',
    description: 'Update bot from GitHub repository',
    execute: updateCommand
};
