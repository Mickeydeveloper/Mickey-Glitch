const fs = require('fs');
const path = require('path');
const { createCtx } = require('../lib/messageBuilder');

async function getcodeCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        const fileName = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

        if (!fileName) {
            return ctx.reply('❌ *Please specify a file!* (Tafadhali taja file!)');
        }

        if (fileName.includes('..')) {
            return ctx.reply('❌ *Invalid path!*');
        }

        let fileNameWithExt = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
        const filePath = path.join(process.cwd(), 'commands', fileNameWithExt);

        if (!fs.existsSync(filePath)) {
            return ctx.reply(`❌ *File not found!*\nPath: ${filePath}`);
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
        const preview = fileContent.length > 3000 ? `${fileContent.slice(0, 3000)}\n\n... (trimmed)` : fileContent;

        const text = `💻 *Code Viewer (Glitch Engine)*\n\n` +
            `📄 File: ${fileNameWithExt}\n` +
            `📊 Size: ${fileSize} KB\n\n` +
            '```javascript\n' +
            `${preview}\n` +
            '```';

        return await sock.sendMessage(ctx.chatId, { text }, { quoted: ctx._msg });

    } catch (e) {
        console.error('GetCode Error:', e);
        ctx.reply(`❌ error: ${e.message}`);
    }
}

module.exports = getcodeCommand;
