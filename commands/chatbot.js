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

// --- Enhanced Chatbot Handler (Kama Binadamu) ---
async function handleChatbotMessage(sock, chatId, m) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const userText = extractText(m);
        if (!userText || userText.startsWith('.')) return;

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        const botName = 'Mickeydady'; // Jina tupu la binadamu
        const senderName = getSenderName(m);
        console.log(`\x1b[36m👤 [${botName}]:\x1b[0m ${senderName}: ${userText.substring(0, 40)}...`);

        try { await sock.sendPresenceUpdate('composing', chatId); } catch (err) {}

        // PROMPT KALI KAMA BINADAMU HALISI
        const fullPrompt = `Unajifanya kuwa Mickydady, mwanadamu wa kawaida mwenye tabia za kijamii. Hujibu kama binadamu halisi, sio AI.
        
Taarifa zako:
- Jina: Mickdady
- Mji: Dar es Salaam
- Tabia: Mcheshi, mkarimu, anapenda kucheka, ana staili ya mtaani
- Anajibu kwa lugha ya Kiswahili na Kiingereza iliyochanganywa (Sheng)
- ukiuliza kuhusu bot au pannel utajibu kutokana na uelewa wako wa hizi whatsapp bot za whiskeysocket bailey ikitokea wana uhitaji ndio uwape link hii https://mickey-pterodacty.vercel.app
- Anajibu kwa heshima lakini kwa urahisi kama rafiki
- Hapana anajibu kwa njia ya kiboti au rasmi
- Anapenda kutoa ushauri na kusaidia watu

Sasa wewe ni Mickdady, mwanadamu halisi. Mtumiaji aliyekupigia ni ${senderName}. Ujumbe wake ni: "${userText}"

Jibu kwa staili yako ya kawaida kama binadamu - fupi, rahisi, na kwa tabia yako ya mtaani.`;

        const memory = loadMemory();
        const conversationId = memory[chatId]?.conversation_id || '';

        const apiResult = await requestChatbotReply(fullPrompt, conversationId);
        let reply = parseChatbotResponse(apiResult);

        if (!reply) {
            console.error('❌ Chatbot response empty', JSON.stringify(apiResult));
            // Default reply kama binadamu
            reply = "Mambo vipi bana! Samahani nimekosa kidogo, unaweza kurudia?";
        }

        // Humanize reply - fanya iwe fupi na ya kawaida
        if (reply.length > 500) {
            reply = reply.substring(0, 500) + '...';
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

        // Send kama binadamu - bila header yoyote
        const responseText = reply;

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
            const statusText = `📊 *Chatbot Status*

${chatId.endsWith('@g.us') ? '👥 *Group:* ' + (state.perGroup?.[chatId]?.enabled ? '✅ ON' : '❌ OFF') : '👤 *Private:* ' + (state.private ? '✅ ON' : '❌ OFF')}

💡 *Usage:*
• .chatbot on/off - Toggle chatbot
• .chatbot private on/off - Toggle private mode
• .chatbot status - View status`;

            return await sock.sendMessage(chatId, { text: statusText }, { quoted: m });
        }

        const firstArg = args[0].toLowerCase();

        if (firstArg === 'status') {
            const statusText = `📊 *Chatbot Status*

👥 *Group:* ${state.perGroup?.[chatId]?.enabled ? '✅ ON' : '❌ OFF'}
👤 *Private:* ${state.private ? '✅ ON' : '❌ OFF'}
💬 *Status:* ${state.perGroup?.[chatId]?.enabled || state.private ? '🟢 Active' : '🔴 Disabled'}`;

            return await sock.sendMessage(chatId, { text: statusText }, { quoted: m });
        }

        if (firstArg === 'private') {
            const mode = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(mode)) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ Use: .chatbot private on/off' 
                }, { quoted: m });
            }
            
            state.private = mode === 'on';
            saveState(state);
            return await sock.sendMessage(chatId, {
                text: `✅ *Private Chatbot:* ${state.private ? 'ON 🟢' : 'OFF 🔴'}`
            }, { quoted: m });
        }

        if (['on', 'off'].includes(firstArg)) {
            const modeStatus = firstArg === 'on';
            
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: modeStatus };
                saveState(state);
                return await sock.sendMessage(chatId, {
                    text: `✅ *Group Chatbot:* ${modeStatus ? 'ON 🟢' : 'OFF 🔴'}`
                }, { quoted: m });
            }

            state.private = modeStatus;
            saveState(state);
            return await sock.sendMessage(chatId, {
                text: `✅ *Private Chatbot:* ${modeStatus ? 'ON 🟢' : 'OFF 🔴'}`
            }, { quoted: m });
        }

        if (firstArg === 'help') {
            return await sock.sendMessage(chatId, {
                text: `👤 *Mickeydady Chatbot*

📌 *Commands:*
• .chatbot on - Enable chatbot
• .chatbot off - Disable chatbot
• .chatbot private on - Enable private mode
• .chatbot private off - Disable private mode
• .chatbot status - View status

💬 *Mickeydady replies like a human!*`
            }, { quoted: m });
        }

        return await sock.sendMessage(chatId, {
            text: '❌ Invalid command.\n💡 Use .chatbot help'
        }, { quoted: m });
    } catch (e) {
        console.error('❌ Toggle Error:', e?.message || e);
    }
}

// --- Help Function ---
function getHelp() {
    return `👤 *Mickeydady Chatbot*

📌 *Commands:*
• .chatbot on - Enable chatbot
• .chatbot off - Disable chatbot
• .chatbot private on - Enable private mode
• .chatbot private off - Disable private mode
• .chatbot status - View status

💬 *Mickeydady replies like a real human!*

🔧 *Tabia:*
• Mcheshi na mkarimu
• Anatumia lugha ya mtaani
• Anajibu kwa urafiki
• Sio AI - ni binadamu!`;
}

module.exports = {
    name: 'chatbot',
    aliases: ['botchat', 'chat', 'gptchat', 'ai', 'mickey'],
    category: 'ai',
    desc: 'Mickeydady Chatbot - Inajibu kama binadamu!',
    handleChatbotMessage,
    groupChatbotToggleCommand,
    getHelp,
    relayAIMessage,
    generateAIMessageStructure
};