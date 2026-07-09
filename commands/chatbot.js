const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const { randomBytes } = require('crypto'); // Inahitajika kwa ajili ya kutengeneza messageSecret ya AI

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- DATA HELPERS ---
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
        return (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '').trim();
    } catch (e) { return ''; }
}

// --- MAIN CHATBOT HANDLER ---
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

        const systemPrompt = `Wewe unaitwa MICKEY, ni developer na C.E.O wa Mickey Glitch . 
        PERSONA: Ongea kishkaji (Tanzanian Slang kiasi kama 'fresh', 'niaje', 'mambo vipi'). USISAHAU: Wewe siyo AI, wewe ni Mickey. Jibu kifupi na kishkaji.
        KNOWLEDGE: Bot ni Mickey Glitch V3, imeundwa na Mickdadi Hamza (Mickey Developer). Inadownload kila kitu na ina AI na una website ya kuuza server kwa ajili ya kuhost bot link yake hii https://mickey-pterodacty.vercel.app ikiwa mtu atataka kujua kuhusu server au akitaka bot.
        RULES: Usitumie 'bro' au 'sister'. Ukikwama, au kukiwa na utata unawajuza ngoja tungu unganishe na mtoa huduma akija atauona ujumbe wako a andike tatizo lake na namba ya simu pi kujiunga na group la support. Be chill.`;

        const fullPrompt = `SYSTEM: ${systemPrompt}\n\nSTORY:\n${history}\n\nUSER: ${userText}\nMICKEY:`;
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const res = await fetch(apiUrl).then(r => r.json());
        const reply = res?.response || res?.result || res?.message;

        if (!reply) return;

        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        // ─── MUUNDO MPYA WA AI RICH UTAMU (AI ICON INJECTOR) ───
        const aiMessage = {
            conversation: reply, // Hapa inabeba lile jibu lililotoka kwenye API ya AI
            messageContextInfo: {
                messageSecret: randomBytes(32),
                supportPayload: JSON.stringify({
                    version: 1,
                    is_ai_message: true,
                    should_show_system_message: true,
                    ticket_id: Date.now().toString()
                })
            }
        };

        // Inatuma jibu ikiwa imegongwa baji la AI chini kwa kutumia relayMessage
        await sock.relayMessage(chatId, aiMessage, {
            additionalNodes: [
                { "attrs": { "biz_bot": "1" }, "tag": "bot" },
                { "attrs": {}, "tag": "biz" }
            ],
            quoted: m
        });

    } catch (e) { 
        console.error('❌ Chatbot Error:', e); 
    }
}

// --- TOGGLE COMMAND (.chatbot on/off) ---
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

        if (firstArg === 'private') {
            const mode = args[1]?.toLowerCase();
            state.private = (mode === 'on');
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot Private Mode: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: m });
        }

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

// --- CORRECT EXPORT SYNTAX ---
module.exports = {
    handleChatbotMessage, 
    groupChatbotToggleCommand
};
