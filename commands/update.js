const { exec } = require('child_process');
const fs = require('fs-extra'); // Hakikisha ume-install fs-extra (npm install fs-extra)
const path = require('path');
const axios = require('axios');

async function updateCommand(sock, chatId, message) {
    try {
        // 1. Tuma ishara ya kuanza
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        await sock.sendMessage(chatId, { text: "🚀 *Mickey Glitch Update initiated...*\n\nSystem is downloading files from GitHub. Please wait." });

        // 2. Link yako uliyotuma (Auto-convert to ZIP)
        const repoUrl = "https://github.com/Mickeydeveloper/Mickey-Glitch";
        const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`;

        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bot_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        // Safisha kama kuna mabaki ya zamani
        if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
        fs.ensureDirSync(tmpDir);

        // 3. Download Faili (High Speed)
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

        // 4. Extract Files
        await sock.sendMessage(chatId, { text: "📦 *Extracting update files...*" });
        try {
            await execPromise(`unzip -o ${zipPath} -d ${extractPath}`);
        } catch (e) {
            // Kama unzip haipo kwenye panel, tumia njia mbadala
            await sock.sendMessage(chatId, { text: "⚠️ Server unzip tool missing. Manual intervention might be needed." });
            throw e;
        }

        // 5. Move Files (Overwrite)
        const folders = fs.readdirSync(extractPath);
        const rootFolder = path.join(extractPath, folders[0]); // Folder la ndani ya ZIP

        // Files za kuacha (Usifute session wala settings zako)
        const ignore = ['node_modules', 'session', '.git', 'settings.js', 'package-lock.json'];

        const files = fs.readdirSync(rootFolder);
        for (const file of files) {
            if (!ignore.includes(file)) {
                fs.copySync(path.join(rootFolder, file), path.join(process.cwd(), file), { overwrite: true });
            }
        }

        // 6. Maliza na Restart
        await sock.sendMessage(chatId, { text: "✅ *Update Successful!*\n\nBot is restarting to apply changes... 🔄" });
        
        // Futa takataka za update
        fs.removeSync(tmpDir);

        // Zima bot (Panel yako itaiwasha yenyewe ikiwa na kodi mpya) - Auto-restart after 4 seconds
        setTimeout(() => {
            console.log('[AutoRestart] Process restarting...');
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

module.exports = updateCommand;
