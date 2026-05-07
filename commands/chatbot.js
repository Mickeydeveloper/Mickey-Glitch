const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

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
            // Futa memory baada ya dk 10 za ukimya ili kuzuia kuchanganya mada
            if (data[id].lastUpdate && (now - data[id].lastUpdate > 600000)) {
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
                     msg.videoMessage?.caption || 
                     msg.buttonsResponseMessage?.selectedButtonId ||
                     msg.listResponseMessage?.singleSelectReply?.selectedRowId || 
                     '';
        return text.trim();
    } catch (e) { return ''; }
}

// --- 1. MAIN CHATBOT HANDLER ---
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const text = userText || extractText(m);
        if (!text || text.startsWith('.') || text.startsWith('!') || text.startsWith('/')) return; 

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');

        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        console.log(`\x1b[36m🤖 [MICKEY AI]: Processing:\x1b[0m ${text}`);

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: text });
        memory[chatId].lastUpdate = Date.now();

        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? 'Mteja' : 'Mickey'}: ${msg.content}`)
            .join("\n");

        try { await sock.sendPresenceUpdate('composing', chatId); } catch (e) {}

        // --- BORESHO LA PROMPT (IDENTITY ENFORCEMENT) ---
        const systemPrompt = `STRICT RULES:
        1. Wewe ni MICKEY GLITCH V3 BOT, sio Microsoft Copilot, sio AI Assistant, wala GPT.
        2. Umengenezwa na MICKDADI HAMZA (Owner).
        3. Ongea kishkaji cha Kitanzania (Sheng/Slang). Tumia maneno kama 'Oya', 'Niaje', 'Safi mwanangu', 'Fresh', 'Mzee baba'.
        4. KAMWE usiseme wewe ni mtambo wa lugha au AI ya kampuni fulani. 
        5. Jibu kwa ufupi na kwa vibe la mtaani lakini uwe na akili (Genius).
        6. Kama huwezi kusaidia kitu, waambie "Mcheki mwanangu Mickdadi (Owner) akusaidie" au "Hiyo imekataa bro".`;

        const fullPrompt = `Roleplay: ${systemPrompt}\n\nChat History:\n${history}\n\nMteja: ${text}\nMickey:`;

        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();

        let reply = res?.response || res?.result || res?.message || res?.data;

        if (!reply || reply.length < 1) return;

        // --- AUTO-CLEANER (Kama AI itajisahau na kusema yeye ni Copilot/Microsoft) ---
        reply = reply.replace(/Microsoft|Copilot|AI Assistant|OpenAI|GPT/gi, "Mickey Glitch Bot");
        
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
        const args = (body || '').trim().split(/\s+/);
        const sub = args[0]?.toLowerCase();

        if (sub === 'private') {
            const mode = args[1]?.toLowerCase();
            state.private = (mode === 'on');
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *Mickey Chatbot Private:* ${state.private ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }

        if (sub === 'on' || sub === 'off') {
            const isEnable = (sub === 'on');
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: isEnable };
            } else {
                state.private = isEnable;
            }
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *Chatbot imewekwa:* ${isEnable ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }

        const helpMsg = `🤖 *MICKEY CHATBOT SETTINGS*\n\n` +
                        `*Kwenye Group:* .chatbot on/off\n` +
                        `*Inbox/Private:* .chatbot private on/off\n\n` +
                        `_Powered by Mickey Infor Technology_`;

        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: m });

    } catch (e) { console.error('❌ Toggle Error:', e); }
}

module.exports = { 
    handleChatbotMessage, 
    groupChatbotToggleCommand,
    name: 'chatbot',
    category: 'main'
};
