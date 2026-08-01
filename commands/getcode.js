const fs = require('fs');
const path = require('path');
const { createCtx, AIRich } = require('../lib/messageBuilder');

async function getcodeCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        const query = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

        if (!query) {
            return ctx.reply('❌ Please specify a file! Example: .getcode menu');
        }

        if (query.includes('..')) {
            return ctx.reply('❌ Invalid path!');
        }

        const fileName = query.endsWith('.js') ? query : `${query}.js`;
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
            return ctx.reply(`❌ Command "${query}" not found.`);
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
