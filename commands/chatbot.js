const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios');
const isAdmin = require('../lib/isAdmin');

// Paths
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// ────────────────────────────────────────────────
//          MEMORY & STATE MANAGEMENT
// ────────────────────────────────────────────────
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
    } catch (e) { console.error('Save State Error:', e); }
}

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const now = Date.now();
        let changed = false;
        // AUTO-DELETE: Futa baada ya dakika 4 (240,000ms)
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
    } catch (e) { console.error('Memory Save Error:', e); }
}

async function isEnabledForChat(state, chatId) {
    if (chatId.endsWith('@g.us')) return !!state.perGroup?.[chatId]?.enabled;
    return !!state.private;
}

function extractMessageText(message) {
    const msg = message.message;
    if (!msg) return '';
    return (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || 
            msg.interactiveMessage?.body?.text || msg.templateMessage?.hydratedTemplate?.hydratedContentText || '').trim();
}

// ────────────────────────────────────────────────
//          MAIN CHATBOT HANDLER (MICKEY AI)
// ────────────────────────────────────────────────
async function handleChatbotMessage(sock, chatId, message) {
    try {
        if (!chatId || message.key?.fromMe) return;

        const state = loadState();
        if (!(await isEnabledForChat(state, chatId))) return;

        const userText = extractMessageText(message);
        if (!userText) return;

        // --- MEMORY SYNC (Limit 6 Messages) ---
        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: userText });
        memory[chatId].lastUpdate = Date.now();

        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const historyContext = memory[chatId].chats
            .map(m => `${m.role === 'user' ? 'Mteja' : 'Mickey'}: ${m.content}`)
            .join("\n");

        // Typing Effect
        await sock.sendPresenceUpdate('composing', chatId);

        // --- PROFESSIONAL SYSTEM PROMPT ---
        const systemPrompt = 
            "Wewe unaitwa Mickey, mtaalamu wa mifumo ya teknolojia kutoka Tanzania. " +
            "Tumia lugha ya kitaaluma, sanifu, na yenye heshima. Epuka ucheshi usio na lazima. " +
            "Usiwahi kusema wewe ni AI; jitambulishe kama Mickey. Jibu kwa ufupi na usahihi.";

        const fullPrompt = `${systemPrompt}\n\nKonteksti:\n${historyContext}\nMickey (Jibu Kitaaluma):`;
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const res = await fetch(apiUrl).then(r => r.json()).catch(() => null);
        const replyText = res?.response || res?.result || res?.message;

        if (!replyText) return;

        // Save AI response to memory
        memory[chatId].chats.push({ role: "assistant", content: replyText });
        saveMemory(memory);

        // 1. Send Text
        const textMsg = await sock.sendMessage(chatId, { text: replyText }, { quoted: message });

        // 2. Send Voice (Auto-Professional)
        try {
            if (replyText.length > 5 && replyText.length < 500) {
                const voiceApi = `https://api.agatz.xyz/api/voiceover?text=${encodeURIComponent(replyText)}&model=ana`;
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

    } catch (err) { console.error('Chatbot Error:', err); }
}

// ────────────────────────────────────────────────
//          TOGGLE COMMAND (.chatbot on/off)
// ────────────────────────────────────────────────
async function groupChatbotToggleCommand(sock, chatId, message, args) {
    try {
        const fullArgs = (Array.isArray(args) ? args.join(' ') : args || '').toLowerCase().trim();
        const state = loadState();
        const isOwner = message.key.fromMe || await require('../lib/isOwner')(message.key.participant || chatId, sock, chatId);

        // Handle Private Mode
        if (fullArgs.includes('private')) {
            if (!isOwner) return sock.sendMessage(chatId, { text: 'Owner only.' }, { quoted: message });
            state.private = fullArgs.includes('on');
            saveState(state);
            return sock.sendMessage(chatId, { text: `Chatbot Private sasa hivi ipo: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: message });
        }

        // Handle Group Mode
        if (chatId.endsWith('@g.us')) {
            const adminInfo = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
            if (!adminInfo.isSenderAdmin && !isOwner) return sock.sendMessage(chatId, { text: 'Admins only.' }, { quoted: message });

            if (fullArgs === 'on' || fullArgs === 'off') {
                state.perGroup[chatId] = { enabled: (fullArgs === 'on') };
                saveState(state);
                return sock.sendMessage(chatId, { text: `Chatbot Group sasa hivi ipo: *${fullArgs.toUpperCase()}*` }, { quoted: message });
            }
        }

        return sock.sendMessage(chatId, { text: '💡 *Usage:*\n.chatbot on|off\n.chatbot private on|off' }, { quoted: message });
    } catch (e) { console.error('Toggle Error:', e); }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };
