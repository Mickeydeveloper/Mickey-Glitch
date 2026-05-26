/**
 * repo.js - Repository Information with Interactive Buttons
 * Shows GitHub repo info with CTA buttons for copy, open URL, and download ZIP
 */
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Get language color emoji
function getLanguageEmoji(language) {
    const emojis = {
        'JavaScript': '🟨',
        'TypeScript': '🔵',
        'Python': '🟦',
        'Java': '☕',
        'Go': '🔵',
        'Rust': '🦀',
        'PHP': '💜',
        'C++': '⚙️',
        'Shell': '💻'
    };
    return emojis[language] || '📝';
}

// Function to download ZIP from GitHub
async function downloadGitHubZip(repoUrl, chatId, sock, message) {
    try {
        // Extract owner and repo from URL
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error('Invalid GitHub URL');
        
        const owner = match[1];
        const repo = match[2];
        const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
        
        // Try master branch if main fails
        let finalZipUrl = zipUrl;
        let branch = 'main';
        
        // Check if main branch exists
        try {
            await axios.head(zipUrl);
        } catch (e) {
            // Try master branch
            const masterZipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;
            try {
                await axios.head(masterZipUrl);
                finalZipUrl = masterZipUrl;
                branch = 'master';
            } catch (e2) {
                throw new Error('Could not find main or master branch');
            }
        }
        
        // Send initial message
        await sock.sendMessage(chatId, {
            text: `📥 *Downloading ${repo}.zip from ${branch} branch...*\n\nPlease wait, this may take a moment.`
        }, { quoted: message });
        
        // Download the zip file
        const response = await axios({
            method: 'GET',
            url: finalZipUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'MickeyBot' }
        });
        
        // Create temp file path
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const zipPath = path.join(tempDir, `${repo}_${Date.now()}.zip`);
        const writeStream = fs.createWriteStream(zipPath);
        
        // Download and save
        await pipeline(response.data, writeStream);
        
        // Get file size
        const stats = fs.statSync(zipPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        // Send the zip file
        await sock.sendMessage(chatId, {
            document: { url: zipPath },
            fileName: `${repo}.zip`,
            mimetype: 'application/zip',
            caption: `✅ *Download Complete!*\n\n📦 *Repository:* ${owner}/${repo}\n📁 *Size:* ${fileSizeMB} MB\n🌿 *Branch:* ${branch}\n\n🔧 *How to use:*\n1. Extract the zip file\n2. Run \`npm install\`\n3. Run \`npm start\``
        }, { quoted: message });
        
        // Delete temp file after sending
        setTimeout(() => {
            fs.unlink(zipPath, (err) => {
                if (err) console.error('Error deleting temp zip:', err);
            });
        }, 60000); // Delete after 1 minute
        
        return true;
        
    } catch (error) {
        console.error('Download ZIP Error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *Failed to download ZIP*\n\nError: ${error.message}`
        }, { quoted: message });
        return false;
    }
}

