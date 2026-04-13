const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios');
const isAdmin = require('../lib/isAdmin');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- MFUMO WA KUREKODI MAZUNGUMZO (MEMORY) ---
function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const now = Date.now();
        let changed = false;
        // Futa memory baada ya dakika 4 (240,000ms) ya ukimya kuzuia AI kuchoka
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
    } catch (e) { console.error('Memory Save Err:', e); }
}

function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8') || '{}');
    } catch (e) { return { perGroup: {}, private: false }; }
}

function saveState(state) {
    try {
        const dir = path.dirname(STATE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) { console.error('State Save Err:', e); }
}

function extractText(m) {
    const msg = m.message;
    if (!msg) return '';
    return (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || '').trim();
}

// --- MAIN CHATBOT HANDLER ---
async function handleChatbotMessage(sock, chatId, message) {
    try {
        if (!chatId || message.key?.fromMe) return;

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        const userText = extractText(message);
        if (!userText) return;

        console.log('\x1b[36m🤖 Chatbot Processing:\x1b[0m', userText.substring(0, 50) + (userText.length > 50 ? '...' : ''));

        // Load Memory & Sync
        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: userText });
        memory[chatId].lastUpdate = Date.now();

        // Tunza jumbe 6 tu za mwisho kwa ajili ya mtiririko
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(m => `${m.role === 'user' ? 'User' : 'Mickey'}: ${m.content}`)
            .join("\n");

        // Natural typing delay (2-3 seconds)
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(resolve => setTimeout(resolve, 2500));

        // --- PROMPT ULIYOIELEKEZA (PERSONALIZED) ---
        const systemPrompt =
            "You are called Mickey, an ordinary young man who does coding to create systems, don't explain yourself too much. " +
            "Chat casually politely (how are you, cool, fresh, smart) don't call people bro or sister be a friend. " +
            "Don't write long explanations like a robot, answer briefly when asked about the bot say it's available on our website which link is https://water-billing-292n.onrender.com. " +
            "Never say you are AI; introduce yourself as Mickey. " +
            "Be chill, don't be too funny to the point of raising doubts. " +
            "Continue the story based on what you talked about above using all languages.";

        const fullPrompt = `${systemPrompt}\n\nSTORI ILIYOPITA:\n${history}\nMimi (Mickey):`;
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const res = await fetch(apiUrl).then(r => r.json()).catch(() => null);
        const reply = res?.response || res?.result || res?.message;

        if (!reply) {
            console.log('\x1b[33m⚠️  Chatbot: No response from API\x1b[0m');
            return;
        }

        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        console.log('\x1b[32m✅ Chatbot Sent:\x1b[0m', reply.substring(0, 50) + (reply.length > 50 ? '...' : ''));

        // Tuma Jibu la Text
        await sock.sendMessage(chatId, { text: reply }, { quoted: message });

    } catch (e) { console.error('\x1b[31m❌ Chatbot Handle Error:\x1b[0m', e); }
}

// --- TOGGLE COMMAND (.chatbot on/off) ---
async function groupChatbotToggleCommand(sock, chatId, message, args) {
    try {
        const fullArgs = (Array.isArray(args) ? args.join(' ') : args || '').toLowerCase().trim();
        const state = loadState();
        const sender = message.key.participant || message.key.remoteJid;
        const isOwner = message.key.fromMe || await require('../lib/isOwner')(sender, sock, chatId);

        // Private / Inbox Control
        if (fullArgs.includes('private')) {
            if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Owner tu ndo anaruhusiwa.' }, { quoted: message });
            state.private = fullArgs.includes('on');
            saveState(state);
            console.log(`\x1b[36m🤖 Chatbot Private Mode:\x1b[0m ${state.private ? '\x1b[32m✅ ON\x1b[0m' : '\x1b[31m❌ OFF\x1b[0m'}`);
            return sock.sendMessage(chatId, { text: `✅ Chatbot Inbox sasa ipo: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: message });
        }

        // Group Control
        if (chatId.endsWith('@g.us')) {
            const adminInfo = await isAdmin(sock, chatId, sender);
            if (!adminInfo.isSenderAdmin && !isOwner) return sock.sendMessage(chatId, { text: '❌ Admins pekee.' }, { quoted: message });
            
            if (fullArgs === 'on' || fullArgs === 'off') {
                state.perGroup[chatId] = { enabled: (fullArgs === 'on') };
                saveState(state);
                console.log(`\x1b[36m🤖 Chatbot Group Mode:\x1b[0m ${fullArgs === 'on' ? '\x1b[32m✅ ON\x1b[0m' : '\x1b[31m❌ OFF\x1b[0m'}`);
                return sock.sendMessage(chatId, { text: `✅ Chatbot Group sasa ipo: *${fullArgs.toUpperCase()}*` }, { quoted: message });
            }
        }

        return sock.sendMessage(chatId, { text: '💡 *Matumizi:*\n.chatbot on/off\n.chatbot private on/off' }, { quoted: message });
    } catch (e) { console.error('\x1b[31m❌ Toggle Command Error:\x1b[0m', e); }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };
