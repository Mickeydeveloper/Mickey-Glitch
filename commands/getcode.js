const fs = require('fs');
const path = require('path');
const { AIRich, createCtx } = require('../lib/messageBuilder');

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

        // Tafuta file kwenye folder la commands
        let fileNameWithExt = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
        const filePath = path.join(process.cwd(), 'commands', fileNameWithExt); 

        if (!fs.existsSync(filePath)) {
            return ctx.reply(`❌ *File not found!*\nPath: ${filePath}`);
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);

        // 🧠 Kutengeneza Kadi ya AI yenye Code Highlighting (AIRich Layout)
        const richCode = new AIRich(sock)
            .setTitle('💻 Code Viewer (Glitch Engine)')
            .setFooter('Mickey Glitch')
            .addCode('javascript', fileContent) // Inamwaga kodi ikiwa na rangi za ndani ya WhatsApp
            .addTip(`📄 File: ${fileNameWithExt} | 📊 Size: ${fileSize} KB`) // Inaleta kiji-maelezo chini
            .addSuggest(['Msaada → .menu']); // Pill ya haraka

        // Tuma ujumbe ukiwa umetiwa Verified Badge (forwarded: true)
        return await richCode.send(ctx.chatId, { quoted: ctx._msg, forwarded: true });

    } catch (e) {
        console.error('GetCode Error:', e);
        ctx.reply(`❌ error: ${e.message}`);
    }
}

module.exports = getcodeCommand;
