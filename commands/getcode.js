const fs = require("fs");
const path = require("path");
const { AIRich } = require("../lib/messageBuilder"); // Hakikisha path ya AIRich ipo sawa hapa

module.exports = {
    name: "getcmd",
    aliases: ["getc", "source"],
    category: "owner",
    permissions: {
        owner: true
    },

    code: async (ctx) => {
        try {
            const query = ctx.args[0]?.toLowerCase();

            if (!query) {
                return await ctx.reply(
                    `Example:\n${ctx.used.prefix}getcmd menu`
                );
            }

            let targetFile = null;

            // Kazi ya kusaka faili ndani ya folda na sub-folda zake
            const scanDir = (dir) => {
                if (targetFile) return; // Kama lilishapatikana, sitisha kusoma folda zingine
                
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
                return await ctx.reply(
                    tools.msg.info(`Command "${query}" not found.`)
                );
            }

            const source = fs.readFileSync(targetFile, "utf8");
            const maxLength = 50000;

            // 🔥 Hapa tunatumia AIRich kutengeneza kadi ya kodi na kuituma moja kwa moja bila unifiedResponse
            await new AIRich(ctx.core)
                .setTitle(`📄 ${path.basename(targetFile)}`)
                .addCode(
                    "javascript",
                    source.length > maxLength
                        ? source.slice(0, maxLength) + "\n\n// Output was truncated because it was too long..."
                        : source
                )
                .send(ctx._msg.key.remoteJid); // Inatuma moja kwa moja kwenye chat ya sasa

        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
