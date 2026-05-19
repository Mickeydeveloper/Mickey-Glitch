const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
// Kutumia npm ya gifted-btns kwa ajili ya button za kisasa
const { sendButtons } = require('gifted-btns');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- HELPERS ---
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
            // Futa memory baada ya dk 10 ili isijae sana
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
        
        // Inasoma text za kawaida na aina zote za button (kawaida, interactive, au zile za gifted-btns)
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
    } catch (e) { return ''; }
}

// --- MAIN CHATBOT HANDLER ---
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const text = userText || extractText(m);
        // Puuza kama ni command za kawaida au text tupu
        if (!text || text.startsWith('.') || text.startsWith('!') || text.startsWith('/')) return; 

        const userName = m.pushName || 'Mshkaji'; 

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;

        if (!enabled) return;

        // --- CHAP KWA CHAP: KUTUMA TYPING INDICATOR HARAKA ---
        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        // Hifadhi text ya mtumiaji
        memory[chatId].chats.push({ role: "user", content: text, name: userName });
        memory[chatId].lastUpdate = Date.now();

        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : 'Mickey'}: ${msg.content}`)
            .join("\n");

        // --- FULL SYSTEM PROMPT ---
        const systemPrompt = `[ROLE]: Wewe ni MICKEY GLITCH V3, genius chatbot uliyetengenezwa na Mickdadi Hamza (Quantum Code Dev).
[TARGET]: Unaongea na "${userName}".

[STRICT RULES]:
1. IDENTITY: Ukilaaniwa au ukiulizwa wewe ni nani, kataa kabisa kuwa ChatGPT au OpenAI. Wewe ni Mickey Glitch wa Mickey Labs!
2. PERSONALITY: Ongea kishkaji sana (Tanzanian Slang). Tumia maneno kama 'Oya', 'Niaje', 'Mwanangu', 'Wadao', 'Fresh'.
3. CONTEXT: Mtaje "${userName}" unapoona inafaa ili kuleta vibe la kishkaji kwenye chat.
4. BREVITY: Majibu yawe mafupi, yasiyochosha, straight to the point, na yenye michapo ya kijanja.
5. OWNER: Masuala ya kitalaamu mwelekeze kwa Mickdadi (255612130873).

[BUTTON & OPTIONS RULES]:
Kama unampa mtu machaguo au options za kufanya, au unakaribisha mtu mpya, LAZIMA uandike button mwisho wa jibu lako kwa muundo huu maalum:
[BUTTON: Maandishi ya Button | id_au_command]

MISINGI:
- Kiwango cha juu ni button tatu (3) tu.
- ID inaweza kuwa command ya bot kama (.menu, .owner) au neno lolote la ID.

MIFANO:
Mfano 1 (Mtu akisalimia au akianza chat):
"Oya niaje mwanangu ${userName}! Inakuwaje leo? Karibu Mickey Glitch V3, chagua hapa chini kuendelea:
[BUTTON: Fungua Menu | .menu]
[BUTTON: Ongea na Boss | .owner]"

Mfano 2 (Ukimaliza kujibu na kumpa options):
"Mambo yako safi kabisa mwanangu. Una jingine unataka nikuandalie hapa? Nicheki hapa:
[BUTTON: Menu Kuu | .menu]
[BUTTON: Uliza Swali Jingine | msaada]"`;

        const fullPrompt = `INSTRUCTIONS:\n${systemPrompt}\n\n---\nCHAT_HISTORY:\n${history}\n\n---\nUSER: ${userName}\nINPUT: ${text}\nMICKEY:`;

        // Kushambulia API kwa haraka
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;
        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();

        let reply = res?.response || res?.result || res?.message || res?.data || "";
        if (!reply) return;

        // Auto-cleaner ya majina ya AI za nje
        reply = reply.replace(/Microsoft|Copilot|AI Assistant|OpenAI|GPT-3|GPT-4|ChatGPT/gi, "Mickey Glitch");

        // --- REGEX YA KUCHUJA NA KUGENERATE BUTTONS KUTOKA KWA AI ---
        const buttonRegex = /\[BUTTON:\s*([^|]+)\s*\|\s*([^\]]+)\]/g;
        let match;
        let extractedButtons = [];

        while ((match = buttonRegex.exec(reply)) !== null) {
            extractedButtons.push({
                displayText: match[1].trim(),
                id: match[2].trim()
            });
        }

        // Kusafisha text ili isionyeshe vile vi-code vya mabano kwenye WhatsApp ya mtu
        let cleanReply = reply.replace(buttonRegex, '').trim();

        // Hifadhi jibu lililosafishwa kwenye memory
        memory[chatId].chats.push({ role: "assistant", content: cleanReply });
        saveMemory(memory);

        // --- TUMA MESSAGE KWA KASI ---
        if (extractedButtons.length > 0) {
            // Inatuma kupitia "gifted-btns" mwanangu
            await sendButtons(sock, chatId, cleanReply, "🤖 Mickey Glitch V3", extractedButtons, m);
        } else {
            // Kama hamna button inatuma text ya kawaida
            await sock.sendMessage(chatId, { text: cleanReply }, { quoted: m });
        }

    } catch (e) { 
        console.error('❌ Chatbot Error:', e); 
    }
}

// --- COMMAND HANDLER (ON/OFF) ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = loadState();
        const args = (body || '').trim().split(/\s+/);
        const sub = args[0]?.toLowerCase();

        if (sub === 'private') {
            state.private = (args[1]?.toLowerCase() === 'on');
            saveState(state);
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
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *Chatbot:* ${isEnable ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }

        const helpMsg = `🤖 *MICKEY CHATBOT*\n\n.chatbot on/off (Kwa group)\n.chatbot private on/off (Kwa DM)`;
        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: m });
    } catch (e) { console.error('❌ Toggle Error:', e); }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };
