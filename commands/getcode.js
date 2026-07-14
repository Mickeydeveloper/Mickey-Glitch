const fs = require("fs");
const path = require("path");
const { AIRich, createCtx } = require("../lib/messageBuilder");

async function getcodeCommand(sock, chatId, message, args) {
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        let query = Array.isArray(args) ? args.join(' ').trim().toLowerCase() : (args || '').toString().trim().toLowerCase();

        if (!query) {
            return await ctx.reply(
                `❌ *Please specify a file!* (Tafadhali taja file!)\nExample: ${ctx.used?.prefix || '.'}getcode menu`
            );
        }

        if (query.endsWith('.js')) {
            query = query.slice(0, -3);
        }

        let targetFile = null;

        const scanDir = (dir) => {
            if (targetFile) return; 
            
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDir(fullPath);
                    continue;
                }

                if (file.toLowerCase() === `${query}.js`) {
                    targetFile = fullPath;
                    return;
                }
            }
        };

        scanDir(path.join(process.cwd(), "commands"));

        if (!targetFile) {
            return await ctx.reply(`❌ *Command "${query}.js" not found!*`);
        }

        const source = fs.readFileSync(targetFile, "utf8");
        const maxLength = 50000;

        // 🔥 Buffer ya picha tupu ya usalama ili kuondoa lile onyo la usalama la WhatsApp
        const safePlaceholderThumb = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

        // 🔥 Hapa tunarudi kwenye ule ule muundo wako mwanzo, bila kuweka method zisizokuwepo
        await new AIRich(sock)
            .setTitle(`📄 ${path.basename(targetFile)}`)
            .addCode(
                "javascript",
                source.length > maxLength
                    ? source.slice(0, maxLength) + "\n\n// Output was truncated because it was too long..."
                    : source
            )
            // Tunapitisha options za usalama ndani ya .send() ili ku-bypass lile onyo
            .send(chatId, {
                quoted: message,
                mimetype: "text/javascript",
                jpegThumbnail: safePlaceholderThumb,
                fileName: path.basename(targetFile)
            });

    } catch (error) {
        console.error('GetCode Error:', error);
        ctx.reply(`❌ *Error:* ${error.message}`);
    }
}

module.exports = getcodeCommand;
