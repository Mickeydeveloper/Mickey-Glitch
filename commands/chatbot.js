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
        // Hakikisha structure ipo sawa (merge defaults)
        return { perGroup: {}, private: false, ...data };
    } catch (e) { 
        console.error('❌ Load State Error:', e);
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
            // Futa memory baada ya dk 4 (240000ms) ya kutokuwa na activity
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
    } catch (e) {
        console.error('❌ Extract Text Error:', e);
        return '';
    }
}

// --- 1. MAIN CHATBOT HANDLER (Logic ya kujibu text) ---
async function handleChatbotMessage(sock, chatId, m) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const userText = extractText(m);
        // Usijibu kama hakuna text au kama ni command (inaanza na .)
        if (!userText || userText.startsWith('.')) return; 

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');

        // Check kama imewashwa kwa group au private
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        console.log(`\x1b[36m🤖 [Mickey AI] Processing:\x1b[0m ${userText.substring(0, 40)}`);

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: userText });
        memory[chatId].lastUpdate = Date.now();
        
        // Limit context to last 6 messages
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? 'User' : 'Mickey'}: ${msg.content}`)
            .join("\n");

        try {
            await sock.sendPresenceUpdate('composing', chatId);
        } catch (e) {}

        const systemPrompt = 
            "Wewe unaitwa Mickey, wewe ni kama support care ambae unatoa maelezo kuhusu kitu flani pindi ukiulizwa pia unaweza kuwa kama chatbot ya kuchat kawaida kama binadamu. " +
            "Ongea kishkaji, polite, usitumie maneno kama bro au sister, kuwa kama rafiki. " +
            "Jibu kifupi, usiongee sana kama robot. " +
            "Kama ukiulizwa kuhusu bot,  zingatia kutoa majibu kutokana na  https://github.com/Mickeydeveloper/Mickey-Glitch. " +
            "Kamwe usiseme wewe ni AI; sema wewe ni Mickey. Be chill.";

        const fullPrompt = `${systemPrompt}\n\nSTORI:\n${history}\nMickey:`;
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        let res;
        try {
            res = await fetch(apiUrl).then(r => r.json());
        } catch (fetchErr) {
            console.error('❌ API Error:', fetchErr);
            return; 
        }

        const reply = res?.response || res?.result || res?.message;
        if (!reply || typeof reply !== 'string') return;

        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        await sock.sendMessage(chatId, { text: reply }, { quoted: m });
        console.log(`\x1b[32m✅ [Mickey AI] Replied to:\x1b[0m ${chatId}`);

    } catch (e) { 
        console.error('❌ Chatbot Main Err:', e); 
    }
}

// --- 2. TOGGLE COMMAND (Fixed parsing logic) ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = loadState();
        const fullText = (body || '').trim();
        
        // Split text na kuondoa neno la kwanza (.chatbot)
        const args = fullText.split(/\s+/).slice(1); 
        
        const ownerJid = process.env.OWNER_JID || ""; // Weka JID yako hapa kama .env haipo
        const isOwner = m.key.fromMe || m.sender === ownerJid;

        // Kama mtumiaji ameandika .chatbot pekee bila on/off
        if (args.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '💡 *Usage (Matumizi):*\n.chatbot on/off\n.chatbot private on/off' 
            }, { quoted: m });
        }

        const firstArg = args[0].toLowerCase();

        // 1. Private Mode Toggle: .chatbot private on/off
        if (firstArg === 'private') {
            if (!isOwner) return await sock.sendMessage(chatId, { text: '❌ Only owner (admin) can use this!' }, { quoted: m });

            const mode = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(mode)) {
                return await sock.sendMessage(chatId, { text: '💡 Usage: .chatbot private on/off' }, { quoted: m });
            }

            state.private = (mode === 'on');
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot Private Mode: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: m });
        }

        // 2. Standard Toggle (Group au 1-on-1): .chatbot on/off
        if (['on', 'off'].includes(firstArg)) {
            const isGroup = chatId.endsWith('@g.us');
            const modeStatus = (firstArg === 'on');

            if (isGroup) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: modeStatus };
                saveState(state);
                return await sock.sendMessage(chatId, { text: `✅ Chatbot Group: *${modeStatus ? 'ON' : 'OFF'}*` }, { quoted: m });
            } else {
                // Kama ni chat ya kawaida
                state.private = modeStatus;
                saveState(state);
                return await sock.sendMessage(chatId, { text: `✅ Chatbot: *${modeStatus ? 'ON' : 'OFF'}*` }, { quoted: m });
            }
        }

        // Default response kama command haijaeleweka
        await sock.sendMessage(chatId, { text: '💡 *Usage:*\n.chatbot on/off\n.chatbot private on/off' }, { quoted: m });

    } catch (e) { 
        console.error('❌ Toggle Error:', e); 
    }
}

module.exports = { 
    handleChatbotMessage, 
    groupChatbotToggleCommand,
    execute: groupChatbotToggleCommand 
};
