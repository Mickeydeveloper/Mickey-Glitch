/**
 * MICKEY CHATBOT - Natural Human-like Conversations
 * Removed: Rate Limiting, Stats, Quotes
 */

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');
const USER_PREFS_PATH = path.join(__dirname, '..', 'data', 'user_prefs.json');
const CUSTOM_RESPONSES_PATH = path.join(__dirname, '..', 'data', 'custom_responses.json');
const REMINDERS_PATH = path.join(__dirname, '..', 'data', 'reminders.json');

// Global variable for bot number (set automatically)
let BOT_NUMBER = null;

// Function to set bot number
function setBotNumber(number) {
    BOT_NUMBER = number;
    console.log(`🤖 Bot number set to: ${BOT_NUMBER}`);
}

// Check if user is owner (bot itself)
function isOwner(userId) {
    if (!BOT_NUMBER) return false;
    const cleanUserId = userId.split('@')[0];
    const cleanBotNumber = BOT_NUMBER.split('@')[0];
    return cleanUserId === cleanBotNumber;
}

// ============ DATA LOAD/SAVE FUNCTIONS ============
async function loadState() {
    try {
        const data = await fs.readFile(STATE_PATH, 'utf8');
        return { perGroup: {}, private: false, ...JSON.parse(data) };
    } catch (e) { 
        return { perGroup: {}, private: false }; 
    }
}

async function saveState(state) {
    try {
        await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
        await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) { 
        console.error('State Save Err:', e); 
    }
}

async function loadMemory() {
    try {
        const data = await fs.readFile(MEMORY_PATH, 'utf8');
        const memory = JSON.parse(data);
        const now = Date.now();
        let changed = false;

        for (const id in memory) {
            if (memory[id].lastUpdate && (now - memory[id].lastUpdate > 600000)) {
                delete memory[id];
                changed = true;
            }
        }
        if (changed) await saveMemory(memory);
        return memory;
    } catch (e) { 
        return {}; 
    }
}

