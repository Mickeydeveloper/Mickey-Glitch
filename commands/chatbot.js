const fs = require('fs');
const path = require('path');
const axios = require('axios');
const settings = require('../settings');
const { randomBytes } = require('crypto');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

const CHATBOT_API_URL = process.env.CHATBOT_API_URL || 'https://prexzyapis.com/ai/ch';
const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY || '';
const CHATBOT_TIMEOUT_MS = Number(process.env.CHATBOT_TIMEOUT_MS || 30000);

// --- DATA HELPERS ---
function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
        return { perGroup: {}, private: false, ...data };
    } catch (e) {
        console.error('❌ Chatbot state load failed:', e.message);
        return { perGroup: {}, private: false };
    }
}

function saveState(state) {
    try {
        const dir = path.dirname(STATE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error('❌ State Save Err:', e);
    }
}

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const now = Date.now();
        let changed = false;

        for (const id in data) {
            if (data[id].lastUpdate && (now - data[id].lastUpdate > 1800000)) {
                delete data[id];
                changed = true;
            }
        }

        if (changed) saveMemory(data);
        return data;
    } catch (e) {
        console.error('❌ Chatbot memory load failed:', e.message);
        return {};
    }
}

function saveMemory(memory) {
    try {
        const dir = path.dirname(MEMORY_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) {
        console.error('❌ Memory Save Err:', e);
    }
}

function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        return (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '').trim();
    } catch (e) {
        return '';
    }
}

function getSenderName(m) {
    const pushName = m?.pushName || m?.message?.pushName;
    if (pushName && pushName.trim()) return pushName.trim();
    const participant = m?.key?.participant || m?.key?.remoteJid;
    if (participant) {
        const namePart = participant.split('@')[0];
        if (namePart && namePart !== 'status' && namePart !== '0') return namePart;
    }
    return 'Mteja';
}

function parseChatbotResponse(apiResult) {
    if (!apiResult || typeof apiResult !== 'object') return null;
    if (apiResult.status !== true && apiResult.statusCode !== 200) return null;
    const candidate = apiResult.response || apiResult.data?.response || apiResult.result?.response;
    if (!candidate) return null;
    return String(candidate).trim();
}

async function requestChatbotReply(prompt, conversationId) {
    const headers = {
        'Content-Type': 'application/json',
        ...(CHATBOT_API_KEY ? { Authorization: `Bearer ${CHATBOT_API_KEY}` } : {})
    };

    const params = {
        q: prompt
    };

    const response = await axios.get(CHATBOT_API_URL, {
        params,
        headers,
        timeout: CHATBOT_TIMEOUT_MS,
        validateStatus: () => true
    });

    if (response.status >= 400) {
        throw new Error(`Chatbot API returned ${response.status}`);
    }

    return response.data;
}

// --- Generate AI Message Structure ---
function generateAIMessageStructure(text) {
    const msg = {
        conversation: text,
        messageContextInfo: {
            messageSecret: randomBytes(32),
            supportPayload: JSON.stringify({
                version: 1,
                is_ai_message: true,
                should_show_system_message: true,
                ticket_id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
            })
        }
    };
    
    return msg;
}

// --- Relay Message with AI Structure ---
async function relayAIMessage(sock, chatId, text, quotedMsg = null) {
    try {
        const aiMessage = generateAIMessageStructure(text);
        
        const additionalNodes = [
            {
                tag: "bot",
                attrs: {
                    "biz_bot": "1"
                }
            },
            {
                tag: "biz",
                attrs: {}
            }
        ];

        await sock.relayMessage(chatId, aiMessage, {
            quoted: quotedMsg,
            additionalNodes
        });

        return true;
    } catch (e) {
        console.error('❌ Relay AI Message Error:', e.message);
        return false;
    }
}

// --- Enhanced Chatbot Handler (Bila Mteja na Saa) ---
async function handleChatbotMessage(sock, chatId, m) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const userText = extractText(m);
        if (!userText || userText.startsWith('.')) return;

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        const botName = settings.botName || settings.botname || 'Nixell';
        const senderName = getSenderName(m);
        console.log(`\x1b[36m🤖 [${botName} AI]:\x1b[0m ${senderName}: ${userText.substring(0, 40)}...`);

        try { await sock.sendPresenceUpdate('composing', chatId); } catch (err) {}

        // Prompt kali na professional
        const fullPrompt = `${userText}`;

        const memory = loadMemory();
        const conversationId = memory[chatId]?.conversation_id || '';

        const apiResult = await requestChatbotReply(fullPrompt, conversationId);
        const reply = parseChatbotResponse(apiResult);

        if (!reply) {
            console.error('❌ Chatbot response empty', JSON.stringify(apiResult));
            return;
        }

        // Update memory
        const updatedMemory = {
            ...memory,
            [chatId]: {
                conversation_id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                lastUpdate: Date.now(),
                lastMessage: userText,
                lastReply: reply
            }
        };
        saveMemory(updatedMemory);

        // Response text - BILA "Mteja" na "Saa"
        const responseText = `${reply}`;

        // Send with AI structure
        await relayAIMessage(sock, chatId, responseText, m);

        return true;
    } catch (e) {
        console.error('❌ Chatbot Error:', e?.message || e);
        return false;
    }
}

// --- Enhanced Toggle Command ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = loadState();
        const args = (body || '').trim().split(/\s+/).slice(1);

        if (args.length === 0) {
            const statusText = `📊 *Hali ya Chatbot*

${chatId.endsWith('@g.us') ? '👥 *Group Mode:* ' + (state.perGroup?.[chatId]?.enabled ? '✅ IMEWASHA' : '❌ IMEZIMA') : '👤 *Private Mode:* ' + (state.private ? '✅ IMEWASHA' : '❌ IMEZIMA')}

💡 *MATUMIZI:*
• .chatbot on/off - Washa/zima chatbot katika group
• .chatbot private on/off - Washa/zima chatbot kwa private chat
• .chatbot status - Angalia hali ya chatbot`;

            return await sock.sendMessage(chatId, { text: statusText }, { quoted: m });
        }

        const firstArg = args[0].toLowerCase();

        if (firstArg === 'status') {
            const statusText = `📊 *Hali ya Chatbot*

👥 *Group Mode:* ${state.perGroup?.[chatId]?.enabled ? '✅ IMEWASHA' : '❌ IMEZIMA'}
👤 *Private Mode:* ${state.private ? '✅ IMEWASHA' : '❌ IMEZIMA'}
💬 *Hali:* ${state.perGroup?.[chatId]?.enabled || state.private ? '🟢 Inafanya kazi' : '🔴 Imezimwa'}`;

            return await sock.sendMessage(chatId, { text: statusText }, { quoted: m });
        }

        if (firstArg === 'private') {
            const mode = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(mode)) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ Tafadhali tumia: .chatbot private on/off' 
                }, { quoted: m });
            }
            
            state.private = mode === 'on';
            saveState(state);
            return await sock.sendMessage(chatId, {
                text: `✅ *Private Chatbot:* ${state.private ? 'IMEZINDWA 🟢' : 'IMEZIMWA 🔴'}`
            }, { quoted: m });
        }

        if (['on', 'off'].includes(firstArg)) {
            const modeStatus = firstArg === 'on';
            
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: modeStatus };
                saveState(state);
                return await sock.sendMessage(chatId, {
                    text: `✅ *Group Chatbot:* ${modeStatus ? 'IMEZINDWA 🟢' : 'IMEZIMWA 🔴'}`
                }, { quoted: m });
            }

            state.private = modeStatus;
            saveState(state);
            return await sock.sendMessage(chatId, {
                text: `✅ *Private Chatbot:* ${modeStatus ? 'IMEZINDWA 🟢' : 'IMEZIMWA 🔴'}`
            }, { quoted: m });
        }

        if (firstArg === 'help') {
            return await sock.sendMessage(chatId, {
                text: `🤖 *Msaada wa Chatbot*

📌 *Amri Zinazopatikana:*
• .chatbot on - Washa chatbot
• .chatbot off - Zima chatbot
• .chatbot private on - Washa private mode
• .chatbot private off - Zima private mode
• .chatbot status - Angalia hali
• .chatbot help - Msaada huu

🔧 *Vipengele:*
• AI smart replies
• Memory ya mazungumzo
• Muundo wa AI message
• Auto-clear memory baada ya dakika 30

💬 *Tuma ujumbe wowote kuanza mazungumzo!*`
            }, { quoted: m });
        }

        return await sock.sendMessage(chatId, {
            text: '❌ Amri isiyo sahihi.\n💡 Tumia .chatbot help kwa msaada'
        }, { quoted: m });
    } catch (e) {
        console.error('❌ Toggle Error:', e?.message || e);
    }
}

// --- Help Function ---
function getHelp() {
    return `🤖 *Nixell AI Chatbot*

📌 *Amri:*
• .chatbot on - Washa chatbot katika group
• .chatbot off - Zima chatbot katika group
• .chatbot private on - Washa private mode
• .chatbot private off - Zima private mode
• .chatbot status - Angalia hali ya chatbot
• .chatbot help - Onyesha msaada huu

🔧 *Vipengele:*
• AI inajibu kwa akili
• Inakumbuka mazungumzo
• Muundo maalum wa AI messages
• Inajibu kwa kiswahili na kiingereza
• Hali ya composing inaonekana

💡 *Tuma ujumbe wowote kuanza mazungumzo na AI!*`;
}

module.exports = {
    name: 'chatbot',
    aliases: ['botchat', 'chat', 'gptchat', 'ai'],
    category: 'ai',
    desc: 'Enable or disable chatbot AI with enhanced features',
    handleChatbotMessage,
    groupChatbotToggleCommand,
    getHelp,
    relayAIMessage,
    generateAIMessageStructure
};