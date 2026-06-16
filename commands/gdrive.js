const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

/**
 * Download files from Google Drive using API
 */
async function gdriveCommand(sock, chatId, message, args) {
    try {
        const gdriveUrl = args.join(' ') || message.text?.match(/https:\/\/drive\.google\.com[^\s]*/)?.[0];

        if (!gdriveUrl || !gdriveUrl.includes('drive.google.com')) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Invalid Google Drive link!*\n\n*Usage:* `.gdrive <drive_link>`\n\n*Example:*\n`.gdrive https://drive.google.com/file/d/...'
            }, { quoted: message });
        }

        // Send processing message
        const statusMsg = await sock.sendMessage(chatId, {
            text: '⏳ *Fetching file details...*'
        }, { quoted: message });

        try {
            // Call the Google Drive API endpoint
            const apiUrl = `https://nayan-video-downloader.vercel.app/GDLink?url=${encodeURIComponent(gdriveUrl)}`;
            
            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const apiData = response.data;

            if (!apiData.data?.status) {
                return await sock.sendMessage(chatId, {
                    text: '❌ *Failed to fetch file!*\n\n_The file might be private, deleted, or restricted._'
                }, { quoted: message });
            }

            const fileData = apiData.data.data;
            const downloadUrl = fileData.usercontent || fileData.download_confirm || fileData.download;

            // Get file size
            const headResponse = await axios.head(downloadUrl, { timeout: 10000 });
            const fileSize = parseInt(headResponse.headers['content-length']) || 0;
            const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

            // Check file size limit (100MB max)
            if (fileSize > 100 * 1024 * 1024) {
                return await sock.sendMessage(chatId, {
                    text: `❌ *File too large!*\n\n_Size: ${fileSizeMB}MB (Max: 100MB)_\n\n📥 *Direct Download:*\n${downloadUrl}`
                }, { quoted: message });
            }

            // Update status
            await sock.sendMessage(chatId, {
                text: `⏳ *Downloading...*\n_Size: ${fileSizeMB}MB_`
            }, { quoted: statusMsg });

            // Download file
            const fileBuffer = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            const fileContent = Buffer.from(fileBuffer.data);
            
            // Extract filename from Content-Disposition header or create default
            let filename = 'gdrive-file';
            const contentDisposition = fileBuffer.headers['content-disposition'];
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=(?:(['"])(.*?)\1|([^;\n]*)+)/);
                if (match && (match[2] || match[3])) {
                    filename = match[2] || match[3];
                }
            }

            // Send file
            await sock.sendMessage(chatId, {
                document: fileContent,
                fileName: filename,
                mimetype: fileBuffer.headers['content-type'] || 'application/octet-stream'
            }, { quoted: message });

            // Send success info
            await sock.sendMessage(chatId, {
                text: `✅ *File Downloaded!*

📄 *File:* ${filename}
📊 *Size:* ${fileSizeMB}MB
🆔 *File ID:* ${fileData.file_id}

_Downloaded using MICKEY GLITCH_`
            }, { quoted: message });

        } catch (error) {
            console.error('GDrive Download Error:', error.message);

            // Provide direct link as fallback
            const fileId = gdriveUrl.match(/\/d\/([^/]+)/)?.[1];
            const directLink = fileId ? `https://drive.usercontent.google.com/download?id=${fileId}&confirm=t` : null;

            let errorMsg = `❌ *Download failed!*\n\n_Error: ${error.message}_`;
            
            if (directLink) {
                errorMsg += `\n\n📥 *Try this direct link:*\n${directLink}`;
            }

            await sock.sendMessage(chatId, {
                text: errorMsg
            }, { quoted: message });
        }

    } catch (e) {
        console.error('GDrive Cmd Error:', e);
        await sock.sendMessage(chatId, {
            text: '❌ *Error occurred! (Hitilafu imetokea)*'
        }, { quoted: message });
    }
}

module.exports = gdriveCommand;
module.exports.name = 'gdrive';
module.exports.category = 'DOWNLOAD';
module.exports.description = 'Download files from Google Drive by link';
