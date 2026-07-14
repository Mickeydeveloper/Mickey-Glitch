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

        // Saka faili ndani ya folda na sub-folda (Recursive scan)
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
        const maxLength = 20000; // Tunakata kidogo isizidi kikomo cha LaTeX render

        const preview = source.length > maxLength
            ? source.slice(0, maxLength) + "\n\n// Output was truncated because it was too long..."
            : source;

        // Maelezo ya ujumbe wetu
        const titleText = `💻 *CODE VIEWER (GLITCH ENGINE)*\n📄 *File:* ${path.basename(targetFile)}\n📊 *Size:* ${(fs.statSync(targetFile).size / 1024).toFixed(2)} KB`;
        
        // 1. Kutengeneza muundo wa LaTeX / Unified Response
        const unified = {
            "response_id": "57be79cf-d384-4122-87cc-5f76d8f32f47",
            "sections": [
                {
                    "view_model": {
                        "primitive": {
                            "text": `${titleText}\n\n{{NIXEL_CODE}}NIXCODE{{/NIXEL_CODE}}`,
                            "inline_entities": [
                                {
                                    "key": "NIXEL_CODE",
                                    "metadata": {
                                        "latex_expression": "```javascript\n" + preview + "\n```",
                                        "font_height": 12,
                                        "padding": 10,
                                        "__typename": "GenAILatexItem"
                                    }
                                }
                            ],
                            "__typename": "GenAIMarkdownTextUXPrimitive"
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                    }
                }
            ]
        };

        // 2. Kutengeneza payload nzima ya ujumbe ghafi
        const content = {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    pluginMetadata: {},
                    richResponseSourcesMetadata: {}
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [
                            {
                                messageType: 2,
                                messageText: `${titleText}\n\n{{NIXEL_CODE}}NIXCODE{{/NIXEL_CODE}}`
                            }
                        ], 
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify(unified), 'utf-8').toString('base64') 
                        },
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedAiBotMessageInfo: {
                                botJid: "0@bot"
                            },
                            forwardOrigin: 4,
                            quotedMessage: message
                        }
                    }
                }
            }
        };

        // 3. Tuma moja kwa moja kwa kutumia relayMessage bila kutumia unifiedResponse ya maktaba
        await sock.relayMessage(chatId, content, {});

    } catch (error) {
        console.error('GetCode LaTeX Error:', error);
        ctx.reply(`❌ *Error:* ${error.message}`);
    }
}

// Export ya chini kabisa ili mfumo wa bot usipate error!
module.exports = getcodeCommand;