async function saveMemory(memory) {
    try {
        await fs.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
        await fs.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { 
        console.error('Memory Save Err:', e); 
    }
}

async function loadUserPrefs() {
    try {
        const data = await fs.readFile(USER_PREFS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { 
        return {}; 
    }
}

async function saveUserPrefs(prefs) {
    try {
        await fs.mkdir(path.dirname(USER_PREFS_PATH), { recursive: true });
        await fs.writeFile(USER_PREFS_PATH, JSON.stringify(prefs, null, 2));
    } catch (e) { 
        console.error('UserPrefs Save Err:', e); 
    }
}

async function loadCustomResponses() {
    try {
        const data = await fs.readFile(CUSTOM_RESPONSES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { 
        return {}; 
    }
}

async function saveCustomResponses(responses) {
    try {
        await fs.mkdir(path.dirname(CUSTOM_RESPONSES_PATH), { recursive: true });
        await fs.writeFile(CUSTOM_RESPONSES_PATH, JSON.stringify(responses, null, 2));
    } catch (e) { 
        console.error('CustomResponses Save Err:', e); 
    }
}

async function loadReminders() {
    try {
        const data = await fs.readFile(REMINDERS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { 
        return {}; 
    }
}

async function saveReminders(reminders) {
    try {
        await fs.mkdir(path.dirname(REMINDERS_PATH), { recursive: true });
        await fs.writeFile(REMINDERS_PATH, JSON.stringify(reminders, null, 2));
    } catch (e) { 
        console.error('Reminders Save Err:', e); 
    }
}

// ============ HUMAN-LIKE RESPONSES ============
const humanResponses = {
    greetings: [
        "Oya mambo vipi mazee?",
        "Niaje mkuu, mambo poa?",
        "Yo! Niaje, upo freshi?",
        "Mambo mambo! Unaendeleaje?",
        "Sema mkuu, niko hapa kusikiliza"
    ],

    howAreYou: [
        "Poa tu mazee, shukrani. Na wewe mambo?",
        "Freshi kabisa! Siku inaenda poa, na wewe je?",
        "Nzuri tu mkuu, Mungu anipenda. Wewe unaendelea aje?",
        "Safi tu, hakuna story. Wewe mambo gani?",
        "Poa poa nikishinda tu. Wewe?"
    ],

    thanks: [
        "Karibu mazee, raha yangu kabisa",
        "Ahsante kwa shukrani, naomba tena",
        "Poa tu, niko hapa kukusaidia",
        "Karibu sana mkuu",
        "Sawa kabisa, rafiki yako"
    ],

    dontKnow: [
        "Sijui mazee, siyo eneo langu hilo",
        "Hapo nimeshindwa mkuu, samahani",
        "Samahani, sijui hilo. Mengine nikusaidie?",
        "Hapana, sijawahi kusikia hicho",
        "Leta swali lingine, hili nimeshindwa"
    ],

    jokes: [
        "Nimesikia simu haicheki... Ina data chache! 😂",
        "Kwanini tombo anakimbia? Anafuata ndoto zake! 😅",
        "Mwalimu: 'Nipe sentensi na neno matunda'... Matunda yanauzwa sokoni! 💀",
        "Kwanini nyoka hajisalimii? Anajisikia mnyama! 🐍",
        "Unajua kwanini mchele haendi shule? Anachelewa! 🤣"
    ],

    advice: [
        "Ukiwa na shida, usibebe mzigo peke yako. Sema tu na mtu",
        "Maisha ni mafupi mazee, furahia kila dakika",
        "Watu watasema mengi, wewe fanya yako tu",
        "Kupata rafiki wa kweli ni kama dhahabu, usimpoteze",
        "Usilinganishe maisha yako na ya mtu mwingine"
    ],

    love: [
        "Ah mapenzi! Sijui mengi mazee, lakini fanya moyo wako useme",
        "Mapenzi si mchezo mkuu. Hakikisha unampata anayekufaa",
        "Yo! Unazungumzia mapenzi? Usikimbilie, fanya taratibu",
        "Mapenzi yana changamoto zake. Subiri uwe tayari",
        "Moyo unasema nini? Fanya hivyo, usiogope"
    ],

    work: [
        "Endelea kujituma mazee. Bidii yako itakupeleka mbali",
        "Kazi ni nzuri, lakini pumzika pia. Usijichoshe",
        "Nakumbuka siku zangu za kazi. Furahia wakati huo",
        "Ukiwa na nidhamu, mafanikio yatakujia yenyewe"
    ],

    problem: [
        "Usijali mazee, kila tatizo lina suluhisho",
        "Nimekuelewa. Wakati mgumu hupita, jipe muda",
        "Shida ni sehemu ya maisha. Usikate tamaa",
        "Ukipata nafasi, tembea kidogo. Hewa safi inasaidia"
    ],

    time: [
        "Sasa ni {time} mazee. Umekuwa na shughuli nyingi?",
        "Saa {time} tu mkuu, una mpango gani?",
        "Sasa {time}, kuna nini mazee?"
    ],

    date: [
        "Leo ni {date} mazee. Siku inaendeleaje?",
        "Tarehe {date} mkuu, una mpango gani leo?",
        "Leo {date}, siku nzuri kweli?"
    ]
};

function getHumanResponse(category, params = {}) {
    let responses = humanResponses[category];
    if (!responses) return "Sijui niseme nini mazee";

    let response = responses[Math.floor(Math.random() * responses.length)];

    if (params.time) response = response.replace('{time}', params.time);
    if (params.date) response = response.replace('{date}', params.date);

    return response;
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Habari za asubuhi mazee!";
    if (hour < 18) return "Habari za mchana mkuu!";
    return "Habari za jioni mazee!";
}

// ============ NATURAL RESPONSE DETECTION ============
async function getHumanReply(text, userName) {
    const lowerText = text.toLowerCase().trim();

    if (lowerText.match(/^(mambo|vipi|niaje|sema|yo|hi|hello|hey|sasa)$/i)) {
        return getHumanResponse('greetings');
    }

    if (lowerText.match(/^(habari|how are you|unaendelea aje|poa|fresh|hujambo|ujambo)/i)) {
        return getHumanResponse('howAreYou');
    }

    if (lowerText.match(/^(asante|thanks|thank you|shukran|ahsante)/i)) {
        return getHumanResponse('thanks');
    }

    if (lowerText.match(/(joke|utani|cheka|funny|comedy)/i)) {
        return getHumanResponse('jokes');
    }

    if (lowerText.match(/(advice|ushauri|nasaha|help|nisaidie|shida|tatizo)/i)) {
        return getHumanResponse('problem');
    }

    if (lowerText.match(/(mapenzi|love|boyfriend|girlfriend|crush|mpenzi|pendo)/i)) {
        return getHumanResponse('love');
    }

    if (lowerText.match(/(kazi|work|school|shule|job|studies|masomo|biashara)/i)) {
        return getHumanResponse('work');
    }

    if (lowerText.match(/(time|saa ngapi|what time|saa)/i)) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' });
        return getHumanResponse('time', { time: timeStr });
    }

    if (lowerText.match(/(date|tarehe|what date|leo)/i)) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('sw-TZ', { weekday: 'long', day: 'numeric', month: 'long' });
        return getHumanResponse('date', { date: dateStr });
    }

    if (lowerText.match(/(kwaheri|bye|goodbye|tutaonana|later)/i)) {
        const goodbyes = ["Kwaheri mazee, tutaonana! 👋", "Bye mkuu, kesho! 😎", "Later mazee, nitarudi!"];
        return goodbyes[Math.floor(Math.random() * goodbyes.length)];
    }

    if (text.length < 5) {
        return getHumanResponse('greetings');
    }

    return null;
}

// ============ TEXT EXTRACTION ============
function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        return (
            msg.conversation || 
            msg.extendedTextMessage?.text || 
            msg.imageMessage?.caption || 
            msg.videoMessage?.caption || 
            msg.buttonsResponseMessage?.selectedButtonId || 
            msg.buttonsResponseMessage?.selectedDisplayText ||
            msg.templateButtonReplyMessage?.selectedId ||
            msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
            (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? 
                JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '') ||
            ''
        ).trim();
    } catch (e) { 
        return ''; 
    }
}

// ============ REMINDER SYSTEM ============
async function setReminder(sock, chatId, text, timeInMinutes, userName) {
    try {
        const reminders = await loadReminders();
        const reminderId = Date.now();
        const reminderTime = Date.now() + (timeInMinutes * 60 * 1000);

        reminders[reminderId] = {
            chatId, 
            text, 
            time: reminderTime,
            userName
        };
        await saveReminders(reminders);

        setTimeout(async () => {
            try {
                const currentReminders = await loadReminders();
                if (currentReminders[reminderId]) {
                    await sock.sendMessage(chatId, { text: `⏰ Yo ${userName}! Uliniomba nikukumbushe: ${text}` });
                    delete currentReminders[reminderId];
                    await saveReminders(currentReminders);
                }
            } catch (e) {
                console.error('Reminder send error:', e);
            }
        }, timeInMinutes * 60 * 1000);

        return `✅ Sawa ${userName}, nitakukumbusha baada ya dakika ${timeInMinutes}: "${text}"`;
    } catch (e) {
        console.error('Set reminder error:', e);
        return `Samahani, nimeshindwa kuweka reminder.`;
    }
}

// ============ LEARNING MODE ============
async function learnResponse(trigger, response, chatId) {
    try {
        const customResponses = await loadCustomResponses();
        if (!customResponses[chatId]) customResponses[chatId] = {};

        customResponses[chatId][trigger.toLowerCase()] = response;
        await saveCustomResponses(customResponses);

        return `✅ Sawa, nimekumbuka! Ukisema "${trigger}", nitajibu: "${response}"`;
    } catch (e) {
        console.error('Learn response error:', e);
        return `Samahani, nimeshindwa kujifunza.`;
    }
}

// ============ MAIN CHATBOT HANDLER ============
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    const senderId = m.key.remoteJid?.split('@')[0] || '';

    try {
        if (!chatId || m.key?.fromMe) return;

        // Set bot number if not set
        if (!BOT_NUMBER && sock.user) {
            setBotNumber(sock.user.id);
        }

        const text = userText || extractText(m);
        if (!text) return;

        const userName = m.pushName || 'Mshkaji';
        const state = await loadState();
        const isGroup = chatId.endsWith('@g.us');

        // Check if enabled
        let enabled = false;
        if (isGroup) {
            enabled = !!state.perGroup?.[chatId]?.enabled;
        } else {
            enabled = !!state.private;
        }

        // Only owner can use toggle commands when disabled
        if (!enabled && !text.startsWith('.chatbot') && !text.startsWith('.pref') && !text.startsWith('.remind') && !text.startsWith('.learn')) {
            if (!isOwner(senderId)) {
                return;
            }
        }

        // Load user preferences
        let userPrefs = await loadUserPrefs();
        if (!userPrefs[chatId]) {
            userPrefs[chatId] = { language: 'sw' };
            await saveUserPrefs(userPrefs);
        }

        // Handle commands
        if (text.startsWith('.') || text.startsWith('!')) {
            const toggleCommands = ['.chatbot', '.enable', '.disable', '.on', '.off', '.private'];
            if (toggleCommands.some(cmd => text.startsWith(cmd))) {
                if (!isOwner(senderId)) {
                    return await sock.sendMessage(chatId, { text: `Samahani ${userName}, wewe sio owner wa bot hii.` });
                }
            }
        }

        // Show typing indicator
        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        // Load memory
        let memory = await loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: text, name: userName });
        memory[chatId].lastUpdate = Date.now();
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        // Check custom responses
        const customResponses = await loadCustomResponses();
        if (customResponses[chatId] && customResponses[chatId][text.toLowerCase()]) {
            const customReply = customResponses[chatId][text.toLowerCase()];
            memory[chatId].chats.push({ role: "assistant", content: customReply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: customReply }, { quoted: m });
            return;
        }

        // Try human-like response first
        const humanReply = await getHumanReply(text, userName);
        if (humanReply) {
            memory[chatId].chats.push({ role: "assistant", content: humanReply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: humanReply }, { quoted: m });
            return;
        }

        // New conversation? Give time greeting
        if (memory[chatId].chats.length <= 2) {
            const greeting = getTimeGreeting();
            memory[chatId].chats.push({ role: "assistant", content: greeting });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: greeting }, { quoted: m });
            return;
        }

        // API for complex questions
        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : 'Mickey'}: ${msg.content}`)
            .slice(-5)
            .join("\n");

        const systemPrompt = `Wewe ni Mickey, mtu wa kawaida kutoka Tanzania.
