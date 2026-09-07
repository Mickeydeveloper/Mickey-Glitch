const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// Function ya HTML Renderer
async function renderHTML(sock, chatId, msg, args = []) {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    let inputCode = "";

    // Check if message has quoted message
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
    const isQuoted = !!quoted;

    // Get input text
    let text = args.join(' ') || msg?.body || msg?.text || '';

    // If there's a quoted message, use it
    if (isQuoted) {
        const quotedText = quoted?.conversation || 
                          quoted?.extendedTextMessage?.text || 
                          quoted?.imageMessage?.caption ||
                          quoted?.videoMessage?.caption ||
                          quoted?.documentMessage?.caption ||
                          '';
        if (quotedText) {
            inputCode = quotedText;
        }
    }

    // If no quoted text, use the command text
    if (!inputCode && text) {
        inputCode = text;
    }

    // If still no code, try to get from message
    if (!inputCode) {
        inputCode = msg?.body || msg?.text || '';
    }

    if (!inputCode) {
        await sock.sendMessage(target, {
            text: `📝 HTML RENDERER\n━━━━━━━━━━━━━━━━━━━\n⚠️ Tuma HTML code!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.render <html>...</html>\n━━━━━━━━━━━━━━━━━━━\n📎 Or quote a message with code`
        }, { quoted: ctx.msg });
        return false;
    }

    let htmlCode = "";

    // 1. Full HTML document
    const fullHtml = inputCode.match(/(?:<!DOCTYPE html>\s*)?<html[\s\S]*<\/html>/i);
    
    // 2. Code in backticks
    const inBackticks = inputCode.match(/`([\s\S]*?(?:<style|<div|<script|<canvas)[\s\S]*?)`/i);
    
    // 3. HTML blocks
    const rawBlocks = inputCode.match(/(<(?:style|div|script|canvas|svg|h1|p|button|input|form)[\s\S]*<\/(?:style|div|script|canvas|svg|h1|p|button|input|form)>)/i);
    
    // 4. Simple HTML tags
    const simpleTags = inputCode.match(/<([a-z]+)[\s\S]*<\/\1>/i);

    if (fullHtml) {
        htmlCode = fullHtml[0];
    } else if (inBackticks) {
        htmlCode = inBackticks[1];
    } else if (rawBlocks) {
        htmlCode = rawBlocks[0];
    } else if (simpleTags) {
        htmlCode = simpleTags[0];
    } else {
        // If no HTML tags found, wrap the text in a simple div
        htmlCode = `<div style="padding:20px;background:rgba(0,0,0,0.8);border-radius:12px;color:#fff;font-family:Arial,sans-serif;">\n${inputCode}\n</div>`;
    }

    // Wrap if not full HTML
    if (!/<html/i.test(htmlCode)) {
        htmlCode = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:10px}
</style>
</head>
<body>
${htmlCode}
</body>
</html>`;
    }

    const responseId = `render-${Date.now()}-${randomUUID().substr(0, 6)}`;

    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: "",
                botResponseId: responseId
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [
                        {
                            messageType: 2,
                            messageText: "📄 HTML View"
                        }
                    ],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [
                                {
                                    view_model: {
                                        primitive: {
                                            __typename: "GenAIaeacdsnwHtmlPrimitive",
                                            payload: htmlCode,
                                            trusted_sources: ["cylic.dev"]
                                        },
                                        __typename: "GenAISingleLayoutViewModel"
                                    }
                                }
                            ]
                        })).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: "867051314767696@bot"
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };

    try {
        await sock.relayMessage(target, payload, {});
        return true;
    } catch (error) {
        console.error('[render] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `❌ Failed to render HTML\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}\n━━━━━━━━━━━━━━━━━━━\n📌 Try again with valid HTML`
            }, { quoted: ctx.msg });
            return false;
        } catch (sendErr) {
            console.error('[render] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
}

// Command object
const renderCommand = async (sock, chatId, msg, args = []) => {
    return await renderHTML(sock, chatId, msg, args);
};

renderCommand.name = 'render';
renderCommand.aliases = ['html', 'view', 'code'];
renderCommand.category = 'tools';
renderCommand.description = '📄 Render HTML/CSS/JS code as rich message';

module.exports = renderCommand;