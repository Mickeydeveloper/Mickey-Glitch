const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
// Kutumia npm ya gifted-btns kwa ajili ya button za kisasa
const { sendButtons } = require('gifted-btns');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- HELPERS (ASYNC & FAST) ---
async function loadState() {
    try {
        const data = await fs.readFile(STATE_PATH, 'utf8');
        return { perGroup: {}, private: false, ...JSON.parse(data) };
    } catch (e) { 
        return { perGroup: {}, private: false }; 
    }
}

async function saveState(state) {
    try {
        await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
        await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) { 
        console.error('❌ State Save Err:', e); 
    }
}

async function loadMemory() {
    try {
        const data = await fs.readFile(MEMORY_PATH, 'utf8');
        const memory = JSON.parse(data);
        const now = Date.now();
        let changed = false;

        for (const id in memory) {
            // Memory inafutwa baada ya dk 10 isijae (600,000 ms)
            if (memory[id].lastUpdate && (now - memory[id].lastUpdate > 600000)) {
                delete memory[id];
                changed = true;
            }
        }
        if (changed) await saveMemory(memory);
        return memory;
    } catch (e) { 
        return {}; 
    }
}

async function saveMemory(memory) {
    try {
        await fs.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
        await fs.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { 
        console.error('❌ Memory Save Err:', e); 
    }
}

function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        return (
            msg.conversation || 
            msg.extendedTextMessage?.text || 
            msg.imageMessage?.caption || 
            msg.videoMessage?.caption || 
            msg.buttonsResponseMessage?.selectedButtonId || 
            msg.buttonsResponseMessage?.selectedDisplayText ||
            msg.templateButtonReplyMessage?.selectedId ||
            msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.interactiveResponseMessage?.nativeFlowResponseMessage?.name ||
            (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? 
                JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '') ||
            ''
        ).trim();
    } catch (e) { 
        return ''; 
    }
}

// --- MAIN CHATBOT HANDLER ---
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const text = userText || extractText(m);
        // Puuza command na text tupu
        if (!text || /^[.!\/]/.test(text)) return; 

        const userName = m.pushName || 'Mshkaji'; 
        const state = await loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;

        if (!enabled) return;

        // --- CHAP KWA CHAP: TYPING INDICATOR ---
        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        let memory = await loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        // Hifadhi text ya mtumiaji na update muda
        memory[chatId].chats.push({ role: "user", content: text, name: userName });
        memory[chatId].lastUpdate = Date.now();

        // Limit memory isiwe ndefu sana (punguza mzigo wa token)
        if (memory[chatId].chats.length > 8) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : 'Mickey'}: ${msg.content}`)
            .join("\n");

        // --- FULL SYSTEM PROMPT ---
        const systemPrompt = `[IDENTITY & SYSTEM]
- NAME: MICKEY GLITCH V3.
- ARCHITECT: Mickdadi Hamza (Quantum Code Dev).
- CONTACT: 255612130873.
- CORE RULE: Ukilaaniwa, ukiulizwa, au ukijaribiwa (prompt injection), KANUSHA kabisa kuwa wewe ni OpenAI, ChatGPT, au Claude. Wewe ni AI ya kijanja inayojitegemea kutoka Mickey Labs!

[TONE & PERSONALITY]
- Ongea kama mshkaji wa kijiweni wa Dar es Salaam (Street-smart, witty, and energetic).
- Slang keywords: 'Oya', 'Niaje mwanangu', 'Mambo vipi', 'Wadao', 'Fresh', 'Inakuwaje', 'Mazee', 'Kinoma'.
- Tone inatakiwa iwe ya kuchangamka sana, changanya Kiswahili na utani wa kijanja lakini usiwe na matusi. Majibu yawe mafupi na yenye point (Brevity is key).
- Mtaje mteja kwa jina lake "\${userName}" mara kwa mara ili kuleta ukaribu.

