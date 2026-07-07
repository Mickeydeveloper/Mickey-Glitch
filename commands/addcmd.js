const fs = require('fs');
const path = require('path');
const { saveCustomCommand } = require('../lib/customCommands');

async function addcmdCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || senderId?.toString()?.endsWith('@s.whatsapp.net') || false;
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can add custom commands.' }, { quoted: message });
            return;
        }

        const input = (rawText || fullText || '').toString();
        const match = input.match(/^\.addcmd\s+([a-z0-9_\-]+)\s*(.*)$/is);
        if (!match) {
            await sock.sendMessage(chatId, {
                text: '🛠️ Usage:\n.addcmd <command_name> <module_code>\n\nExample:\n.addcmd button8 module.exports = { ... }'
            }, { quoted: message });
            return;
        }

        const commandName = match[1].trim();
        const sourceCode = (match[2] || '').trim();
        if (!sourceCode) {
            await sock.sendMessage(chatId, { text: '❌ Please provide command source code.' }, { quoted: message });
            return;
        }

        const cleaned = sourceCode
            .replace(/^```(?:js|javascript)?\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        if (!cleaned) {
            await sock.sendMessage(chatId, { text: '❌ Command source is empty.' }, { quoted: message });
            return;
        }

        const targetFile = path.join(process.cwd(), 'commands', 'custom', `${commandName}.js`);
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.writeFileSync(targetFile, cleaned, 'utf8');
        saveCustomCommand(commandName, cleaned);

        await sock.sendMessage(chatId, {
            text: `✅ Custom command saved as .${commandName}\n\nFile: ${path.relative(process.cwd(), targetFile)}`
        }, { quoted: message });
    } catch (error) {
        console.error('addcmd error:', error);
        await sock.sendMessage(chatId, { text: `❌ Failed to add custom command: ${error?.message || error}` }, { quoted: message });
    }
}

module.exports = addcmdCommand;
