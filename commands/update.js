const { exec } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs-extra'); 
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

/**
 * @project: MICKEY GLITCH
 * @command: UPDATE (Fixed Edition - With Fallback Extraction)
 */

// Helper: Try different extraction methods
async function extractZipFile(zipPath, extractPath) {
    return new Promise((resolve, reject) => {
        // Method 1: Try unzip command (Linux/Mac)
        exec(`unzip -o "${zipPath}" -d "${extractPath}"`, (err) => {
            if (!err) {
                console.log(chalk.green('✓ Extracted using unzip'));
                return resolve(true);
            }

            console.log(chalk.yellow('⚠ unzip failed, trying 7z...'));

            // Method 2: Try 7z command (Windows/Linux)
            exec(`7z x "${zipPath}" -o"${extractPath}" -y`, (err2) => {
                if (!err2) {
                    console.log(chalk.green('✓ Extracted using 7z'));
                    return resolve(true);
                }

                console.log(chalk.yellow('⚠ 7z failed, trying tar...'));

                // Method 3: Try tar command (for .tar.gz, etc)
                exec(`tar -xzf "${zipPath}" -C "${extractPath}"`, (err3) => {
                    if (!err3) {
                        console.log(chalk.green('✓ Extracted using tar'));
                        return resolve(true);
                    }

                    // All methods failed
                    reject(new Error(
                        'EXTRACTION_FAILED: Unzip, 7z, na tar zote hazifanya kazi.\n' +
                        'Panel yako inaweza kuwa na restrictions kwenye extraction tools.\n' +
                        'Suluhisho:\n' +
                        '1. Contact hosting provider kuomba unzip/7z permissions\n' +
                        '2. Jaribu manual update kutoka GitHub\n' +
                        '3. Deploy bot kwenye panel inayoruhusu extraction'
                    ));
                });
            });
        });
    });
}

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

        // Extraction - with fallback methods
        await sock.sendMessage(chatId, { text: "📦 *Mchakato wa ku-update umeanza...*" });

        try {
            await extractZipFile(zipPath, extractPath);
            
            const folders = fs.readdirSync(extractPath);
            if (folders.length === 0) {
                throw new Error('Extracted folder is empty');
            }
            
            const rootFolder = path.join(extractPath, folders[0]); 
            const ignore = ['node_modules', 'session', 'auth_info_baileys', '.git', 'settings.js', 'config.js', '.env'];

            const files = fs.readdirSync(rootFolder);
            for (const file of files) {
                if (!ignore.includes(file)) {
                    fs.copySync(path.join(rootFolder, file), path.join(process.cwd(), file), { overwrite: true });
                }
            }

            fs.removeSync(tmpDir);

            await sock.sendMessage(chatId, { text: "✅ *Update Imekamilika kwa mafanikio!*\n\nBot inajizima na kuwaka upya." });
            console.log(chalk.green.bold('📢 UPDATE SUCCESSFUL!'));

            setTimeout(() => {
                process.exit(1); 
            }, 3000);
        } catch (extractErr) {
            console.error(chalk.red('Extraction Error:'), extractErr.message);
            fs.removeSync(tmpDir);
            
            // Provide helpful error message
            const errorMsg = extractErr.message.includes('EXTRACTION_FAILED')
                ? extractErr.message
                : `❌ *Extraction Imefeli:* ${extractErr.message}\n\n` +
                  '*Suluhisho:*\n' +
                  '• Hakikisha panel inaruhusu unzip/7z commands\n' +
                  '• Jaribu `.repo` command kudownload bot kwenye local\n' +
                  '• Sitiki kwenye hosting provider';
            
            await sock.sendMessage(chatId, { text: errorMsg }).catch(() => {});
        }

    } catch (err) {
        console.error(chalk.red("Update Error:"), err.message);
        // Hapa bot haitazima (crash), itatuma tu ujumbe wa kosa
        await sock.sendMessage(chatId, { text: `❌ *Update Imefeli:* ${err.message}` }).catch(() => {});
    }
}

module.exports = updateCommand;
