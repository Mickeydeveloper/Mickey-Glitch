const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * Get code from command files and display with copy button
 */
async function getcodeCommand(sock, chatId, message, args) {
    try {
        const fileName = args.join(' ').trim();

        if (!fileName) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Please specify a file!*\n\n*Usage:* `.getcode filename.js`\n\n*Examples:*\n`.getcode play.js`\n`.getcode ping.js`\n`.getcode sticker.js`'
            }, { quoted: message });
        }

        // Validate filename - prevent directory traversal
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Invalid filename!* Only file names allowed (no paths)'
            }, { quoted: message });
        }

        // Add .js extension if not present
        let filePath = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
        filePath = path.join(__dirname, filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return await sock.sendMessage(chatId, {
                text: `❌ *File not found!*\n\n📁 Looking for: ${fileName}\n\n*Try:* \`.getcode menu.js\``
            }, { quoted: message });
        }

        // Read file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);

        // Check file size - max 10MB for display
        if (fileSize > 10000) {
            return await sock.sendMessage(chatId, {
                text: `❌ *File too large!*\n\n📊 Size: ${fileSize}KB (Max: 10MB)\n\n_Cannot display large files_`
            }, { quoted: message });
        }

        // Format code display
        const displayText = `\`\`\`javascript\n${fileContent}\n\`\`\``;
        
        // Check message length (WhatsApp limit ~4096)
        if (displayText.length > 4000) {
            // Send truncated version with full code in code block
            const truncated = fileContent.substring(0, 3000) + '\n\n... (truncated) ...';
            
            return await sendInteractiveMessage(sock, chatId, {
                text: `📄 *File:* ${fileName}\n📊 *Size:* ${fileSize}KB\n\n\`\`\`javascript\n${truncated}\n\`\`\``,
                interactiveButtons: [
                    {
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Copy Full Code',
                            copy_code: fileContent
                        })
                    }
                ]
            }, { quoted: message });
        }

        // Send with copy button
        return await sendInteractiveMessage(sock, chatId, {
            text: `📄 *File:* ${fileName}\n📊 *Size:* ${fileSize}KB\n\n${displayText}`,
            interactiveButtons: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Code',
                        copy_code: fileContent
                    })
                }
            ]
        }, { quoted: message });

    } catch (e) {
        console.error('GetCode Cmd Error:', e);
        await sock.sendMessage(chatId, {
            text: '❌ *Error occurred!*\n\n_' + e.message + '_'
        }, { quoted: message });
    }
}

module.exports = getcodeCommand;
module.exports.name = 'getcode';
module.exports.category = 'UTILITY';
module.exports.description = 'Get source code from command files';
