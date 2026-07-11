const fs = require('fs');
const path = require('path');
const { saveCustomCommand } = require('../lib/customCommands');

function resolveCommandPath(commandName) {
    const customPath = path.join(process.cwd(), 'commands', 'custom', `${commandName}.js`);
    const normalPath = path.join(process.cwd(), 'commands', `${commandName}.js`);
    if (fs.existsSync(customPath)) return customPath;
    if (fs.existsSync(normalPath)) return normalPath;
    return null;
}

function loadCommandModule(commandPath) {
    delete require.cache[require.resolve(commandPath)];
    return require(commandPath);
}

function findHandler(commandModule) {
    if (typeof commandModule === 'function') return commandModule;
    if (commandModule && typeof commandModule === 'object') {
        if (typeof commandModule.code === 'function') return commandModule.code;
        if (typeof commandModule.handler === 'function') return commandModule.handler;
        if (typeof commandModule.default === 'function') return commandModule.default;
    }
    return null;
}

async function runCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || senderId?.toString()?.endsWith('@s.whatsapp.net') || false;
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can run commands.' }, { quoted: message });
            return;
        }

        const input = (rawText || fullText || '').toString();
        const match = input.match(/^\.run\s+([a-z0-9_\-]+)\s*(.*)$/is);
        if (!match) {
            await sock.sendMessage(chatId, {
                text: '🛠️ Usage:\n.run <command_name> [args]\n\nExample:\n.run mycommand arg1 arg2'
            }, { quoted: message });
            return;
        }

        const commandName = match[1].trim();
        const argsText = (match[2] || '').trim();
        const args = argsText ? argsText.split(/\s+/) : [];
        const commandPath = resolveCommandPath(commandName);

        if (!commandPath) {
            await sock.sendMessage(chatId, { text: `❌ Command file not found: ${commandName}` }, { quoted: message });
            return;
        }

        let commandModule;
        try {
            commandModule = loadCommandModule(commandPath);
        } catch (loadError) {
            await sock.sendMessage(chatId, { text: `❌ Failed to load command file:\n${loadError?.message || loadError}` }, { quoted: message });
            return;
        }

        const handler = findHandler(commandModule);
        if (!handler) {
            await sock.sendMessage(chatId, { text: `❌ No runnable handler found in ${commandName}.js` }, { quoted: message });
            return;
        }

        try {
            await handler(sock, chatId, message, args, { senderId, commandName, argsText });
            await sock.sendMessage(chatId, { text: `✅ Command .${commandName} ran successfully.` }, { quoted: message });
        } catch (execError) {
            await sock.sendMessage(chatId, { text: `❌ Command .${commandName} failed:\n${execError?.message || execError}` }, { quoted: message });
        }
    } catch (error) {
        console.error('runCommand error:', error);
        await sock.sendMessage(chatId, { text: `❌ Run command failed: ${error?.message || error}` }, { quoted: message });
    }
}

async function cmdaddCommand(sock, chatId, senderId, rawText, message, fullText = '') {
    try {
        const isOwner = message?.key?.fromMe || senderId?.toString()?.endsWith('@s.whatsapp.net') || false;
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Only the owner can add custom commands.' }, { quoted: message });
            return;
        }

        const input = (rawText || fullText || '').toString();
        const match = input.match(/^\.cmdadd\s+([a-z0-9_\-]+)\s*(.*)$/is);
        if (!match) {
            await sock.sendMessage(chatId, {
                text: '🛠️ Usage:\n.cmdadd <command_name> <module_code>\n\nExample:\n.cmdadd button8 module.exports = { ... }'
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

module.exports = {
    cmdaddCommand,
    runCommand,
};
