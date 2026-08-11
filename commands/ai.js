/**
 * ai.js - Mickey AI Assistant (Enhanced Fully Integrated Version)
 * Creator: Mickdadi Hamza (Quantum Code Developer)
 */

const axios = require('axios');

const PRIMARY_API = 'https://engez.a7a.online/api/v1/ai/gpt';
const TIMEOUT = 30000;

// ─── MAIN EXECUTION FUNCTION ──────────────────────────────────────────
async function aiCommand(sockOrCtx, chatIdParam, msgParam, argsParam) {
    let sock, chatId, msg, args;

    // Detect Context Object (ctx) vs standard parameters
    if (sockOrCtx && (sockOrCtx.sock || sockOrCtx.core)) {
        sock = sockOrCtx.sock || sockOrCtx.core;
        chatId = sockOrCtx.chatId || sockOrCtx.msg?.key?.remoteJid;
        msg = sockOrCtx.msg || sockOrCtx.quoted;
        args = sockOrCtx.args || [];
    } else {
        sock = sockOrCtx;
        chatId = chatIdParam;
        msg = msgParam;
        args = argsParam;
    }

    // 1. FILTER INPUT TEXT
    const query = Array.isArray(args) ? args.join(' ') : (args || '');

    if (!query.trim()) {
        const usageText = 
            '╭━━━〔 *MICKEY AI* 〕━━━┈⊷\n' +
            '┃\n' +
            '┃ 📝 *Usage:* `.ai [swali lako]`\n' +
            '┃ 💡 *Example:* `.ai mambo vipi?`\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━┈⊷';
        
        if (sockOrCtx.reply) return await sockOrCtx.reply(usageText);
        return await sock.sendMessage(chatId, { text: usageText }, { quoted: msg });
    }

    if (query.length > 5000) {
        const errorText = '⚠️ *Mzee, swali lako ni refu kupita kiasi! Punguza kidogo.*';
        if (sockOrCtx.reply) return await sockOrCtx.reply(errorText);
        return await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    }

    // React while thinking
    await sock.sendMessage(chatId, { react: { text: '🧠', key: msg.key } }).catch(() => {});

    try {
        // 2. SYSTEM PROMPT (IDENTITY & CONTEXT)
        const systemPrompt = `[ROLE]: Wewe ni MICKEY GLITCH V3, genius AI msaidizi uliyetengenezwa na MICKDADI HAMZA (Quantum Code Dev).
[CONTEXT]: Repo yako ipo hapa: https://github.com/Mickeydeveloper/Mickey-Glitch.
[RULES]:
- Ongea kishkaji (Bongo Swahili Slang).
- Jibu yawe mafupi na yenye akili.
- Usijitaje kama AI wa OpenAI au Microsoft.
- Kama ishu ni ngumu, waambie wamcheki Mickdadi (255612130873).`;

        const fullQuery = `${systemPrompt}\n\nUser: ${query}\nAnswer:`;

        let finalReply = null;

        // 3. TRY PRIMARY NEW API FIRST
        try {
            const { data } = await axios.get(PRIMARY_API, {
                params: { q: fullQuery },
                timeout: TIMEOUT
            });

            if (data?.success && data?.response?.success) {
                finalReply = data.response.result?.message || data.response.raw;
            }
        } catch (primaryErr) {
            console.log('⚠️ Primary Engez API failed, switching to backup providers...');
        }

        // 4. FALLBACK SYSTEM (IF PRIMARY API FAILS)
        if (!finalReply) {
            const backupUrls = [
                `https://apiskeith.top/ai/gpt?q=${encodeURIComponent(fullQuery)}`,
                `https://apiskeith.top/ai/copilot?q=${encodeURIComponent(fullQuery)}`,
                `https://apiskeith.top/ai/venice?q=${encodeURIComponent(fullQuery)}`
            ];

            for (const url of backupUrls) {
                try {
                    const res = await axios.get(url, { timeout: 10000 });
                    const tempReply = res.data?.data || res.data?.result || res.data?.response || res.data?.reply;

                    if (tempReply && tempReply.length > 0) {
                        finalReply = tempReply;
                        break;
                    }
                } catch (backupErr) {
                    continue;
                }
            }
        }

        // 5. SEND FINAL RESPONSE
        if (finalReply) {
            // Sanitize identity references
            finalReply = finalReply.replace(/Microsoft|Copilot|OpenAI|GPT-3|GPT-4|ChatGPT|GPT-5\.5/gi, "Mickey Glitch");

            const responseText = 
                `╭━━━━〔 *MICKEY AI* 〕━━━━┈⊷\n` +
                `┃\n` +
                `┃ ${finalReply.trim()}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

            if (sockOrCtx.reply) {
                await sockOrCtx.reply(responseText);
            } else {
                await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
            }

            await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } }).catch(() => {});
        } else {
            throw new Error("ALL_APIS_UNAVAILABLE");
        }

    } catch (e) {
        console.error("AI Error:", e.message);
        const failText = '❌ *Mzee, kijiwe kimeingiliwa na wadudu (Error). Jaribu baadae kidogo au mcheki Mickdadi.*';
        
        if (sockOrCtx.reply) {
            await sockOrCtx.reply(failText);
        } else {
            await sock.sendMessage(chatId, { text: failText }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }).catch(() => {});
    }
}

// ─── EXPORTS (COMMONJS & HANDLER COMPATIBLE) ───────────────────────────
module.exports = {
    name: 'ai',
    aliases: ['gpt', 'chatgpt', 'bot', 'mickey'],
    category: 'ai',
    desc: 'Mickey AI Assistant',
    
    execute: aiCommand,
    run: aiCommand,
    handler: aiCommand,
    aiCommand: aiCommand
};
