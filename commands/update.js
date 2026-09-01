const { exec } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs-extra'); 
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const chalk = require('chalk');

/**
 * @project: MICKEY GLITCH
 * @command: UPDATE (Fixed Edition - With Fallback Extraction)
 */

// Helper: Try different extraction methods
async function extractZipFile(zipPath, extractPath) {
    return new Promise((resolve, reject) => {
        // Method 1: Try AdmZip JS extraction first (no external unzip required)
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);
            console.log(chalk.green('✓ Extracted using AdmZip'));
            return resolve(true);
        } catch (admErr) {
            console.log(chalk.yellow('⚠ AdmZip JS extraction failed, trying native unzip/7z...'), admErr.message);
        }

        // Method 2: Try unzip command (Linux/Mac)
        exec(`unzip -o "${zipPath}" -d "${extractPath}"`, (err) => {
            if (!err) {
                console.log(chalk.green('✓ Extracted using unzip'));
                return resolve(true);
            }

            console.log(chalk.yellow('⚠ unzip failed, trying 7z...'));

            // Method 3: Try 7z command (Windows/Linux)
            exec(`7z x "${zipPath}" -o"${extractPath}" -y`, (err2) => {
                if (!err2) {
                    console.log(chalk.green('✓ Extracted using 7z'));
                    return resolve(true);
                }

                console.log(chalk.yellow('⚠ 7z failed, trying tar...'));

                // Method 4: Try tar command (for .tar.gz, etc)
                exec(`tar -xzf "${zipPath}" -C "${extractPath}"`, (err3) => {
                    if (!err3) {
                        console.log(chalk.green('✓ Extracted using tar'));
                        return resolve(true);
                    }

                    // All methods failed
                    reject(new Error(
                        'EXTRACTION_FAILED: AdmZip, unzip, 7z, na tar zote hazifanya kazi.\n' +
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

function gatherSourceFiles(baseDir, ignoreSet) {
    const files = new Set();
    const dirs = new Set();

    const walk = (currentDir) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;

            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(baseDir, fullPath).split(path.sep).join('/');

            if (entry.isDirectory()) {
                dirs.add(relativePath);
                walk(fullPath);
            } else {
                files.add(relativePath);
            }
        }
    };

    walk(baseDir);
    return { files, dirs };
}

function syncExtractedRepo(sourceRoot, targetRoot, ignoreSet) {
    const deletedFiles = [];
    const { files: sourceFiles, dirs: sourceDirs } = gatherSourceFiles(sourceRoot, ignoreSet);

    const walkTarget = (currentDir) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;

            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(targetRoot, fullPath).split(path.sep).join('/');

            if (entry.isDirectory()) {
                const hasMatchingDir = sourceDirs.has(relativePath);
                const hasMatchingChild = Array.from(sourceFiles).some((file) => file.startsWith(relativePath + '/'));

                if (!hasMatchingDir && !hasMatchingChild) {
                    fs.removeSync(fullPath);
                    deletedFiles.push(relativePath + '/');
                    continue;
                }

                walkTarget(fullPath);
                continue;
            }

            if (!sourceFiles.has(relativePath)) {
                fs.removeSync(fullPath);
                deletedFiles.push(relativePath);
            }
        }
    };

    const walkSource = (currentDir) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;

            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(sourceRoot, fullPath).split(path.sep).join('/');
            const targetPath = path.join(targetRoot, relativePath);

            if (entry.isDirectory()) {
                fs.ensureDirSync(targetPath);
                walkSource(fullPath);
            } else {
                fs.ensureDirSync(path.dirname(targetPath));
                fs.copySync(fullPath, targetPath, { overwrite: true });
            }
        }
    };

    walkTarget(targetRoot);
    walkSource(sourceRoot);

    return deletedFiles;
}

async function updateCommand(sock, chatId, message, zipUrl) {
    try {
        const isOwner = message.key.fromMe;
        if (!isOwner) return;

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // --- 🛡️ FIXED URL LOGIC ---
        const repoUrl = "https://github.com/Mickeydeveloper/Mickey-Glitch";

        const rawZipUrl = typeof zipUrl === 'string'
            ? zipUrl
            : (zipUrl && typeof zipUrl === 'object' && typeof zipUrl.url === 'string'
                ? zipUrl.url
                : '');

        const normalizedZipUrl = rawZipUrl.trim();
        let updateZipUrl = normalizedZipUrl && normalizedZipUrl.startsWith('http')
            ? normalizedZipUrl
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
            const repoRoot = fs.existsSync(path.join(rootFolder, 'package.json'))
                ? rootFolder
                : fs.readdirSync(rootFolder).find(item => {
                    const itemPath = path.join(rootFolder, item);
                    return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'package.json'));
                })
                    ? path.join(rootFolder, fs.readdirSync(rootFolder).find(item => {
                        const itemPath = path.join(rootFolder, item);
                        return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'package.json'));
                    }))
                    : rootFolder;

            const ignore = new Set(['node_modules', 'session', 'auth_info_baileys', '.git', 'settings.js', 'config.js', '.env', 'index.js', 'main.js', 'temp_update']);

            const deletedFiles = syncExtractedRepo(repoRoot, process.cwd(), ignore);

            if (deletedFiles.length > 0) {
                console.log(chalk.red(`[Update] Deleted stale files (${deletedFiles.length}):`));
                for (const file of deletedFiles) {
                    console.log(chalk.red(`  - ${file}`));
                }
            } else {
                console.log(chalk.green('[Update] No stale files were deleted.'));
            }

            fs.removeSync(tmpDir);

            const deletedSummary = deletedFiles.length > 0
                ? `\n\n🗑️ *Files zilizofutwa:*\n${deletedFiles.slice(0, 10).map(f => `• ${f}`).join('\n')}${deletedFiles.length > 10 ? '\n... na zaidi' : ''}`
                : '';

            await sock.sendMessage(chatId, { text: `✅ *Update Imekamilika kwa mafanikio!*\n\nBot inajizima na kuwaka upya.${deletedSummary}` });
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
