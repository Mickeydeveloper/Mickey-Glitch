const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// Owner configuration - WEKA NUMBER YAKO HAPA
const OWNER_NUMBER = "255612130873"; // Badilisha na number yako mwenyewe
const BOT_NAME = "Mickey";

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');
const USER_PREFS_PATH = path.join(__dirname, '..', 'data', 'user_prefs.json');
const CUSTOM_RESPONSES_PATH = path.join(__dirname, '..', 'data', 'custom_responses.json');
const REMINDERS_PATH = path.join(__dirname, '..', 'data', 'reminders.json');
const STATS_PATH = path.join(__dirname, '..', 'data', 'stats.json');
const QUOTES_PATH = path.join(__dirname, '..', 'data', 'quotes.json');

// Function ya kuondoa styling kwenye majina
function cleanName(userName) {
    if (!userName) return "Mshkaji";
    let clean = userName.replace(/[꧁༺༻꧂*~`|/\\<>()[\]{}]/g, '');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean || "Mshkaji";
}

// Check if user is owner
function isOwner(userId) {
    return userId === OWNER_NUMBER || userId.includes(OWNER_NUMBER);
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

async function loadStats() {
    try {
        const data = await fs.readFile(STATS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { 
        return {}; 
    }
}

async function saveStats(stats) {
    try {
        await fs.mkdir(path.dirname(STATS_PATH), { recursive: true });
        await fs.writeFile(STATS_PATH, JSON.stringify(stats, null, 2));
    } catch (e) { 
        console.error('Stats Save Err:', e); 
    }
}

async function loadQuotes() {
    try {
        const data = await fs.readFile(QUOTES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        const defaultQuotes = {
            sw: [
                "Maisha ni kama wimbi, zama na ibuke tena",
                "Furaha haitoki kwenye pesa, inatoka moyoni",
                "Kila siku ni fursa mpya kuanza upya",
                "Usiogope kushindwa, ogopa kutojaribu",
                "Mvumilivu hula mbivu"
            ],
            en: [
                "Life is like a wave, sink and rise again",
                "Happiness doesn't come from money, it comes from the heart",
                "Every day is a new chance to start over",
                "Don't fear failure, fear not trying",
                "Patience pays off"
            ]
        };
        await saveQuotes(defaultQuotes);
        return defaultQuotes;
    }
}

async function saveQuotes(quotes) {
    try {
        await fs.mkdir(path.dirname(QUOTES_PATH), { recursive: true });
        await fs.writeFile(QUOTES_PATH, JSON.stringify(quotes, null, 2));
    } catch (e) { 
        console.error('Quotes Save Err:', e); 
    }
}

// ============ MICKEY'S NATURAL HUMAN RESPONSES ============
const mickeyChat = {
    greetings: {
        morning: [
            "Habari za asubuhi mazee! Umeamka poa?",
            "Subuhi yako imekuwaje? Nami niko freshi tu",
            "Asubuhi njema! Siku njema mwanangu",
            "Yo! Umeamka lini? Mimi nimeamka mapema leo"
        ],
        afternoon: [
            "Habari za mchana! Umeshachakula?",
            "Mchana mwema mazee, unaendelea aje?",
            "Niaje mchana huu? Mimi niko tu poa",
            "Mambo ya mchana! Jua kali leo"
        ],
        evening: [
            "Habari za jioni! Siku imekuwaje?",
            "Jioni njema mkuu, umechoka?",
            "Mambo ya jioni! Sasa tunapumzika",
            "Jioni poa! Kesho ndio siku nyingine"
        ],
        night: [
            "Usiku mwema! Usikae sana, lala vizuri",
            "Mambo ya usiku huu? Mimi natazama nyota tu",
            "Usiku mkuu! Kesho tutaongea tena",
            "Lala salama, ndoto njema"
        ]
    },
    casual: [
        "Niaje mkuu, mambo vipi?",
        "Oya, freshi vipi leo?",
        "Mambo mazee, unaendelea aje?",
        "Yo! Niaje, kuna nini?",
        "Sema mkuu, umekuwaje?"
    ],
    howAreYou: [
        "Poa tu mazee, shukrani. Na wewe unaendelea aje?",
        "Nzuri tu, Mungu anipenda. Wewe je?",
        "Freshi kabisa! Siku inaenda poa, na wewe?",
        "Safi tu mkuu, hakuna story. Wewe mambo?",
        "Poa poa, nikishinda tu. Wewe mambo gani?"
    ],
    thanks: [
        "Karibu mazee, raha yangu",
        "Ahsante kwa shukrani, naomba tena",
        "Poa tu, niko hapa kukusaidia",
        "Karibu sana, sema tu unachohitaji",
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
        "Kwanini simu haicheki? Ina data chache!",
        "Nimesikia mkate ana stress... Ana-loaf!",
        "Kwanini tombo anakimbia? Anafuata ndoto zake!",
        "Mwalimu: 'Nipe sentensi na neno matunda'... Matunda yanauzwa sokoni!",
        "Niaje, unajua kwanini nyoka hajisalimii? Anajisikia mnyama!"
    ],
    advice: [
        "Ukiwa na shida, usibebe mzigo peke yako. Sema tu",
        "Maisha ni mafupi mazee, furahia kila dakika",
        "Watu watasema mengi, wewe fanya yako tu",
        "Kupata rafiki wa kweli ni kama dhahabu, usimpoteze",
        "Usilinganishe maisha yako na ya mtu mwingine. Kila mtu ana wakati wake"
    ]
};

// ============ NATURAL RESPONSE GENERATOR ============
function getNaturalResponse(category, subCategory = null) {
    if (subCategory && mickeyChat[category] && mickeyChat[category][subCategory]) {
        const responses = mickeyChat[category][subCategory];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    if (mickeyChat[category]) {
        if (typeof mickeyChat[category] === 'object') {
            const keys = Object.keys(mickeyChat[category]);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            const responses = mickeyChat[category][randomKey];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        return mickeyChat[category][Math.floor(Math.random() * mickeyChat[category].length)];
    }
    return "Sijui niseme nini mazee, lakini niko hapa";
}

// ============ TIME-BASED GREETING ============
function getTimeGreeting(userName) {
    const hour = new Date().getHours();

    if (hour < 12) {
        return getNaturalResponse('greetings', 'morning');
    } else if (hour < 18) {
        return getNaturalResponse('greetings', 'afternoon');
    } else if (hour < 22) {
        return getNaturalResponse('greetings', 'evening');
    } else {
        return getNaturalResponse('greetings', 'night');
    }
}

// ============ SMART NATURAL REPLY ============
async function getNaturalReply(text, userName) {
    const lowerText = text.toLowerCase().trim();

    if (lowerText.length < 3) {
        return getNaturalResponse('casual');
    }

    if (lowerText.match(/^(mambo|vipi|niaje|sema|yo|hi|hello|hey|sasa|mambo vipi)$/i)) {
        return getNaturalResponse('casual');
    }

    if (lowerText.match(/^(habari|how are you|how is it|unaendelea aje|poa|fresh|ujambo|hujambo)/i)) {
        return getNaturalResponse('howAreYou');
    }

    if (lowerText.match(/^(asante|thanks|thank you|shukran|ahsante|merci)/i)) {
        return getNaturalResponse('thanks');
    }

    if (lowerText.match(/(joke|utani|cheka|funny|comedy|tabasamu)/i)) {
        return getNaturalResponse('jokes');
    }

    if (lowerText.match(/(advice|ushauri|nasaha|help|nisaidie|shida|tatizo)/i)) {
        return getNaturalResponse('advice');
    }

    if (lowerText.match(/(time|saa ngapi|what time|current time|saa)/i)) {
        const now = new Date();
        return `Sasa ni ${now.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })} mazee. Umekuwa na shughuli nyingi?`;
    }

    if (lowerText.match(/(date|tarehe|what date|today|leo)/i)) {
        const now = new Date();
        return `Leo ni ${now.toLocaleDateString('sw-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Siku inaendeleaje?`;
    }

    if (lowerText.match(/(mapenzi|love|boyfriend|girlfriend|crush|mpenzi)/i)) {
        const loveResponses = [
            "Ah mapenzi! Sijui mengi mazee, lakini fanya moyo wako useme. Usiogope kujaribu!",
            "Mapenzi ni mzuri lakini yana changamoto zake. Subiri uwe tayari kabla ya kuanza",
            "Yo! Unazungumzia mapenzi? Fanya taratibu, usikimbilie",
            "Mapenzi si mchezo mazee. Hakikisha unampata mtu anayekufaa"
        ];
        return loveResponses[Math.floor(Math.random() * loveResponses.length)];
    }

    if (lowerText.match(/(kazi|work|school|shule|job|studies|masomo)/i)) {
        const workResponses = [
            "Endelea kujituma mazee. Bidii yako itakupeleka mbali. Usikate tamaa!",
            "Kazi ni nzuri, lakini pumzika pia. Usijichoshe sana",
            "Nakumbuka siku zangu za shule. Furahia wakati huo, utakumbuka baadaye",
            "Ukiwa na nidhamu kazini, mafanikio yatakujia yenyewe"
        ];
        return workResponses[Math.floor(Math.random() * workResponses.length)];
    }

    if (lowerText.match(/(problem|shida|tatizo|stress|worried|huzuni)/i)) {
        const problemResponses = [
            "Usijali mazee, kila tatizo lina suluhisho. Pumua kidogo, tafuta mtu wa kuongea naye",
            "Shida ni sehemu ya maisha. Usikate tamaa, kesho ni siku nyingine",
            "Nimekuelewa. Wakati mgumu hupita. Jipe muda, utapona",
            "Ukipata nafasi, tembea kidogo. Hewa safi inasaidia kuleta mawazo mapya"
        ];
        return problemResponses[Math.floor(Math.random() * problemResponses.length)];
    }

    if (lowerText.match(/(quote|nukuu|hekima|wisdom)/i)) {
        const quotes = await loadQuotes();
        const quoteList = quotes.sw;
        const randomQuote = quoteList[Math.floor(Math.random() * quoteList.length)];
        return `Nimekumbuka hii: "${randomQuote}". Inakusaidia?`;
    }

    if (text.length > 100) {
        const longResponses = [
            "Umekuwa na mengi ya kusema mazee. Ninasikiliza, endelea",
            "Nimekuelewa vizuri. Unataka nikusaidie vipi kwenye hili?",
            "Una mengi mazee. Lakini poa, niko hapa kukusikiliza",
            "Inaonekana umekerwa kidogo. Tafuta mtu wa kuongea naye kwa undani zaidi"
        ];
        return longResponses[Math.floor(Math.random() * longResponses.length)];
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
                    await sock.sendMessage(chatId, { text: `Yo ${userName}! Uliniuliza nikukumbushe: ${text}` });
                    delete currentReminders[reminderId];
                    await saveReminders(currentReminders);
                }
            } catch (e) {
                console.error('Reminder send error:', e);
            }
        }, timeInMinutes * 60 * 1000);

        return `Sawa ${userName}, nitakukumbusha baada ya dakika ${timeInMinutes} kuhusu: "${text}"`;
    } catch (e) {
        console.error('Set reminder error:', e);
        return `Samahani, nimeshindwa kuweka reminder. Jaribu tena.`;
    }
}

