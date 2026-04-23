const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const moment = require('moment-timezone');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- MSAIDIZI WA DATA (HELPERS) ---
function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
        return { perGroup: {}, private: false, ...data };
    } catch (e) { 
        return { perGroup: {}, private: false }; 
    }
}

function saveState(state) {
    try {
        const dir = path.dirname(STATE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) { console.error('❌ State Save Err:', e); }
}

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const now = Date.now();
        let changed = false;
        for (const id in data) {
            // Memory inafutwa baada ya dk 5 za ukimya
            if (data[id].lastUpdate && (now - data[id].lastUpdate > 300000)) {
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
        const dir = path.dirname(MEMORY_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { console.error('❌ Memory Save Err:', e); }
}

function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        const text = msg.conversation || 
                     msg.extendedTextMessage?.text || 
                     msg.imageMessage?.caption || 
                     msg.videoMessage?.caption || '';
        return text.trim();
    } catch (e) { return ''; }
}

// --- 1. MAIN CHATBOT HANDLER ---
async function handleChatbotMessage(sock, chatId, m) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const userText = extractText(m);
        if (!userText || userText.startsWith('.')) return; 

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        
        if (!enabled) return;

        console.log(`\x1b[36m🤖 [MICKEY AI]:\x1b[0m ${userText.substring(0, 40)}...`);

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: userText });
        memory[chatId].lastUpdate = Date.now();

        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? 'Mteja' : 'Mickey'}: ${msg.content}`)
            .join("\n");

        try { await sock.sendPresenceUpdate('composing', chatId); } catch (e) {}

        // --- SYSTEM PROMPT KALI (Persona Branding) ---
        const systemPrompt = `Wewe unaitwa MICKEY, mshkaji wa karibu na Genius Support wa Mickey Glitch Bot. 
        PERSONA: Ongea kishkaji (Tanzanian Slang kiasi kama 'fresh', 'niaje', 'mambo vipi'). USISAHAU: Wewe siyo AI, wewe ni Mickey. Jibu kifupi na kishkaji.
        KNOWLEDGE: Bot ni Mickey Glitch V3, imeundwa na Mickdadi Hamza (Mickey Developer). Inadownload kila kitu na ina AI.
        RULES: Usitumie 'bro' au 'sister'. Ukikwama, waambie wamchek owner (Mickdadi) au kujiunga na group la support. Be chill.`;

        const fullPrompt = `SYSTEM: ${systemPrompt}\n\nSTORY:\n${history}\n\nUSER: ${userText}\nMICKEY:`;
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const res = await fetch(apiUrl).then(r => r.json());
        const reply = res?.response || res?.result || res?.message;

        if (!reply) return;

        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        await sock.sendMessage(chatId, { text: reply }, { quoted: m });

    } catch (e) { 
        console.error('❌ Chatbot Error:', e); 
    }
}

// --- 2. TOGGLE COMMAND (.chatbot on/off) ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = loadState();
        const args = (body || '').trim().split(/\s+/).slice(1);

        if (args.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *MATUMIZI:* \n.chatbot on/off\n.chatbot private on/off' 
            }, { quoted: m });
        }

        const firstArg = args[0].toLowerCase();

        // Private Mode Toggle
        if (firstArg === 'private') {
            const mode = args[1]?.toLowerCase();
            state.private = (mode === 'on');
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot Private Mode: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: m });
        }

        // Group/Standard Toggle
        if (['on', 'off'].includes(firstArg)) {
            const modeStatus = (firstArg === 'on');
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: modeStatus };
                saveState(state);
                return await sock.sendMessage(chatId, { text: `✅ Chatbot Group: *${modeStatus ? 'ON' : 'OFF'}*` }, { quoted: m });
            } else {
                state.private = modeStatus;
                saveState(state);
                return await sock.sendMessage(chatId, { text: `✅ Chatbot Private: *${modeStatus ? 'ON' : 'OFF'}*` }, { quoted: m });
            }
        }

    } catch (e) { console.error('❌ Toggle Error:', e); }
}

module.exports = { 
    handleChatbotMessage, 
    groupChatbotToggleCommand,
    name: 'chatbot',
    category: 'main',
    execute: groupChatbotToggleCommand 
};
