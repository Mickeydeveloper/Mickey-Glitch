const fs = require('fs');
const path = require('path');
const { createCtx, AIRich } = require('../lib/messageBuilder');

async function getcodeCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        const REQUIRED_PIN = 'Mossi';

        // Tenga PIN na jina la faili
        const pin = args[0];
        const fileNameInput = args.slice(1).join(' ').trim();

        // Angalia kama PIN imewekwa na ni sahihi
        if (!pin || pin !== REQUIRED_PIN) {
            return ctx.reply('❌ PIN sio sahihi au haijawekwa! Matumizi: .getcode Mossi play.js');
        }

        // Angalia kama jina la faili limewekwa
        if (!fileNameInput) {
            return ctx.reply('❌ Tafadhali weka jina la faili! Mfano: .getcode Mossi play.js');
        }

        if (fileNameInput.includes('..')) {
            return ctx.reply('❌ Invalid path!');
        }

        const fileName = fileNameInput.endsWith('.js') ? fileNameInput : `${fileNameInput}.js`;
        const commandsDir = path.join(process.cwd(), 'commands');
        let targetFile = null;

        const scanDir = (dir) => {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDir(fullPath);
                    if (targetFile) return;
                    continue;
                }

                if (file.toLowerCase() === fileName.toLowerCase()) {
                    targetFile = fullPath;
                    return;
                }
            }
        };

        scanDir(commandsDir);

        if (!targetFile) {
            return ctx.reply(`❌ Command "${fileNameInput}" not found.`);
        }

        const source = fs.readFileSync(targetFile, 'utf8');
        const maxLength = 50000;
        const codeBody = source.length > maxLength
            ? source.slice(0, maxLength) + '\n\n// Output was truncated because it was too long...'
            : source;

        await new AIRich(ctx.core)
            .setTitle(`📄 ${path.relative(process.cwd(), targetFile)}`)
            .addCode('javascript', codeBody)
            .send(ctx._msg?.key?.remoteJid || ctx.chatId);

    } catch (e) {
        console.error('GetCode Error:', e);
        await ctx.reply(`❌ error: ${e.message}`);
    }
}

module.exports = getcodeCommand;
