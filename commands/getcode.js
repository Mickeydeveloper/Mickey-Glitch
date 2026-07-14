const fs = require("fs");
const path = require("path");
const { AIRich, createCtx } = require("../lib/messageBuilder"); // Hakikisha njia hii ipo sawa

async function getcodeCommand(sock, chatId, message, args) {
    // 1. Anzisha context (ctx) kutoka kwenye messageBuilder
    const ctx = createCtx(sock, chatId, message, { args });

    try {
        const query = Array.isArray(args) ? args.join(' ').trim().toLowerCase() : (args || '').toString().trim().toLowerCase();

        if (!query) {
            return await ctx.reply(
                `❌ *Please specify a file!* (Tafadhali taja file!)\nExample: .getcmd menu`
            );
        }

        let targetFile = null;

        // Kazi ya kusaka faili ndani ya folda na sub-folda zake (Recursive scan)
        const scanDir = (dir) => {
            if (targetFile) return; // Kama lilishapatikana, sitisha
            
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

        // Anza kusaka kuanzia folda ya commands
        scanDir(path.join(process.cwd(), "commands"));

        if (!targetFile) {
            return await ctx.reply(`❌ *Command "${query}" not found!*`);
        }

        const source = fs.readFileSync(targetFile, "utf8");
        const maxLength = 50000;

        // 🔥 Tunatumia AIRich kutuma kadi ya kodi moja kwa moja bila unifiedResponse
        await new AIRich(sock)
            .setTitle(`📄 ${path.basename(targetFile)}`)
            .addCode(
                "javascript",
                source.length > maxLength
                    ? source.slice(0, maxLength) + "\n\n// Output was truncated because it was too long..."
                    : source
            )
            .send(chatId); // Inatuma moja kwa moja kwenye chat ya sasa

    } catch (error) {
        console.error('GetCode Error:', error);
        ctx.reply(`❌ *Error:* ${error.message}`);
    }
}

// 🔥 Muundo wa export wa chini kama awali kabisa ili kuepuka ile error!
module.exports = getcodeCommand;
