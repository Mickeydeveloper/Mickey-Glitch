const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver'); // Install: npm install archiver
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * ownerCommand - MICKEY GLITCH BOT (IMPROVED)
 * @version 3.2 (ZIP DOWNLOAD + VCARD FIXED)
 * @author Quantum Base Developer
 */

// Function to create zip file from project directory
async function createProjectZip() {
    return new Promise(async (resolve, reject) => {
        const timestamp = Date.now();
        const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
        const zipFilePath = path.join(__dirname, '..', 'temp', zipFileName);
        
        // Create temp directory if not exists
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        try {
            // Method 1: Using archiver (better for large projects)
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });
            
            output.on('close', () => {
                console.log(`✅ Zip created: ${zipFilePath} (${archive.pointer()} bytes)`);
                resolve({ path: zipFilePath, size: archive.pointer(), name: zipFileName });
            });
            
            archive.on('error', (err) => reject(err));
            archive.pipe(output);
            
            // Add project files (exclude node_modules and temp)
            const projectDir = path.join(__dirname, '..');
            const excludeDirs = ['node_modules', 'temp', '.git', 'sessions', 'cache'];
            
            function addDirectory(dirPath, archivePath = '') {
                const files = fs.readdirSync(dirPath);
                
                for (const file of files) {
                    const fullPath = path.join(dirPath, file);
                    const stat = fs.statSync(fullPath);
                    const relativePath = archivePath ? path.join(archivePath, file) : file;
                    
                    // Skip excluded directories
                    if (stat.isDirectory() && excludeDirs.includes(file)) {
                        continue;
                    }
                    
                    if (stat.isDirectory()) {
                        archive.directory(fullPath, relativePath);
                        addDirectory(fullPath, relativePath);
                    } else {
                        archive.file(fullPath, { name: relativePath });
                    }
                }
            }
            
            // Add main files
            const mainFiles = ['app.js', 'package.json', 'settings.js', 'config.js'];
            for (const file of mainFiles) {
                const filePath = path.join(projectDir, file);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, { name: file });
                }
            }
            
            // Add commands directory
            const commandsDir = path.join(projectDir, 'commands');
            if (fs.existsSync(commandsDir)) {
                archive.directory(commandsDir, 'commands');
            }
            
            // Add helpers directory
            const helpersDir = path.join(projectDir, 'helpers');
            if (fs.existsSync(helpersDir)) {
                archive.directory(helpersDir, 'helpers');
            }
            
            await archive.finalize();
            
        } catch (error) {
            // Method 2: Using command line zip (fallback)
            try {
                const { stdout, stderr } = await execPromise(`cd ${path.join(__dirname, '..')} && zip -r ${zipFilePath} . -x "node_modules/*" "temp/*" ".git/*" "sessions/*" "*.zip"`);
                console.log('Zip created via command line:', stdout);
                resolve({ path: zipFilePath, size: fs.statSync(zipFilePath).size, name: zipFileName });
            } catch (cmdError) {
                reject(cmdError);
            }
        }
    });
}

// Function to send zip file
async function sendZipFile(sock, chatId, m) {
    try {
        // Send processing message
        const processingMsg = await sock.sendMessage(chatId, {
            text: '📦 *CREATING ZIP FILE...*\n\nPlease wait while I package the bot files...\n⏳ Compressing...',
            react: { text: '📦', key: m.key }
        });
        
        // Create the zip file
        const zipInfo = await createProjectZip();
        
        // Read the zip file
        const zipBuffer = fs.readFileSync(zipInfo.path);
        
        // Calculate file size for display
        const fileSizeMB = (zipInfo.size / (1024 * 1024)).toFixed(2);
        
        // Send the zip file
        await sock.sendMessage(chatId, {
            document: zipBuffer,
            mimetype: 'application/zip',
            fileName: zipInfo.name,
            caption: `✅ *ZIP FILE READY!*\n\n📦 *File:* ${zipInfo.name}\n💾 *Size:* ${fileSizeMB} MB\n📁 *Files included:* Complete bot source code\n\n🔧 *How to use:*\n1. Extract the zip file\n2. Run \`npm install\`\n3. Configure \`settings.js\`\n4. Run \`node app.js\`\n\n🌟 *MICKEY GLITCH BOT v3.2*`
        }, { quoted: m });
        
        // Delete temp file after sending
        setTimeout(() => {
            try {
                fs.unlinkSync(zipInfo.path);
                console.log(`🗑️ Deleted temp file: ${zipInfo.path}`);
            } catch (err) {
                console.error('Error deleting temp file:', err);
            }
        }, 5000);
        
        // Delete processing message
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        
        return true;
    } catch (error) {
        console.error('Zip creation error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *FAILED TO CREATE ZIP!*\n\nError: ${error.message}\n\nPlease try again or contact developer.`,
            react: { text: '❌', key: m.key }
        });
        return false;
    }
}

