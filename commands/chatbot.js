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
        // Futa memory baada ya dakika 4 (240,000ms) ya ukimya
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

        // Load Memory & Sync
        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: userText });
        memory[chatId].lastUpdate = Date.now();

        // Tunza jumbe 6 tu za mwisho
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(m => `${m.role === 'user' ? 'Yeye' : 'Mimi'}: ${m.content}`)
            .join("\n");

        await sock.sendPresenceUpdate('composing', chatId);

        // --- SYSTEM PROMPT (Kawaida, sio AI, vibe la kishkaji kistaarabu) ---
        const systemPrompt = 
            "Wewe unaitwa Mickey, kijana wa Kitanzania unayeishi Dar. Chati kawaida kama binadamu, " +
            "tumia lugha ya mtaani kiasi (mfano: poa, mzee, freshi, niaje, man, bro, kiongozi) lakini uwe na heshima. " +
            "Usiandike maelezo marefu kama robot. Jibu kifupi na kwa wepesi. Usiseme wewe ni AI wala bot. " +
            "Kama mtu akisema mambo, jibu poa mzee inakuaje. Endeleza stori kulingana na mlichoongea kabla.";

        const fullPrompt = `${systemPrompt}\n\nStori iliyopita:\n${history}\nMimi (Mickey):`;
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const res = await fetch(apiUrl).then(r => r.json()).catch(() => null);
        const reply = res?.response || res?.result || res?.message;

        if (!reply) return;

        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        // Tuma Jibu la Text
        const textMsg = await sock.sendMessage(chatId, { text: reply }, { quoted: message });

        // Tuma Voice Note (Optional: Kama unataka kionekane zaidi ni binadamu)
        try {
            if (reply.length < 150) {
                const voiceApi = `https://api.agatz.xyz/api/voiceover?text=${encodeURIComponent(reply)}&model=ana`;
                const vRes = await axios.get(voiceApi);
                if (vRes.data?.data?.oss_url) {
                    await sock.sendMessage(chatId, {
                        audio: { url: vRes.data.data.oss_url },
                        mimetype: 'audio/mpeg',
                        ptt: true
                    }, { quoted: textMsg });
                }
            }
        } catch {}

    } catch (e) { console.error('Chatbot Handle Error:', e); }
}

// --- TOGGLE COMMAND (.chatbot on/off) ---
async function groupChatbotToggleCommand(sock, chatId, message, args) {
    try {
        const fullArgs = (Array.isArray(args) ? args.join(' ') : args || '').toLowerCase().trim();
        const state = loadState();
        const sender = message.key.participant || message.key.remoteJid;
        const isOwner = message.key.fromMe || await require('../lib/isOwner')(sender, sock, chatId);

        // Private Control
        if (fullArgs.includes('private')) {
            if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Amri hii ni kwa Owner tu.' }, { quoted: message });
            state.private = fullArgs.includes('on');
            saveState(state);
            return sock.sendMessage(chatId, { text: `✅ Chatbot Inbox sasa ipo: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: message });
        }

        // Group Control
        if (chatId.endsWith('@g.us')) {
            const adminInfo = await isAdmin(sock, chatId, sender);
            if (!adminInfo.isSenderAdmin && !isOwner) return sock.sendMessage(chatId, { text: '❌ Admins tu ndio wanaweza kuwasha hapa.' }, { quoted: message });
            
            if (fullArgs === 'on' || fullArgs === 'off') {
                state.perGroup[chatId] = { enabled: (fullArgs === 'on') };
                saveState(state);
                return sock.sendMessage(chatId, { text: `✅ Chatbot Kundi sasa ipo: *${fullArgs.toUpperCase()}*` }, { quoted: message });
            }
        }

        return sock.sendMessage(chatId, { text: '💡 *Mwongozo:*\n.chatbot on|off\n.chatbot private on|off' }, { quoted: message });
    } catch (e) { console.error('Toggle Command Error:', e); }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };
