/**
 * MICKEY CHATBOT - Simplified Natural Conversations
 * Removed: Stats, Quotes, Complex Memory, Rate Limiting, Unnecessary Features
 */

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// ============ PATHS ============
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

let BOT_NUMBER = null;

function setBotNumber(number) {
    BOT_NUMBER = number;
}

function isOwner(userId) {
    if (!BOT_NUMBER) return false;
    return userId.split('@')[0] === BOT_NUMBER.split('@')[0];
}

// ============ DATA FUNCTIONS ============
async function loadState() {
    try {
        const data = await fs.readFile(STATE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { 
        return { groups: {}, dm: false }; 
    }
}

async function saveState(state) {
    try {
        await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
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
        await fs.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
        await fs.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { 
        console.error('Save error:', e); 
    }
}

// ============ HUMAN RESPONSES ============
const responses = {
    greetings: [
        "Oya mambo vipi mazee?",
        "Niaje mkuu, mambo poa?",
        "Yo! Niaje, upo freshi?",
        "Mambo mambo! Unaendeleaje?",
        "Sema mkuu, niko hapa kusikiliza"
    ],
    howAreYou: [
        "Poa tu mazee, shukrani. Na wewe?",
        "Freshi kabisa! Siku inaenda poa, na wewe?",
        "Nzuri tu mkuu. Wewe unaendelea aje?",
        "Safi tu. Wewe mambo gani?",
        "Poa poa. Wewe?"
    ],
    thanks: [
        "Karibu mazee, raha yangu",
        "Ahsante, naomba tena",
        "Karibu sana mkuu",
        "Sawa kabisa rafiki yako"
    ],
    jokes: [
        "Simu haicheki... Ina data chache! 😂",
        "Kwanini tombo anakimbia? Anafuata ndoto zake! 😅",
        "Kwanini nyoka hajisalimii? Anajisikia mnyama! 🐍"
    ],
    advice: [
        "Ukiwa na shida, usibebe mzigo peke yako",
        "Maisha ni mafupi mazee, furahia kila dakika",
        "Watu watasema mengi, wewe fanya yako tu"
    ],
    love: [
        "Ah mapenzi! Fanya moyo wako useme",
        "Mapenzi si mchezo mkuu. Hakikisha unampata anayekufaa",
        "Moyo unasema nini? Fanya hivyo, usiogope"
    ],
    work: [
        "Endelea kujituma mazee. Bidii yako itakupeleka mbali",
        "Kazi ni nzuri, lakini pumzika pia",
        "Ukiwa na nidhamu, mafanikio yatakujia"
    ],
    problem: [
        "Usijali mazee, kila tatizo lina suluhisho",
        "Nimekuelewa. Wakati mgumu hupita",
        "Shida ni sehemu ya maisha. Usikate tamaa"
    ],
    dontKnow: [
        "Sijui mazee, siyo eneo langu",
        "Hapo nimeshindwa mkuu, samahani",
        "Samahani, sijui hilo"
    ],
    goodbye: [
        "Kwaheri mazee, tutaonana! 👋",
        "Bye mkuu, kesho! 😎",
        "Later mazee, nitarudi!"
    ]
};

function getResponse(category) {
    const list = responses[category] || responses.dontKnow;
    return list[Math.floor(Math.random() * list.length)];
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Habari za asubuhi mazee! ☀️";
    if (hour < 18) return "Habari za mchana mkuu! 🌤️";
    return "Habari za jioni mazee! 🌙";
}

// ============ DETECT INTENT ============
function detectIntent(text, userName) {
    const lower = text.toLowerCase().trim();

    // Greetings
    if (lower.match(/^(mambo|vipi|niaje|sema|yo|hi|hello|hey|sasa|habari|hujambo|ujambo)$/i)) {
        return 'greetings';
    }

    // How are you
    if (lower.match(/^(habari|how are you|unaendelea aje|poa|fresh|hujambo|ujambo|mambo poa)/i)) {
        return 'howAreYou';
    }

    // Thanks
    if (lower.match(/^(asante|thanks|thank you|shukran|ahsante|karibu)/i)) {
        return 'thanks';
    }

    // Jokes
    if (lower.match(/(joke|utani|cheka|funny|comedy|aniambie utani)/i)) {
        return 'jokes';
    }

    // Advice/Help
    if (lower.match(/(advice|ushauri|nisaidie|shida|tatizo|help|nasaha)/i)) {
        return 'advice';
    }

    // Love
    if (lower.match(/(mapenzi|love|boyfriend|girlfriend|crush|mpenzi|pendo|nampenda|tunapendana)/i)) {
        return 'love';
    }

    // Work/Studies
    if (lower.match(/(kazi|work|school|shule|job|studies|masomo|biashara|kazi ngumu)/i)) {
        return 'work';
    }

    // Problems
    if (lower.match(/(problem|tatizo|shida|mgumu|nimeshinda|challenging|ngumu)/i)) {
        return 'problem';
    }

    // Goodbye
    if (lower.match(/(kwaheri|bye|goodbye|tutaonana|later|ninaondoka|nawaacha)/i)) {
        return 'goodbye';
    }

    // Short messages
    if (text.length < 3) {
        return 'greetings';
    }

    return null;
}

// ============ EXTRACT TEXT ============
function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        return (
            msg.conversation || 
            msg.extendedTextMessage?.text || 
            msg.imageMessage?.caption || 
            msg.videoMessage?.caption || 
            msg.buttonsResponseMessage?.selectedDisplayText ||
            msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
            ''
        ).trim();
    } catch (e) { 
        return ''; 
    }
}

// ============ MAIN CHATBOT ============
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        // Set bot number
        if (!BOT_NUMBER && sock.user) {
            setBotNumber(sock.user.id);
        }

        const text = userText || extractText(m);
        if (!text) return;

        const userName = m.pushName || 'Mshkaji';
        const senderId = m.key.remoteJid?.split('@')[0] || '';
        const isGroup = chatId.endsWith('@g.us');

        // Check if chatbot is enabled
        const state = await loadState();
        let enabled = false;
        if (isGroup) {
            enabled = state.groups?.[chatId]?.enabled || false;
        } else {
            enabled = state.dm || false;
        }

        // Only owner can use commands when disabled
        const isCommand = text.startsWith('.') || text.startsWith('!');
        if (!enabled && isCommand && !isOwner(senderId)) {
            return;
        }

        // Handle .chatbot command
        if (text.startsWith('.chatbot')) {
            return await handleCommand(sock, chatId, m, text);
        }

        // Skip if not enabled
        if (!enabled) return;

        // Show typing
        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        // Load memory (simple)
        let memory = await loadMemory();
        if (!memory[chatId]) memory[chatId] = [];
        
        // Keep last 4 messages
        if (memory[chatId].length > 4) {
            memory[chatId] = memory[chatId].slice(-4);
        }

        // Detect intent
        const intent = detectIntent(text, userName);
        if (intent) {
            const reply = getResponse(intent);
            memory[chatId].push({ user: text, bot: reply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: reply }, { quoted: m });
            return;
        }

        // New conversation greeting
        if (memory[chatId].length === 0) {
            const greeting = getTimeGreeting();
            memory[chatId].push({ user: text, bot: greeting });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: greeting }, { quoted: m });
            return;
        }

        // API call for complex questions
        const history = memory[chatId]
            .map(msg => `${msg.user} asked: ${msg.user}`)
            .join('\n');

        const prompt = `Wewe ni Mickey, mtu wa kawaida kutoka Tanzania.
Usiseme kamwe kuwa wewe ni AI, robot, chatbot, au program.
Ongea kwa Kiswahili cha mitaani kama mtu halisi.
Majibu mafupi sana (sentensi 1-3 tu).
Ukishindwa jibu, sema "Sijui mazee".

Historia:
${history}

${userName}: ${text}
Mickey:`;

        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(prompt)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();

        let reply = data?.response || data?.result || data?.message || data?.data || getResponse('dontKnow');

        // Remove AI language
        reply = reply.replace(/I am an AI|I am a chatbot|As an AI|Mimi ni AI|Nimeundwa na|Mimi ni chatbot|Mickey AI/gi, "Mimi ni Mickey");

        // Shorten if too long
        if (reply.length > 200) {
            reply = reply.substring(0, 200) + '...';
        }

        memory[chatId].push({ user: text, bot: reply });
        await saveMemory(memory);

        await sock.sendMessage(chatId, { text: reply }, { quoted: m });

    } catch (e) { 
        console.error('Chatbot Error:', e);
        try {
            await sock.sendMessage(chatId, { text: getResponse('dontKnow') });
        } catch (err) {
            console.error('Send error:', err);
        }
    }
}

// ============ COMMAND HANDLER ============
async function handleCommand(sock, chatId, m, text) {
    try {
        const senderId = m.key.remoteJid?.split('@')[0] || '';
        const userName = m.pushName || 'Mshkaji';
        const isGroup = chatId.endsWith('@g.us');
        const isOwnerUser = isOwner(senderId);

        // Check if owner
        if (!isOwnerUser) {
            return await sock.sendMessage(chatId, { 
                text: `❌ Samahani ${userName}, wewe sio owner wa bot hii.` 
            });
        }

        const args = text.trim().split(/\s+/);
        const sub = args[1]?.toLowerCase();

        const state = await loadState();

        // Enable/Disable Group
        if (sub === 'on' || sub === 'enable') {
            if (isGroup) {
                if (!state.groups) state.groups = {};
                state.groups[chatId] = { enabled: true };
                await saveState(state);
                return await sock.sendMessage(chatId, { 
                    text: `✅ Chatbot imewashwa kwenye group hii! 🟢\n\n💬 Niulize lolote!` 
                });
            } else {
                state.dm = true;
                await saveState(state);
                return await sock.sendMessage(chatId, { 
                    text: `✅ Chatbot imewashwa kwenye DM! 🟢\n\n💬 Niulize lolote!` 
                });
            }
        }

        // Disable Group
        if (sub === 'off' || sub === 'disable') {
            if (isGroup) {
                if (!state.groups) state.groups = {};
                state.groups[chatId] = { enabled: false };
                await saveState(state);
                return await sock.sendMessage(chatId, { 
                    text: `🔴 Chatbot imezimwa kwenye group hii.` 
                });
            } else {
                state.dm = false;
                await saveState(state);
                return await sock.sendMessage(chatId, { 
                    text: `🔴 Chatbot imezimwa kwenye DM.` 
                });
            }
        }

        // Status
        if (sub === 'status') {
            const status = isGroup ? 
                (state.groups?.[chatId]?.enabled ? '🟢 IMEWASHWA' : '🔴 IMEZIMWA') :
                (state.dm ? '🟢 IMEWASHWA' : '🔴 IMEZIMWA');
            
            return await sock.sendMessage(chatId, { 
                text: `📊 *Chatbot Status*\n\n${isGroup ? 'Group' : 'DM'}: ${status}\n\n📝 Tumia:\n.chatbot on - Washa\n.chatbot off - Zima\n.chatbot status - Angalia hali` 
            });
        }

        // Help
        const help = `🤖 *MICKEY CHATBOT*

📌 *Commands (Owner Only):*
.chatbot on - Washa chatbot
.chatbot off - Zima chatbot
.chatbot status - Angalia hali

💬 *Niulize chochote:*
- Mambo vipi?
- Nipe utani
- Nisaidie na ...
- Ninampenda ...
- Nina shida ...

*Niko hapa kuzungumza nawe!* 🎉`;

        return await sock.sendMessage(chatId, { text: help });

    } catch (e) {
        console.error('Command error:', e);
        await sock.sendMessage(chatId, { text: '❌ Error processing command!' });
    }
}

module.exports =  handleChatbotMessage, setBotNumber ;