async function ownerCommand(sock, chatId, m, body = '') {
    // Quick validation
    if (!sock || !chatId) return console.error('❌ Missing parameters');

    try {
        // Get owner data with defaults
        const ownerNumber = (settings.ownerNumber || '255612130873').replace(/[^\d]/g, '');
        const ownerName = settings.botOwner || 'Mickey Developer';
        const botName = settings.botName || 'MICKEY GLITCH';

        // Pre-calculate links
        const waLink = `https://wa.me/${ownerNumber}`;
        const channelLink = 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610';
        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        // Handle commands
        const cmd = (body || '').toLowerCase().trim();
        
        // Handle vcard request
        if (cmd === 'get_vcard' || cmd === '.get_vcard' || cmd === 'get_vcard_command') {
            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName}
TITLE:BOT OWNER
TEL;waid=${ownerNumber}:+${ownerNumber}
TEL;TYPE=CELL:+${ownerNumber}
EMAIL:${settings.botEmail || 'mickeyglitch@gmail.com'}
URL:${waLink}
NOTE:Bot Owner Contact - ${botName}
X-WA-BIZ-NAME:${botName}
X-WA-BIZ-DESC:Official WhatsApp Bot
END:VCARD`;

            await sock.sendMessage(chatId, {
                contacts: { 
                    displayName: ownerName, 
                    contacts: [{ vcard }] 
                }
            }, { quoted: m });
            
            await sock.sendMessage(chatId, {
                text: `✅ *VCARD SENT!*\n\nContact for *${ownerName}* has been saved to your phone.\n\nTap the contact to start chatting! 👑`,
                react: { text: '📇', key: m.key }
            }).catch(() => {});
            
            return;
        }
        
        // Handle download zip request
        if (cmd === 'download_zip' || cmd === '.download_zip' || cmd === 'get_zip' || cmd === '.get_zip') {
            await sendZipFile(sock, chatId, m);
            return;
        }

        // Quick reaction (non-blocking)
        if (m?.key) {
            sock.sendMessage(chatId, { react: { text: '👑', key: m.key } }).catch(() => {});
        }

        // ============ IMPROVED MESSAGE APPEARANCE ============
        const ownerText = `╭━━━━━━━━━━━━━━━━━━╮
┃    👑 *OWNER INFO* 👑
┃━━━━━━━━━━━━━━━━━━
┃
┃ 🤖 *Bot:* ${botName}
┃ 👨‍💻 *Owner:* ${ownerName}
┃ 📞 *Contact:* +${ownerNumber}
┃
┃ ⏰ *Status:* Active
┃ 🌐 *Version:* 3.2
┃ 📦 *Features:* VCARD + ZIP
┃
╰━━━━━━━━━━━━━━━━━━╯

📌 *Tap buttons below to connect*`;

        // ============ IMPROVED BUTTONS WITH VCARD & ZIP SUPPORT ============
        try {
            await sendInteractiveMessage(sock, chatId, {
                text: ownerText,
                footer: "🌟 MICKEY GLITCH BOT • 2026 🌟",
                image: imageUrl,
                interactiveButtons: [
                    { 
                        name: 'cta_url', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '💬 DIRECT CHAT', 
                            url: waLink 
                        }) 
                    },
                    { 
                        name: 'quick_reply', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📇 SAVE VCARD', 
                            id: 'get_vcard'
                        }) 
                    },
                    { 
                        name: 'quick_reply', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📦 DOWNLOAD ZIP', 
                            id: 'download_zip'  // Button ya kudownload zip
                        }) 
                    },
                    { 
                        name: 'cta_url', 
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📢 JOIN CHANNEL', 
                            url: channelLink 
                        }) 
                    }
                ]
            });
        } catch (interactiveError) {
            console.error('Interactive message failed, using fallback:', interactiveError.message);

            // ============ FALLBACK: Normal buttons ============
            await sock.sendMessage(chatId, {
                text: ownerText,
                footer: "🌟 MICKEY GLITCH BOT • 2026 🌟",
                buttons: [
                    { 
                        buttonId: 'owner_chat', 
                        buttonText: { displayText: '💬 DIRECT CHAT' }, 
                        type: 1 
                    },
                    { 
                        buttonId: 'get_vcard',
                        buttonText: { displayText: '📇 SAVE VCARD' }, 
                        type: 1 
                    },
                    { 
                        buttonId: 'download_zip',  // Button ID ya zip
                        buttonText: { displayText: '📦 DOWNLOAD ZIP' }, 
                        type: 1 
                    },
                    { 
                        buttonId: 'owner_channel', 
                        buttonText: { displayText: '📢 JOIN CHANNEL' }, 
                        type: 1 
                    }
                ],
                viewOnce: true,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363123456789@newsletter',
                        newsletterName: 'MICKEY GLITCH',
                        serverMessageId: 1
                    }
                }
            }, { quoted: m });
        }

    } catch (e) {
        console.error('Owner Error:', e);
        const fallbackText = `╭━━━━━━━━━━━━━━━━━━╮
┃ 👑 *OWNER INFO* 👑
┃━━━━━━━━━━━━━━━━━━
┃
┃ 🤖 *Bot:* ${settings.botName || 'MICKEY GLITCH'}
┃ 👨‍💻 *Owner:* ${settings.botOwner || 'Mickey Developer'}
┃ 📞 *Contact:* wa.me/${settings.ownerNumber || '255612130873'}
┃
┃ 📢 *Channel:*
┃ whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610
┃
╰━━━━━━━━━━━━━━━━━━╯

📇 *Commands:*
.get_vcard - Save owner contact
.get_zip - Download bot source code`;

        await sock.sendMessage(chatId, { 
            text: fallbackText,
            react: { text: '⚠️', key: m?.key }
        }, { quoted: m }).catch(() => {});
    }
}

// Handler for button events (VCARD & ZIP)
async function handleButtonPress(sock, chatId, buttonId, m) {
    if (buttonId === 'get_vcard') {
        const ownerNumber = (settings.ownerNumber || '255612130873').replace(/[^\d]/g, '');
        const ownerName = settings.botOwner || 'Mickey Developer';
        const botName = settings.botName || 'MICKEY GLITCH';
        
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName}
TEL;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

        await sock.sendMessage(chatId, {
            contacts: { 
                displayName: ownerName, 
                contacts: [{ vcard }] 
            }
        }, { quoted: m });
        
        return true;
    }
    
    if (buttonId === 'download_zip') {
        await sendZipFile(sock, chatId, m);
        return true;
    }
    
    return false;
}

module.exports = ownerCommand;
module.exports.handleButtonPress = handleButtonPress;
module.exports.sendZipFile = sendZipFile;