const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios');

// Paths za files
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// ────────────────────────────────────────────────
//          MEMORY MANAGEMENT (6 Messages + Auto-Delete)
// ────────────────────────────────────────────────
function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        
        // Auto-cleanup: Futa mazungumzo yaliyozidi dakika 4 (240,000 ms)
        const now = Date.now();
        let changed = false;
        for (const id in data) {
            if (data[id].lastUpdate && (now - data[id].lastUpdate > 240000)) {
                delete data[id];
                changed = true;
            }
        }
        if (changed) saveMemory(data);
        return data;
    } catch (e) { return {}; }
}

function saveMemory(memory) {
    try {
        const dataDir = path.dirname(MEMORY_PATH);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { console.error('Memory Save Error:', e); }
}

// ────────────────────────────────────────────────
//          STATE SETTINGS
// ────────────────────────────────────────────────
function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8') || '{}');
    } catch (e) { return { perGroup: {}, private: false }; }
}

async function isEnabledForChat(state, chatId) {
    if (chatId.endsWith('@g.us')) return !!state.perGroup?.[chatId]?.enabled;
    return !!state.private;
}

function extractMessageText(message) {
    const msg = message.message;
    if (!msg) return '';
    return (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || '').trim();
}

// ────────────────────────────────────────────────
//          MAIN CHATBOT HANDLER
// ────────────────────────────────────────────────
const DEFAULT_VOICE_MODEL = "ana"; 

async function handleChatbotMessage(sock, chatId, message) {
    try {
        if (!chatId || message.key?.fromMe) return;

        const state = loadState();
        if (!(await isEnabledForChat(state, chatId))) return;

        const userText = extractMessageText(message);
        if (!userText) return;

        // --- UPDATE MEMORY WITH 6 MSG LIMIT ---
        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        // Ongeza ujumbe mpya na muda wa sasa
        memory[chatId].chats.push({ role: "user", content: userText });
        memory[chatId].lastUpdate = Date.now();

        // Punguza ziwe jumbe 6 tu (User 3, AI 3)
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const historyContext = memory[chatId].chats
            .map(m => `${m.role === 'user' ? 'Mteja' : 'Mickey'}: ${m.content}`)
            .join("\n");

        // Typing effect
        await sock.sendPresenceUpdate('composing', chatId);

        // --- PROFESSIONAL SYSTEM PROMPT ---
        const systemPrompt = 
            "Wewe unaitwa Mickey, mtaalamu wa mifumo ya teknolojia kutoka Tanzania. " +
            "Tumia lugha ya kitaaluma, sanifu, na yenye heshima. " +
            "Epuka utani mwingi au ucheshi usio na lazima. " +
            "Toa majibu yaliyofanyiwa utafiti na ya kimantiki. " +
            "Usiwahi kusema wewe ni AI; jitambulishe kama Mickey unapoulizwa. " +
            "Jibu kwa ufupi lakini kwa usahihi wa hali ya juu.";

        const fullPrompt = `${systemPrompt}\n\nKonteksti ya Mazungumzo:\n${historyContext}\nMickey (Jibu Kitaaluma):`;
        const encoded = encodeURIComponent(fullPrompt);

        // API Call
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encoded}`;
        const res = await fetch(apiUrl).then(r => r.json()).catch(() => null);
        
        const replyText = res?.response || res?.result || res?.message;
        if (!replyText) return;

        // Hifadhi jibu la Mickey
        memory[chatId].chats.push({ role: "assistant", content: replyText });
        saveMemory(memory);

        // 1. Send Text
        const textMsg = await sock.sendMessage(chatId, { text: replyText }, { quoted: message });

        // 2. Send Voice (Optional Professional Voice)
        try {
            if (replyText.length > 5 && replyText.length < 400) {
                const voiceApi = `https://api.agatz.xyz/api/voiceover?text=${encodeURIComponent(replyText)}&model=${DEFAULT_VOICE_MODEL}`;
                const vRes = await axios.get(voiceApi);
                if (vRes.data?.data?.oss_url) {
                    await sock.sendMessage(chatId, {
                        audio: { url: vRes.data.data.oss_url },
                        mimetype: 'audio/mpeg',
                        ptt: true
                    }, { quoted: textMsg });
                }
            }
        } catch (vErr) {}

    } catch (err) {
        console.error('Chatbot error:', err);
    }
}

module.exports = { handleChatbotMessage };
