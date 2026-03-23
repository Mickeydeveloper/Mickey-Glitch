const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const axios = require('axios');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- MSAIDIZI WA KUHIFADHI DATA ---
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

// --- MAIN COMMAND HANDLER (.chatbot on/off) ---
async function groupChatbotToggleCommand(sock, chatId, message, args) {
    try {
        const arg = (Array.isArray(args) ? args[0] : args || '').trim().toLowerCase();
        const state = loadState();

        // 1. Ushughulikiaji wa Command
        if (arg === 'on' || arg === 'off') {
            const isEnable = (arg === 'on');
            
            if (chatId.endsWith('@g.us')) {
                state.perGroup = state.perGroup || {};
                state.perGroup[chatId] = { enabled: isEnable };
            } else {
                state.private = isEnable;
            }

            saveState(state);
            return sock.sendMessage(chatId, { 
                text: `✅ *Chatbot:* Sasa imewashwa (${arg.toUpperCase()}) kwa mafanikio.` 
            }, { quoted: message });
        }

        // 2. Msaada wa matumizi (Usage)
        return sock.sendMessage(chatId, { 
            text: '💡 *Matumizi Sahihi:*\n\n`.chatbot on` - Kuwasha\n`.chatbot off` - Kuzima' 
        }, { quoted: message });

    } catch (e) {
        console.error('Toggle Command Error:', e);
        await sock.sendMessage(chatId, { text: '⚠️ *Kosa:* Imeshindwa kutekeleza amri hii.' });
    }
}

// --- MESSAGE HANDLER (Mickey AI) ---
async function handleChatbotMessage(sock, chatId, message) {
    // Hapa weka ile kodi yako ya AI niliyokupa awali ya Mickey...
    // (Inatakiwa iwepo hapa ili ifanye kazi)
}

// --- SEHEMU MUHIMU ZAIDI (EXPORT) ---
// Hakikisha majina haya yameandikwa kwa usahihi hapa
module.exports = {
    handleChatbotMessage,
    groupChatbotToggleCommand // Hii ndiyo iliyokuwa inagoma
};