// ============ LEARNING MODE ============
async function learnResponse(trigger, response, chatId) {
    try {
        const customResponses = await loadCustomResponses();
        if (!customResponses[chatId]) customResponses[chatId] = {};

        customResponses[chatId][trigger.toLowerCase()] = response;
        await saveCustomResponses(customResponses);

        return `Sawa, nimekumbuka! Ukisema "${trigger}", nitajibu: "${response}"`;
    } catch (e) {
        console.error('Learn response error:', e);
        return `Samahani, nimeshindwa kujifunza. Jaribu tena.`;
    }
}

// ============ STATS LOGGING ============
async function logInteraction(chatId, type, duration) {
    try {
        const stats = await loadStats();
        if (!stats[chatId]) stats[chatId] = { messages: 0, commands: 0, totalResponseTime: 0, avgResponseTime: 0 };

        if (type === 'message') stats[chatId].messages++;
        if (type === 'command') stats[chatId].commands++;

        stats[chatId].totalResponseTime = (stats[chatId].totalResponseTime || 0) + duration;
        stats[chatId].avgResponseTime = Math.floor(stats[chatId].totalResponseTime / stats[chatId].messages);

        await saveStats(stats);
    } catch (e) {
        console.error('Log interaction error:', e);
    }
}

// ============ QUOTE FUNCTIONS ============
async function addQuote(quote, lang) {
    try {
        const quotes = await loadQuotes();
        if (!quotes[lang]) quotes[lang] = [];
        quotes[lang].push(quote);
        await saveQuotes(quotes);
        return true;
    } catch (e) {
        console.error('Add quote error:', e);
        return false;
    }
}