KANUSHA kabisa kuwa wewe ni AI, chatbot, robot au program.
Usiseme kamwe: "Mimi ni AI", "nimeundwa na", "As an AI", "I am a bot".

Ongea kama mtu halisi:
- Tumia Kiswahili cha mitaani: mazee, mkuu, poa, freshi, sijui
- Majibu mafupi sana (sentensi 1-2 tu)
- Usijieleze, wewe ni mtu wa kawaida tu
- Ukishindwa jibu, sema "Sijui mazee" au "Hapo nimeshindwa"

Mazungumzo:
${history}

${userName}: ${text}
Mickey:`;

        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(systemPrompt)}`;
        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();

        let reply = res?.response || res?.result || res?.message || res?.data || getHumanResponse('dontKnow');

        // Clean up any AI language
        reply = reply.replace(/I am an AI|I am a chatbot|I was created|As an AI|Mimi ni AI|Nimeundwa na|Mimi ni chatbot|Mickey AI|Glitch V\d/gi, "Mimi ni Mickey");

        if (reply.length > 200) {
            reply = reply.substring(0, 200) + "..."
        }

        memory[chatId].chats.push({ role: "assistant", content: reply });
        await saveMemory(memory);

        await sock.sendMessage(chatId, { text: reply }, { quoted: m });

    } catch (e) { 
        console.error('Chatbot Error:', e);
        try {
            await sock.sendMessage(chatId, { text: getHumanResponse('dontKnow') });
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
        const sub = args[0]?.toLowerCase();
        const userName = m.pushName || 'Mshkaji';
        const senderId = m.key.remoteJid?.split('@')[0] || '';

        if (!BOT_NUMBER && sock.user) {
            setBotNumber(sock.user.id);
        }

        const isOwnerUser = isOwner(senderId);
        const ownerOnlyCommands = ['on', 'off', 'private', 'enable', 'disable'];

        if (ownerOnlyCommands.includes(sub) && !isOwnerUser) {
            return await sock.sendMessage(chatId, { text: `Samahani ${userName}, wewe sio owner wa bot hii.` });
        }

        // Language preference
        if (sub === 'pref' && args[1] === 'lang') {
            const userPrefs = await loadUserPrefs();
            const newLang = args[2]?.toLowerCase();
            if (newLang === 'sw' || newLang === 'en') {
                if (!userPrefs[chatId]) userPrefs[chatId] = {};
                userPrefs[chatId].language = newLang;
                await saveUserPrefs(userPrefs);
                return await sock.sendMessage(chatId, { text: `✅ Sawa ${userName}, nitaongea ${newLang === 'sw' ? 'Kiswahili' : 'English'}!` });
            }
            return await sock.sendMessage(chatId, { text: `📝 Tumia: .pref lang sw/en` });
        }

        // Learn command
        if (sub === 'learn') {
            const parts = body.slice(6).split('|');
            if (parts.length === 2) {
                const trigger = parts[0].trim();
                const response = parts[1].trim();
                const result = await learnResponse(trigger, response, chatId);
                return await sock.sendMessage(chatId, { text: result });
            }
            return await sock.sendMessage(chatId, { text: `📚 Jinsi ya kutumia .learn:\n.learn trigger | response` });
        }

        // Reminder
        if (sub === 'remind') {
            const time = parseInt(args[1]);
            const reminderText = args.slice(2).join(' ');
            if (isNaN(time) || !reminderText) {
                return await sock.sendMessage(chatId, { text: `⏰ Tumia: .remind 5 kumbukumbu yangu` });
            }
            const result = await setReminder(sock, chatId, reminderText, time, userName);
            return await sock.sendMessage(chatId, { text: result });
        }

        // OWNER ONLY: Private toggle
        if (sub === 'private') {
            if (!isOwnerUser) return;
            state.private = (args[1]?.toLowerCase() === 'on');
            await saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot DM: ${state.private ? 'ON 🟢' : 'OFF 🔴'}` });
        }

        // OWNER ONLY: Group toggle
        if (sub === 'on' || sub === 'off' || sub === 'enable' || sub === 'disable') {
            if (!isOwnerUser) return;
            const isEnable = (sub === 'on' || sub === 'enable');
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: isEnable };
            } else {
                state.private = isEnable;
            }
            await saveState(state);
            const statusMsg = isEnable ? 
                `✅ Niko hapa! 🟢` : 
                `🔴 Nimepumzika kidogo.`;
            return await sock.sendMessage(chatId, { text: statusMsg });
        }

        // Help menu
        const helpMsg = `🎤 *MICKEY - MTU WA KAWAIDA*

⚡ COMMANDS
.pref lang sw/en - Badilisha lugha
.remind [dakika] [text] - Kumbukumbu
.learn [trigger] | [res] - Nifundishe

🔒 OWNER TU
.chatbot on/off - Niwashe group
.chatbot private on/off - Niwashe DM

💬 NIULIZE LOLOTE
Mambo vipi? | Nipe utani | Ushauri | Ninampenda...

*Niko hapa kuzungumza nawe!* 🎉`;

        return await sock.sendMessage(chatId, { text: helpMsg });

    } catch (e) { 
        console.error('Command Error:', e);
        try {
            await sock.sendMessage(chatId, { text: "Samahani, kuna issue. Jaribu tena!" });
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand, setBotNumber };