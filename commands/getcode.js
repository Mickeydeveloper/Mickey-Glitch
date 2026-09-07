const fs = require('fs');
const path = require('path');
const { createCtx, AIRich } = require('../lib/messageBuilder');

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getcodeCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        const REQUIRED_PIN = 'Mossi';

        // Accept both `.getcode Mossi play.js` and `.getcode play.js Mossi`.
        const commandArgs = Array.isArray(args) ? args : [];
        const pinIsFirst = commandArgs[0] === REQUIRED_PIN;
        const pinIsLast = commandArgs[commandArgs.length - 1] === REQUIRED_PIN;
        const pin = pinIsFirst || pinIsLast ? REQUIRED_PIN : commandArgs[0];
        const fileNameInput = pinIsFirst
            ? commandArgs.slice(1).join(' ').trim()
            : pinIsLast
                ? commandArgs.slice(0, -1).join(' ').trim()
                : '';

        // Angalia kama PIN imewekwa na ni sahihi
        if (!pin || pin !== REQUIRED_PIN) {
            return ctx.reply('❌ PIN sio sahihi au haijawekwa! Matumizi: .getcode play.js Mossi');
        }

        // Angalia kama jina la faili limewekwa
        if (!fileNameInput) {
            return ctx.reply('❌ Tafadhali weka jina la faili! Mfano: .getcode play.js Mossi');
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

        const targetChatId = ctx._msg?.key?.remoteJid || ctx.chatId;
        const rich = new AIRich(ctx.core)
            .setTitle(`📄 ${path.relative(process.cwd(), targetFile)}`)
            .addText('Preparing source code...', { id: 'code_intro' });

        await rich.send(targetChatId);
        await delay(1200);

        rich.addCode(
            'javascript',
            codeBody,
            { insertAt: 'code_intro', id: 'code1' },
        );
        await rich.sendEdit();
        await delay(1200);

        rich.delete('code_intro');
        await rich.sendEdit();

    } catch (e) {
        console.error('GetCode Error:', e);
        await ctx.reply(`❌ error: ${e.message}`);
    }
}

module.exports = getcodeCommand;