// ============ MAIN CHATBOT HANDLER (NO RATE LIMITING) ============
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    const startTime = Date.now();
    const senderId = m.key.remoteJid?.split('@')[0] || m.pushName || '';

    try {
        if (!chatId || m.key?.fromMe) return;

        // RATE LIMITING IMEFUTWA KABISA - HAKUNA CHECK TENA
        
        const text = userText || extractText(m);
        if (!text) return;

        const userName = cleanName(m.pushName) || 'Mshkaji';
        const state = await loadState();
        const isGroup = chatId.endsWith('@g.us');

        let enabled = false;
        if (isGroup) {
            enabled = !!state.perGroup?.[chatId]?.enabled;
        } else {
            enabled = !!state.private;
        }

        if (!enabled && !text.startsWith('.chatbot') && !text.startsWith('.pref') && !text.startsWith('.stats') && !text.startsWith('.quote')) {
            if (!isOwner(senderId) && !text.startsWith('.chatbot')) {
                return;
            }
        }

        let userPrefs = await loadUserPrefs();
        if (!userPrefs[chatId]) {
            userPrefs[chatId] = { language: 'sw', mood: 'friendly' };
            await saveUserPrefs(userPrefs);
        }
        const lang = userPrefs[chatId].language || 'sw';

        if (text.startsWith('.') || text.startsWith('!')) {
            const toggleCommands = ['.chatbot', '.enable', '.disable', '.on', '.off'];
            if (toggleCommands.some(cmd => text.startsWith(cmd))) {
                if (!isOwner(senderId)) {
                    return await sock.sendMessage(chatId, { text: `Samahani ${userName}, wewe si owner wa bot hii. Owner ndiye anayeruhusiwa kuwasha/kuzima chatbot.` });
                }
            }
        }

        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        let memory = await loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: text, name: userName });
        memory[chatId].lastUpdate = Date.now();

        if (memory[chatId].chats.length > 8) memory[chatId].chats.shift();

        const customResponses = await loadCustomResponses();
        if (customResponses[chatId] && customResponses[chatId][text.toLowerCase()]) {
            const customReply = customResponses[chatId][text.toLowerCase()];
            memory[chatId].chats.push({ role: "assistant", content: customReply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: customReply }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }

        const naturalReply = await getNaturalReply(text, userName);
        if (naturalReply) {
            memory[chatId].chats.push({ role: "assistant", content: naturalReply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: naturalReply }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }

        if (memory[chatId].chats.length <= 3 && !text.match(/(asante|thanks)/i)) {
            const greeting = getTimeGreeting(userName);
            memory[chatId].chats.push({ role: "assistant", content: greeting });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: greeting }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : BOT_NAME}: ${msg.content}`)
            .slice(-6)
            .join("\n");

        const systemPrompt = `Wewe ni ${BOT_NAME}, mtu wa kawaida kutoka Tanzania. KANUSHA kabisa kuwa wewe ni AI, robot, au chatbot.
UMUHIMU: Usiseme kamwe "Mimi ni AI", "Mimi ni chatbot", "Nimeundwa na", "As an AI", "I am a bot" au maneno yanayokufichua.

Ongea kama mtu halisi:
- Mfupi na kwa point (sentensi 1-2)
- Tumia Kiswahili cha mitaani (poa, mazee, mkuu, freshi)
- Usijieleze sana, wewe ni mtu wa kawaida
- Ukishindwa, sema "Sijui" au "Nimeshindwa mkuu"

Mazungumzo ya awali:
${history}

${userName}: ${text}
${BOT_NAME}:`;

        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(systemPrompt)}`;
        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();

        let reply = res?.response || res?.result || res?.message || res?.data || getNaturalResponse('dontKnow');

        reply = reply.replace(/(I am an AI|I am a chatbot|I was created by|I am artificial intelligence|As an AI|Mimi ni AI|Nimeundwa na|Mimi ni chatbot|I am Mickey Glitch AI|Mickey Glitch)/gi, `Mimi ni ${BOT_NAME} tu`);
        reply = reply.replace(/(Glitch V\d|Mickey AI|Bot|Chatbot)/gi, BOT_NAME);

        if (reply.length > 250) {
            reply = reply.substring(0, 250) + "..."
        }

        if (!reply.match(/^(poa|sawa|mazee|mkuu|yo|sijui|ah|karibu|nimekuelewa|habari)/i)) {
            reply = "Mazee, " + reply.toLowerCase();
        }

        memory[chatId].chats.push({ role: "assistant", content: reply });
        await saveMemory(memory);

        await sock.sendMessage(chatId, { text: reply }, { quoted: m });
        await logInteraction(chatId, 'message', Date.now() - startTime);

    } catch (e) { 
        console.error('Chatbot Error:', e);
        try {
            await sock.sendMessage(chatId, { text: getNaturalResponse('dontKnow') });
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
        const userName = cleanName(m.pushName) || 'Mshkaji';
        const senderId = m.key.remoteJid?.split('@')[0] || '';

        const isOwnerUser = isOwner(senderId);
        const ownerOnlyCommands = ['on', 'off', 'private', 'enable', 'disable'];

        if (ownerOnlyCommands.includes(sub) && !isOwnerUser) {
            return await sock.sendMessage(chatId, { text: `Samahani ${userName}, wewe sio owner wa bot hii. Owner (${OWNER_NUMBER}) ndiye pekee anayeruhusiwa kuwasha/kuzima chatbot.` });
        }

        if (sub === 'addquote') {
            const quote = args.slice(1).join(' ');
            const userPrefs = await loadUserPrefs();
            const lang = userPrefs[chatId]?.language || 'sw';

            if (quote) {
                const success = await addQuote(quote, lang);
                if (success) {
                    return await sock.sendMessage(chatId, { text: `Asante ${userName}! Nimeongeza nukuu yako: "${quote}"` });
                } else {
                    return await sock.sendMessage(chatId, { text: `Samahani, nimeshindwa kuongeza nukuu. Jaribu tena.` });
                }
            } else {
                return await sock.sendMessage(chatId, { text: `Jinsi ya kutumia: .addquote [nukuu yako]\nMfano: .addquote Maisha ni magumu ila yanaendelea` });
            }
        }

        if (sub === 'quote') {
            const quotes = await loadQuotes();
            const userPrefs = await loadUserPrefs();
            const lang = userPrefs[chatId]?.language || 'sw';
            const quoteList = quotes[lang] || quotes.sw;
            const randomQuote = quoteList[Math.floor(Math.random() * quoteList.length)];
            return await sock.sendMessage(chatId, { text: `"${randomQuote}" - ${BOT_NAME}` });
        }

        if (sub === 'pref' && args[1] === 'lang') {
            const userPrefs = await loadUserPrefs();
            const newLang = args[2]?.toLowerCase();

            if (newLang === 'sw' || newLang === 'en') {
                if (!userPrefs[chatId]) userPrefs[chatId] = {};
                userPrefs[chatId].language = newLang;
                await saveUserPrefs(userPrefs);
                return await sock.sendMessage(chatId, { text: `Sawa ${userName}, sasa nitaongea ${newLang === 'sw' ? 'Kiswahili' : 'English'}!` });
            } else {
                return await sock.sendMessage(chatId, { text: `Tumia: .pref lang sw/en` });
            }
        }

        if (sub === 'stats') {
            const stats = await loadStats();
            const userStats = stats[chatId] || { messages: 0, commands: 0, avgResponseTime: 0 };

            const statsMsg = `TAKWIMU ZAKU ${userName}

Ujumbe: ${userStats.messages}
Commands: ${userStats.commands}
Muda wa kujibu: ${userStats.avgResponseTime}ms

Asante kwa kuongea nami!`;
            return await sock.sendMessage(chatId, { text: statsMsg });
        }

        if (sub === 'learn') {
            const parts = body.slice(6).split('|');
            if (parts.length === 2) {
                const trigger = parts[0].trim();
                const response = parts[1].trim();
                const result = await learnResponse(trigger, response, chatId);
                return await sock.sendMessage(chatId, { text: result });
            } else {
                return await sock.sendMessage(chatId, { text: `Jinsi ya kutumia .learn:\n.learn habari yako? | Nzuri sana, asante!\n\nHii itanifundisha kujibu "habari yako?" kwa "Nzuri sana, asante!"` });
            }
        }

        if (sub === 'remind') {
            const time = parseInt(args[1]);
            const reminderText = args.slice(2).join(' ');

            if (isNaN(time) || !reminderText) {
                return await sock.sendMessage(chatId, { text: `Jinsi ya kutumia .remind:\n.remind 5 Nimwagie maji\n\nNitakukumbusha baada ya dakika 5.` });
            }

            const result = await setReminder(sock, chatId, reminderText, time, userName);
            return await sock.sendMessage(chatId, { text: result });
        }

        if (sub === 'private') {
            if (!isOwnerUser) return;
            state.private = (args[1]?.toLowerCase() === 'on');
            await saveState(state);
            return await sock.sendMessage(chatId, { text: `Chatbot DM: ${state.private ? 'IMEKWASHA' : 'IMEZIMWA'}` }, { quoted: m });
        }

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
                `Chatbot IMEKWASHA!\n\nSasa niko hapa kusikiliza na kusaidia ${chatId.endsWith('@g.us') ? 'kwenye group hii' : 'kwenye DM yako'}.` : 
                `Chatbot IMEZIMWA!\n\n${chatId.endsWith('@g.us') ? 'Group hii' : 'DM yako'} haitanijibu mpaka ukaniwasha tena.`;
            return await sock.sendMessage(chatId, { text: statusMsg }, { quoted: m });
        }

        const helpMsg = `${BOT_NAME.toUpperCase()} - RAFIKI YAKO

Niko hapa kuzungumza nawe kama rafiki yako.

COMMANDS ZA MSINGI
.pref lang sw/en - Badilisha lugha yangu
.stats - Angalia takwimu zako
.quote - Pata nukuu ya hekima
.addquote [nukuu] - Ongeza nukuu yako
.remind [dakika] [text] - Nikumbushe baada ya muda
.learn [trigger] | [response] - Nifundishe jibu jipya

COMMANDS ZA OWNER TU
.chatbot on/off - Niwashe au nizime kwenye group
.chatbot private on/off - Niwashe DM yako

UNIULIZE LOLOTE KAMA RAFIKI
- Mambo vipi? / Habari yako?
- Nipe utani / Nisaidie / Ushauri
- Saa ngapi? / Leo ni tarehe gani?
- Ninampenda nani... / Nina shida ya...

OWNER
Wasiliana: ${OWNER_NUMBER}

Niko hapa kukusaidia!`;

        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: m });

    } catch (e) { 
        console.error('Command Error:', e);
        try {
            await sock.sendMessage(chatId, { text: "Samahani, kuna issue kidogo. Jaribu tena!" });
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };