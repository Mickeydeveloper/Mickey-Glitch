const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// ============ CONFIGURATION ============
const OWNER_NUMBERS = ["255612130873"]; // Owner number(s)
const BOT_NAME = "Mickey";

// ============ DATA PATHS ============
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_PATH = path.join(DATA_DIR, 'chatbot.json');
const MEMORY_PATH = path.join(DATA_DIR, 'chatbot_memory.json');

// ============ HELPER FUNCTIONS ============
function isOwner(userId) {
    return userId && OWNER_NUMBERS.includes(userId);
}

function cleanName(userName) {
    if (!userName) return "Mshkaji";
    let clean = userName.replace(/[꧁༺༻꧂*~`|/\\<>()[\]{}]/g, '');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean || "Mshkaji";
}

function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        return msg.conversation || 
               msg.extendedTextMessage?.text || 
               msg.imageMessage?.caption || 
               msg.videoMessage?.caption || 
               msg.buttonsResponseMessage?.selectedDisplayText ||
               '';
    } catch (e) { 
        return ''; 
    }
}

// ============ DATA FUNCTIONS ============
async function loadState() {
    try {
        const data = await fs.readFile(STATE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { 
        return { groups: {}, private: false }; 
    }
}

async function saveState(state) {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) { 
        console.error('Save error:', e); 
    }
}

async function loadMemory() {
    try {
        const data = await fs.readFile(MEMORY_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { 
        return {}; 
    }
}

async function saveMemory(memory) {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { 
        console.error('Save error:', e); 
    }
}

// ============ SIMPLE FALLBACK RESPONSES ============
const fallbackResponses = {
    greetings: [
        "Habari mazee! Upo poa?",
        "Mambo vipi mkuu?",
        "Yo! Niaje rafiki?",
        "Freshi vipi leo?",
        "Sema mazee, mambo?"
    ],
    howAreYou: [
        "Poa tu mazee, na wewe?",
        "Nzuri sana, asante. Wewe mambo?",
        "Safi kabisa! Unaendeleaje?",
        "Freshi tu mkuu, shukrani!"
    ],
    thanks: [
        "Karibu mazee!",
        "Ahsante mkuu!",
        "Raha yangu rafiki!",
        "Karibu tena mazee!"
    ],
    jokes: [
        "Kwanini simu haicheki? Ina data chache! 😂",
        "Nimesikia mkate ana stress... Ana-loaf! 🍞",
        "Kwanini nyoka hajisalimii? Anajisikia mnyama! 🐍",
        "Mbwa anaingia baa... Anaulizwa unywe nini? Anasema 'Woof' 🐶"
    ],
    advice: [
        "Usikate tamaa mazee, kesho ni siku nyingine!",
        "Fanya bidii yako, mafanikio yatakuja!",
        "Pumzika kidogo, usijichoshe sana!",
        "Endelea kujituma mkuu, umejaribu sana!"
    ],
    dontKnow: [
        "Sijui mazee, samahani!",
        "Hapo nimeshindwa mkuu!",
        "Leta swali lingine mazee!",
        "Ngoja nifikirie... Sijui mkuu!"
    ]
};

function getFallbackResponse(category) {
    const responses = fallbackResponses[category] || fallbackResponses.dontKnow;
    return responses[Math.floor(Math.random() * responses.length)];
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Habari za asubuhi";
    if (hour < 18) return "Habari za mchana";
    if (hour < 22) return "Habari za jioni";
    return "Habari za usiku";
}

function getSmartFallback(text, userName) {
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText.match(/^(mambo|vipi|niaje|sema|yo|hi|hello|hey|sasa|mambo vipi)$/i)) {
        return getFallbackResponse('greetings');
    }
    
    if (lowerText.match(/^(habari|how are you|unaendelea aje|poa|fresh|ujambo|hujambo|habari yako)$/i)) {
        return getFallbackResponse('howAreYou');
    }
    
    if (lowerText.match(/^(asante|thanks|thank you|shukran|ahsante|merci)$/i)) {
        return getFallbackResponse('thanks');
    }
    
    if (lowerText.match(/(joke|utani|cheka|funny|comedy|tabasamu|make me laugh)/i)) {
        return getFallbackResponse('jokes');
    }
    
    if (lowerText.match(/(advice|ushauri|nasaha|help|nisaidie|shida|tatizo|problem)/i)) {
        return getFallbackResponse('advice');
    }
    
    if (lowerText.match(/(time|saa ngapi|what time|current time|saa|saa ngapi sasa)/i)) {
        const now = new Date();
        return `Sasa ni ${now.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })} mazee!`;
    }
    
    if (lowerText.match(/(date|tarehe|what date|today|leo|tarehe gani)/i)) {
        const now = new Date();
        return `Leo ni ${now.toLocaleDateString('sw-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} mazee!`;
    }
    
    if (lowerText.length < 3) {
        return getFallbackResponse('greetings');
    }
    
    return null;
}

async function callAIAPI(prompt) {
    try {
        const apis = [
            `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(prompt)}`,
            `https://api.ryzen.code.blog.id/api/ai/gpt?text=${encodeURIComponent(prompt)}`,
            `https://vihangayt.me/tools/gpt4?q=${encodeURIComponent(prompt)}`
        ];
        
        for (const apiUrl of apis) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(apiUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                const data = await response.json();
                let reply = data?.response || data?.result || data?.message || data?.data || data?.reply || data?.answer || null;
                
                if (reply && reply.length > 0) {
                    return reply;
                }
            } catch (e) {
                console.log(`API failed:`, e.message);
                continue;
            }
        }
        return null;
    } catch (e) {
        console.error('API Error:', e);
        return null;
    }
}

// ============ MAIN CHATBOT HANDLER ============
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;
        
        const text = userText || extractText(m);
        if (!text) return;
        
        const senderId = m.key.remoteJid?.split('@')[0] || '';
        const userName = cleanName(m.pushName) || 'Mshkaji';
        const isGroup = chatId.endsWith('@g.us');
        
        const state = await loadState();
        let enabled = false;
        
        if (isGroup) {
            enabled = state.groups?.[chatId] || false;
        } else {
            enabled = state.private || false;
        }
        
        if (!enabled && !text.startsWith('.chatbot') && !isOwner(senderId)) {
            return;
        }
        
        if (text.startsWith('.')) {
            return await groupChatbotToggleCommand(sock, chatId, m, text);
        }
        
        sock.sendPresenceUpdate('composing', chatId).catch(() => {});
        
        const memory = await loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };
        
        memory[chatId].chats.push({ role: "user", content: text, name: userName, time: Date.now() });
        memory[chatId].lastUpdate = Date.now();
        
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();
        
        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : BOT_NAME}: ${msg.content}`)
            .slice(-5)
            .join("\n");
        
        const systemPrompt = `Wewe ni ${BOT_NAME}, rafiki wa kawaida kutoka Tanzania, unazungumza na ${userName}.
        
MUHIMU:
- Wewe si AI, si robot, si chatbot, wewe ni mtu halisi
- Tumia Kiswahili cha kawaida (mazee, mkuu, poa, freshi)
- Jibu kwa ufupi (sentensi 1-3 tu)
- Ukishindwa jibu, sema "Sijui mazee"

Mazungumzo yaliyopita:
${history || "Hakuna mazungumzo ya awali"}

${userName} anasema: ${text}
Jibu kama ${BOT_NAME} (rafiki wa Tanzania):`;

        let reply = await callAIAPI(systemPrompt);
        
        if (!reply) {
            reply = getSmartFallback(text, userName);
            if (!reply) {
                reply = `${getTimeGreeting()} ${userName}! ${getFallbackResponse('greetings')}`;
            }
        } else {
            reply = reply.replace(/(I am an AI|I am a chatbot|As an AI|Mimi ni AI|Mimi ni chatbot|I am a bot)/gi, `Mimi ni ${BOT_NAME} tu`);
            reply = reply.replace(/(AI|Chatbot|Bot|Robot)/gi, BOT_NAME);
            if (reply.length > 300) reply = reply.substring(0, 300) + "...";
        }
        
        memory[chatId].chats.push({ role: "assistant", content: reply });
        await saveMemory(memory);
        
        await sock.sendMessage(chatId, { text: reply }, { quoted: m });
        
    } catch (e) { 
        console.error('Chatbot Error:', e);
        try {
            await sock.sendMessage(chatId, { text: getFallbackResponse('dontKnow') });
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

// ============ COMMAND HANDLER ============
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = await loadState();
        const args = (body || '').trim().split(/\s+/);
        const cmd = args[0]?.toLowerCase().replace('.', '');
        const userName = cleanName(m.pushName) || 'Mshkaji';
        const senderId = m.key.remoteJid?.split('@')[0] || '';
        const isGroup = chatId.endsWith('@g.us');

        // COMMAND: chatbot on/off
        if (cmd === 'chatbot') {
            const action = args[1]?.toLowerCase();
            
            if (!isOwner(senderId)) {
                return await sock.sendMessage(chatId, { 
                    text: `❌ Samahani ${userName}, wewe sio owner wa bot hii!\nOwner: ${OWNER_NUMBERS[0]}` 
                });
            }
            
            if (action === 'on' || action === 'enable') {
                if (isGroup) {
                    state.groups = state.groups || {};
                    state.groups[chatId] = true;
                } else {
                    state.private = true;
                }
                await saveState(state);
                return await sock.sendMessage(chatId, { 
                    text: `✅ ${BOT_NAME} chatbot imewashwa ${isGroup ? 'kwenye group hii' : 'kwenye DM yako'}!\n\nSasa niko hapa kuzungumza nawe mazee!` 
                });
            } 
            else if (action === 'off' || action === 'disable') {
                if (isGroup) {
                    state.groups = state.groups || {};
                    state.groups[chatId] = false;
                } else {
                    state.private = false;
                }
                await saveState(state);
                return await sock.sendMessage(chatId, { 
                    text: `❌ ${BOT_NAME} chatbot imezimwa ${isGroup ? 'kwenye group hii' : 'kwenye DM yako'}!\n\nNitarudi ukinihitaji mazee!` 
                });
            }
            else {
                return await sock.sendMessage(chatId, { 
                    text: `📖 *JINSIA YA KUTUMIA ${BOT_NAME} CHATBOT*

.chatbot on - Niwashe chatbot
.chatbot off - Nizime chatbot
.help - Onyesha help

*UNIULIZE LOLOTE:*
• Mambo vipi?
• Habari?
• Nipe utani
• Nina shida
• Saa ngapi?

*OWNER:* ${OWNER_NUMBERS[0]}` 
                });
            }
        }
        
        // COMMAND: help (default)
        return await sock.sendMessage(chatId, { 
            text: `🤖 *${BOT_NAME} CHATBOT - RAFIKI YAKO*

*COMMANDS:*
.help - Menu hii
.chatbot on - Niwashe chatbot (owner)
.chatbot off - Nizime chatbot (owner)

*UNAWEZA KUNIULIZA:*
• Mambo vipi?
• Habari yako?
• Nipe utani
• Nisaidie
• Saa ngapi?
• Leo tarehe gani?

*OWNER:* ${OWNER_NUMBERS[0]}

Karibu mazee! 🎉` 
        });

    } catch (e) { 
        console.error('Command Error:', e);
        try {
            await sock.sendMessage(chatId, { text: "Samahani, kuna issue kidogo. Jaribu tena!" });
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

// ============ EXPORTS ============
module.exports = { 
    handleChatbotMessage,
    groupChatbotToggleCommand  // Imeongezwa hii
};