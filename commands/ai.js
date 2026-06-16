const axios = require('axios');

/**
 * ai.js - Mickey AI Assistant (Enhanced Fully Integrated Version)
 * Creator: Mickdadi Hamza (Quantum Code Developer)
 */
const aiCommand = async (sock, chatId, msg, args) => {
    // 1. CHUJA TEXT (ANTI-BUG)
    const query = Array.isArray(args) ? args.join(' ') : args;

    if (!query) {
        return sock.sendMessage(chatId, { 
            text: '╭━━━〔 *MICKEY AI* 〕━━━┈⊷\n┃\n┃ 📝 *Usage:* `.ai [swali lako]`\n┃ 💡 *Example:* `.ai mambo vipi?`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
        }, { quoted: msg });
    }

    // Ulinzi wa urefu wa text kuzuia crash
    if (query.length > 5000) {
        return sock.sendMessage(chatId, { text: '⚠️ *Mzee, swali lako ni refu kupita kiasi! Punguza kidogo.*' }, { quoted: msg });
    }

    // Reaction ya kufikiri
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

        // 3. MULTI-API LIST (FALLBACK SYSTEM)
        const apiUrls = [
            `https://apiskeith.top/ai/gpt?q=${encodeURIComponent(fullQuery)}`,
            `https://apiskeith.top/ai/copilot?q=${encodeURIComponent(fullQuery)}`,
            `https://apiskeith.top/ai/venice?q=${encodeURIComponent(fullQuery)}`
        ];

        let finalReply = null;

        // Loop ya kupita kwenye API mpaka ipatikane inayofanya kazi
        for (const url of apiUrls) {
            try {
                const res = await axios.get(url, { timeout: 10000 }); // Sekunde 10 timeout
                const data = res.data;
                
                // Kunasa jibu kulingana na muundo wa API (data, result, au response)
                let tempReply = data.data || data.result || data.response || data.reply;
                
                if (tempReply && tempReply.length > 0) {
                    finalReply = tempReply;
                    break; // Imepata jibu, toka kwenye loop
                }
            } catch (apiErr) {
                console.log(`⚠️ API ya ${url.split('/')[3]} imegoma, najaribu nyingine...`);
                continue;
            }
        }

        // 4. TUMA JIBU KAMA LIMEPAIKANA
        if (finalReply) {
            // Safisha jibu kama AI amejisahau na kujitaja vibaya
            finalReply = finalReply.replace(/Microsoft|Copilot|OpenAI|GPT-3|GPT-4|ChatGPT/gi, "Mickey Glitch");

            const responseText = 
                `╭━━━━〔 *MICKEY AI* 〕━━━━┈⊷\n` +
                `┃\n` +
                `┃ ${finalReply.trim()}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

            await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } }).catch(() => {});
        } else {
            throw new Error("API_LIMIT_REACHED");
        }

    } catch (e) {
        console.error("AI Error:", e.message);
        await sock.sendMessage(chatId, { 
            text: '❌ *Mzee, kijiwe kimeingiliwa na wadudu (Error). Jaribu baadae kidogo au mcheki Mickdadi.*' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }).catch(() => {});
    }
};

module.exports = aiCommand;
