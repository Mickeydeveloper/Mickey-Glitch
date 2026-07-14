const fs = require("fs");
const path = require("path");
const { createCtx } = require("../lib/messageBuilder");

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
        const maxLength = 15000; // Kupunguza urefu kidogo ili isilete lag kwenye simu za kawaida

        const cleanedSource = source.length > maxLength
            ? source.slice(0, maxLength) + "\n\n// Output was truncated because it was too long..."
            : source;

        // 🔥 BADALA YA CARD ILIYOFELI: Tunatengeneza muundo safi wa maandishi ghafi wa kijanja (Raw monospace text) 
        // Hii haiwezi kuleta error ya usalama (security error) kwa mtumiaji yeyote yule
        const formattedCodeMsg = `💻 *CODE VIEWER (GLITCH ENGINE)*\n` +
            `📂 *Path:* \`commands/${path.basename(targetFile)}\`\n` +
            `📊 *Size:* \`${(fs.statSync(targetFile).size / 1024).toFixed(2)} KB\`\n\n` +
            `\`\`\`javascript\n${cleanedSource}\n\`\`\``;

        // Tuma ujumbe wa maandishi ya kodi moja kwa moja bila unifiedResponse na bila card-payload inayozuia kupakua
        await sock.sendMessage(chatId, { text: formattedCodeMsg }, { quoted: message });

    } catch (error) {
        console.error('GetCode Error:', error);
        ctx.reply(`❌ *Error:* ${error.message}`);
    }
}

module.exports = getcodeCommand;
