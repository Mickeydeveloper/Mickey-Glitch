const fs = require('fs');
const path = require('path');
const { createCtx } = require('../lib/messageBuilder');

async function getcodeCommand(sock, chatId, message, args) {
    // 1. Anzisha context (ctx) kutoka kwenye messageBuilder
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        const fileName = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();

        if (!fileName) {
            if (ctx.react) await ctx.react('❌'); // React ya error
            return ctx.reply('❌ *Please specify a file name!* (Tafadhali taja jina la file!)');
        }

        if (fileName.includes('..')) {
            if (ctx.react) await ctx.react('❌');
            return ctx.reply('❌ *Invalid path!* (Njia hii haitambuliki!)');
        }

        let fileNameWithExt = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
        const filePath = path.join(process.cwd(), 'commands', fileNameWithExt);

        if (!fs.existsSync(filePath)) {
            if (ctx.react) await ctx.react('🤷'); // React ya kutopatikana
            return ctx.reply(`❌ *File not found!*\nPath: \`${filePath}\``);
        }

        // 2. Weka react ya kutafuta/kusoma kodi
        if (ctx.react) await ctx.react('🔎');

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
        
        // Kama file ni kubwa sana, tunakata ili lisilete crash/lag kwenye WhatsApp
        const preview = fileContent.length > 3000 ? `${fileContent.slice(0, 3000)}\n\n... (Kodi imebaki, imekatwa kwa usalama)` : fileContent;

        const text = `💻 *CODE VIEWER (GLITCH ENGINE)*\n\n` +
            `📄 *File:* \`${fileNameWithExt}\`\n` +
            `📊 *Size:* \`${fileSize} KB\`\n\n` +
            '```javascript\n' +
            `${preview}\n` +
            '```';

        // 3. Tuma ujumbe kupitia ctx.reply
        await ctx.reply(text);
        
        // 4. React ya kumaliza kazi salama
        if (ctx.react) await ctx.react('✅');

    } catch (e) {
        console.error('GetCode Error:', e);
        if (ctx.react) await ctx.react('🚨'); // React ya dharura
        ctx.reply(`❌ *Error:* ${e.message}`);
    }
}

module.exports = getcodeCommand;
