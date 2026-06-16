const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');

async function getcodeCommand(sock, chatId, message, args) {
    try {
        const fileName = args.join(' ').trim();

        if (!fileName) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Please specify a file!* (Tafadhali taja file!)'
            }, { quoted: message });
        }

        if (fileName.includes('..')) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Invalid path!*'
            }, { quoted: message });
        }

        // Tafuta file kwenye folder la commands (Change 'commands' to your folder name)
        let fileNameWithExt = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
        const filePath = path.join(process.cwd(), 'commands', fileNameWithExt); 

        if (!fs.existsSync(filePath)) {
            return await sock.sendMessage(chatId, {
                text: `❌ *File not found!*\nPath: ${filePath}`
            }, { quoted: message });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);

        // Kama file ni kubwa mno (> 4000 chars), tuma kama Document
        if (fileContent.length > 4000) {
            return await sock.sendMessage(chatId, {
                document: fs.readFileSync(filePath),
                mimetype: 'application/javascript',
                fileName: fileNameWithExt,
                caption: `📄 *File:* ${fileNameWithExt}\n📊 *Size:* ${fileSize}KB\n\n_Code is too long, sent as file._`
            }, { quoted: message });
        }

        // Kama ni fupi, tuma na Copy Button
        return await sendInteractiveMessage(sock, chatId, {
            text: `📄 *File:* ${fileNameWithExt}\n📊 *Size:* ${fileSize}KB\n\n\`\`\`javascript\n${fileContent}\n\`\`\``,
            interactiveButtons: [{
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Code',
                    copy_code: fileContent
                })
            }]
        }, { quoted: message });

    } catch (e) {
        console.error('GetCode Error:', e);
        await sock.sendMessage(chatId, { text: `❌ error: ${e.message}` }, { quoted: message });
    }
}

module.exports = getcodeCommand;