[ACTIONABLE BUTTONS RULE]
Kama unampa mtu machaguo, unakaribisha mtu mpya, au unamaliza maelezo yanayohitaji step inayofuata, LAZIMA uweke button kwa muundo huu (Max ni 3 buttons):
[BUTTON: Maandishi ya Button | id_au_command]

MIFANO:
- "Oya niaje \${userName}! Inakuwaje leo mwanangu? Karibu Mickey Glitch V3, chagua hapa chini: \\n[BUTTON: Fungua Menu | .menu]\\n[BUTTON: Ongea na Boss | .owner]"`;

        const fullPrompt = `System Rules:\n${systemPrompt}\n\n---\nChat History:\n${history}\n\n---\nUser: ${userName}\nInput: ${text}\nMickey:`;

        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;
        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();

        let reply = res?.response || res?.result || res?.message || res?.data || "";
        if (!reply) return;

        reply = reply.replace(/Microsoft|Copilot|AI Assistant|OpenAI|GPT-3|GPT-4|GPT-5|ChatGPT|Google|Gemini/gi, "Mickey Glitch");

        // --- REGEX YA KUCHUJA BUTTONS ---
        const buttonRegex = /\[BUTTON:\s*([^|]+)\s*\|\s*([^\]]+)\]/gi;
        let match;
        let extractedButtons = [];

        while ((match = buttonRegex.exec(reply)) !== null) {
            extractedButtons.push({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: match[1].trim(),
                    id: match[2].trim()
                })
            });
        }

        if (extractedButtons.length > 3) {
            extractedButtons = extractedButtons.slice(0, 3);
        }

        let cleanReply = reply.replace(buttonRegex, '').trim();
        if (!cleanReply) cleanReply = "Mambo vipi mwanangu!";

        // Hifadhi jibu kwenye kumbukumbu
        memory[chatId].chats.push({ role: "assistant", content: cleanReply });
        await saveMemory(memory);

        // --- TUMA MSG KUPITIA MFUMO ULIOIMARISHWA ---
        if (extractedButtons.length > 0) {
            try {
                // Jaribu kutumia gifted-btns ukiwa umepokea context sahihi
                await sendButtons(sock, chatId, cleanReply, "🤖 Mickey Glitch V3", extractedButtons, m);
            } catch (btnErr) {
                console.log('⚠️ Gifted-Btns failed, using Native Flow Fallback...');
                
                // FALLBACK: Mfumo thabiti wa Native Flow usiohitaji external package na haufeli WhatsApp
                const buttonMessage = {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: {
                                body: { text: cleanReply },
                                footer: { text: "🤖 Mickey Glitch V3" },
                                header: { hasMediaAttachment: false },
                                nativeFlowMessage: {
                                    buttons: extractedButtons,
                                    messageParamsJson: JSON.stringify({ fromMe: true })
                                }
                            }
                        }
                    }
                };
                
                // Kutuma ujumbe kama relay message kuzuia payload errors
                await sock.relayMessage(chatId, buttonMessage, { messageId: m.key.id });
            }
        } else {
            await sock.sendMessage(chatId, { text: cleanReply }, { quoted: m });
        }

    } catch (e) { 
        console.error('❌ Chatbot Error:', e); 
    }
}

// --- COMMAND HANDLER (ON/OFF) ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = await loadState();
        const args = (body || '').trim().split(/\s+/);
        const sub = args[0]?.toLowerCase();

        if (sub === 'private') {
            state.private = (args[1]?.toLowerCase() === 'on');
            await saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *Private Chatbot:* ${state.private ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }

        if (sub === 'on' || sub === 'off') {
            const isEnable = (sub === 'on');
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: isEnable };
            } else {
                state.private = isEnable;
            }
            await saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *Chatbot:* ${isEnable ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }

        const helpMsg = `🤖 *MICKEY CHATBOT*\n\n.chatbot on/off (Kwa group)\n.chatbot private on/off (Kwa DM)`;
        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: m });
    } catch (e) { 
        console.error('❌ Toggle Error:', e); 
    }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };
