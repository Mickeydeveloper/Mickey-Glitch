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
    } catch (e) { return { perGroup: {}, private: false }; }
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
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { console.error('❌ Memory Save Err:', e); }
}

function extractText(m) {
    if (!m || !m.message) return '';
    const msg = m.message;
    const text = msg.conversation || 
                 msg.extendedTextMessage?.text || 
                 msg.imageMessage?.caption || 
                 msg.videoMessage?.caption || '';
    return text.trim();
}

// --- 1. MAIN CHATBOT HANDLER (Inaitwa kwenye handleMessages) ---
async function handleChatbotMessage(sock, chatId, m) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const userText = extractText(m);
        if (!userText || userText.startsWith('.')) return; 

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        
        // Check kama imewashwa
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        console.log(`\x1b[36m🤖 [Mickey AI] Processing:\x1b[0m ${userText.substring(0, 40)}`);

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: userText });
        memory[chatId].lastUpdate = Date.now();
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? 'User' : 'Mickey'}: ${msg.content}`)
            .join("\n");

        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(res => setTimeout(res, 2000));

        const systemPrompt = 
            "Wewe unaitwa Mickey, kijana mdogo unayependa kucode mifumo. " +
            "Ongea kishkaji, polite, usitumie maneno kama bro au sister, kuwa kama rafiki. " +
            "Jibu kifupi, usiongee sana kama robot. " +
            "Kama ukiulizwa kuhusu bot, sema inapatikana https://water-billing-292n.onrender.com. " +
            "Kamwe usiseme wewe ni AI; sema wewe ni Mickey. Be chill na endelea na story.";

        const fullPrompt = `${systemPrompt}\n\nSTORI:\n${history}\nMickey:`;
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const res = await fetch(apiUrl).then(r => r.json()).catch(() => null);
        const reply = res?.response || res?.result || res?.message;

        if (!reply) return;

        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        await sock.sendMessage(chatId, { text: reply }, { quoted: m });
        console.log(`\x1b[32m✅ [Mickey AI] Replied to:\x1b[0m ${chatId}`);

    } catch (e) { console.error('❌ Chatbot Err:', e); }
}

// --- 2. TOGGLE COMMAND (Inaitwa kama Dynamic Command) ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = loadState();
        const text = body.toLowerCase();
        
        // Angalia kama ni Owner
        const isOwner = m.key.fromMe; 

        // Private/Inbox Logic
        if (text.includes('private')) {
            if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Owner pekee!' }, { quoted: m });
            state.private = text.includes('on');
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot Private: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: m });
        }

        // Group Logic
        if (chatId.endsWith('@g.us')) {
            state.perGroup[chatId] = { enabled: text.includes('on') };
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot Group: *${text.includes('on') ? 'ON' : 'OFF'}*` }, { quoted: m });
        }

        return sock.sendMessage(chatId, { text: '💡 *Matumizi:*\n.chatbot on/off\n.chatbot private on/off' }, { quoted: m });
    } catch (e) { 
        console.error('❌ Toggle Error:', e); 
    }
}

// Hakikisha jina la execute lipo kwa ajili ya Dynamic Loader yako
module.exports = { 
    handleChatbotMessage, 
    groupChatbotToggleCommand,
    execute: groupChatbotToggleCommand // Hii inasaidia main.js ku-run kama command
};