// Alternative download method using direct link
async function downloadZipAlternative(repoUrl, chatId, sock, message) {
    try {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error('Invalid GitHub URL');
        
        const owner = match[1];
        const repo = match[2];
        
        // Use GitHub's direct download API
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
        
        const response = await axios({
            method: 'GET',
            url: apiUrl,
            responseType: 'stream',
            headers: { 
                'User-Agent': 'MickeyBot',
                'Accept': 'application/vnd.github.v3+json'
            },
            maxRedirects: 5
        });
        
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const zipPath = path.join(tempDir, `${repo}_${Date.now()}.zip`);
        const writeStream = fs.createWriteStream(zipPath);
        
        await pipeline(response.data, writeStream);
        
        const stats = fs.statSync(zipPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        await sock.sendMessage(chatId, {
            document: { url: zipPath },
            fileName: `${repo}.zip`,
            mimetype: 'application/zip',
            caption: `✅ *Download Complete!*\n\n📦 *Repository:* ${owner}/${repo}\n📁 *Size:* ${fileSizeMB} MB\n\n📥 *Use the downloaded file to deploy the bot*`
        }, { quoted: message });
        
        setTimeout(() => {
            fs.unlink(zipPath, (err) => {
                if (err) console.error('Error deleting temp zip:', err);
            });
        }, 60000);
        
        return true;
        
    } catch (error) {
        console.error('Alternative Download Error:', error);
        return false;
    }
}

// Main repo command function
async function repoCommand(sock, chatId, message) {
    if (!sock || !chatId) return;

    try {
        // Send loading reaction
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        // Fetch repository data
        const repoRes = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
            headers: { 'User-Agent': 'MickeyBot' }
        });

        const repo = repoRes.data;

        // Build repository information text (reduced links)
        const repoText = `✨ *${repo.name.toUpperCase()}*\n\n` +
            `👤 *Owner:* ${repo.owner.login}\n` +
            `⭐ *Stars:* ${repo.stargazers_count.toLocaleString()}\n` +
            `🍴 *Forks:* ${repo.forks_count.toLocaleString()}\n` +
            `👁️ *Watchers:* ${repo.watchers_count.toLocaleString()}\n` +
            `🐛 *Open Issues:* ${repo.open_issues_count}\n\n` +
            `${getLanguageEmoji(repo.language)} *Language:* ${repo.language || 'Not specified'}\n` +
            `📜 *License:* ${repo.license?.name || 'N/A'}\n` +
            `📅 *Last Updated:* ${formatDate(repo.updated_at)}\n\n` +
            `📝 *Description:*\n${repo.description || 'No description available'}\n\n` +
            `💡 *Type .menu to see all commands*`;

        // Send interactive message with CTA buttons
        await sendInteractiveMessage(sock, chatId, {
            text: repoText,
            footer: "Mickey Glitch Tech • Powered by Mickey Glitch",
            interactiveButtons: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Repo Link',
                        copy_code: repo.html_url
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 Open Repository',
                        url: repo.html_url
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📦 Download ZIP',
                        id: 'repo_download_zip'
                    })
                }
            ]
        }, { quoted: message });

        // Set up handler for download button
        if (sock.ev) {
            // Store the download function to be called when button is clicked
            if (!global.repoDownloadHandler) {
                global.repoDownloadHandler = async (buttonMessage) => {
                    if (buttonMessage?.message?.buttonsResponseMessage?.selectedButtonId === 'repo_download_zip') {
                        const userJid = buttonMessage.key.remoteJid;
                        const userMessage = buttonMessage;
                        
                        await sock.sendMessage(userJid, { react: { text: '📥', key: userMessage.key } });
                        
                        // Try primary download method
                        let success = await downloadGitHubZip(repo.html_url, userJid, sock, userMessage);
                        
                        // If primary fails, try alternative
                        if (!success) {
                            await sock.sendMessage(userJid, {
                                text: "⚠️ Primary download failed, trying alternative method..."
                            }, { quoted: userMessage });
                            success = await downloadZipAlternative(repo.html_url, userJid, sock, userMessage);
                        }
                        
                        if (!success) {
                            await sock.sendMessage(userJid, {
                                text: "❌ Both download methods failed. Please try again later or download manually from:\n" + repo.html_url
                            }, { quoted: userMessage });
                        }
                    }
                };
                
                // Listen for button responses
                sock.ev.on('messages.upsert', async (chatUpdate) => {
                    const msg = chatUpdate.messages[0];
                    if (msg?.message?.buttonsResponseMessage && global.repoDownloadHandler) {
                        await global.repoDownloadHandler(msg);
                    }
                });
            }
        }

        // Send success reaction
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('Repo Error:', err);

        // Send error message
        await sock.sendMessage(chatId, {
            text: `❌ *Error fetching repo data.*\n\n_${err.message}_`
        }, { quoted: message });

        // Send error reaction
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

// Export download function for external use
module.exports = repoCommand;
module.exports.downloadZip = downloadGitHubZip;
module.exports.downloadZipAlternative = downloadZipAlternative;