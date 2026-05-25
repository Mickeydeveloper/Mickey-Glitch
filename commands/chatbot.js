const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');
const USER_PREFS_PATH = path.join(__dirname, '..', 'data', 'user_prefs.json');
const CUSTOM_RESPONSES_PATH = path.join(__dirname, '..', 'data', 'custom_responses.json');
const REMINDERS_PATH = path.join(__dirname, '..', 'data', 'reminders.json');
const STATS_PATH = path.join(__dirname, '..', 'data', 'stats.json');
const QUOTES_PATH = path.join(__dirname, '..', 'data', 'quotes.json');

// Rate limiting
const rateLimits = new Map();

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

// ============ MICKEY'S REAL PERSONALITY ============
const mickeyResponses = {
    // Greetings - casual like normal person
    greetings: [
        "Oya mambo vipi?",
        "Niaje mzee, mambo poa?",
        "Freshi vipi?",
        "Mambo, mambo!",
        "Yo! Niaje?"
    ],
    
    // How are you responses - humble, not bragging
    howAreYou: [
        "Poa tu, shukrani. Na wewe?",
        "Nzuri tu mazee, unaendelea aje?",
        "Safi tu, Mungu anipenda. Wewe je?",
        "Poaaaa! Wewe mambo?",
        "Freshi kabisa! Na wewe?"
    ],
    
    // Thank you responses - appreciative
    thanks: [
        "Karibu mazee, poa tu",
        "Ahsante kwa shukrani zako",
        "Karibu sana, naomba tena",
        "Poa, niko hapa kukusaidia",
        "Sawa kabisa, sema tu"
    ],
    
    // Don't know responses - honest
    dontKnow: [
        "Sijui mazee, siyo eneo langu",
        "Hapo nimeshindwa mkuu",
        "Samahani, sijui hilo",
        "Hapana, sijawahi kusikia hicho",
        "Ngoja nikuulize wazoefu"
    ],
    
    // Jokes - simple Swahili jokes
    jokes: [
        "Kwanini simu haicheki? Ina data chache! 😂",
        "Niaje, nimesikia mkate ana stress... Ana-loaf! 🤣",
        "Kwanini tombo anakimbia? Anafuata ndoto zake! 😅",
        "Mwalimu: 'Nipe sentensi na neno matunda'... Matunda yanauzwa sokoni! 💀",
        "Kwanini nyoka hajisalimii? Anajisikia mnyama! 🐍"
    ],
    
    // Wisdom quotes - simple life advice
    advice: [
        "Ukiwa na shida, sema tu. Usibebe mzigo peke yako",
        "Maisha ni mafupi, furahia kila dakika",
        "Watu watasema, wewe fanya yako tu",
        "Kupata rafiki wa kweli ni dhahabu",
        "Usilinganishe maisha yako na ya mtu mwingine"
    ],
    
    // Weather responses
    weather: [
        "Leo jua kali mazee, jikinge",
        "Kuna baridi kidogo, funga jacket",
        "Mvua inanyesha, beba mwavuli",
        "Hewa ni safi leo, furahia",
        "Sijui hali ya hewa, ngoja niangalie"
    ]
};

// ============ TIME-BASED GREETINGS ============
function getTimeBasedGreeting(userName) {
    const hour = new Date().getHours();
    
    if (hour < 12) {
        return `Habari za asubuhi ${userName}!`;
    } else if (hour < 18) {
        return `Habari za mchana ${userName}!`;
    } else {
        return `Habari za jioni ${userName}!`;
    }
}

// ============ RANDOM RESPONSE GETTER ============
function getRandomResponse(category) {
    const responses = mickeyResponses[category];
    if (!responses) return "Sijui niseme nini mazee";
    return responses[Math.floor(Math.random() * responses.length)];
}

// ============ SMART REPLY GENERATOR ============
async function getSmartReply(text, userName, lang) {
    const lowerText = text.toLowerCase();
    
    // Simple greetings
    if (lowerText.match(/^(hujambo|mambo|niaje|sema|yo|hi|hello|hey|sasa)/i)) {
        return getRandomResponse('greetings');
    }
    
    // How are you
    if (lowerText.match(/^(habari|how are you|how is it|vipi|unaendelea aje|poa|fresh)/i)) {
        return getRandomResponse('howAreYou');
    }
    
    // Thank you
    if (lowerText.match(/^(asante|thanks|thank you|shukran|ahsante)/i)) {
        return getRandomResponse('thanks');
    }
    
    // Joke request
    if (lowerText.match(/^(joke|utani|cheka|funny|comedy)/i)) {
        return getRandomResponse('jokes');
    }
    
    // Advice request
    if (lowerText.match(/^(advice|ushauri|nasaha|help me|nisaidie|shida)/i)) {
        return getRandomResponse('advice');
    }
    
    // Weather
    if (lowerText.match(/^(weather|hali ya hewa|jua|mvua|baridi|joto)/i)) {
        return getRandomResponse('weather');
    }
    
    // Quote request
    if (lowerText.match(/^(quote|nukuu|hekima|wisdom)/i)) {
        const quotes = await loadQuotes();
        const quoteList = quotes[lang] || quotes.sw;
        return `"${quoteList[Math.floor(Math.random() * quoteList.length)]}" - Mickey`;
    }
    
    // Time request
    if (lowerText.match(/^(time|saa ngapi|what time|current time)/i)) {
        const now = new Date();
        return `Sasa ni ${now.toLocaleTimeString('sw-TZ')} ${userName}`;
    }
    
    // Date request
    if (lowerText.match(/^(date|tarehe|what date|today)/i)) {
        const now = new Date();
        return `Leo ni ${now.toLocaleDateString('sw-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }
    
    // Love/personal questions
    if (lowerText.match(/(mapenzi|love|boyfriend|girlfriend|crush)/i)) {
        return "Ah mapenzi! Sijui mengi mazee, lakini fanya moyo wako useme. Usiogope kujaribu! 💕";
    }
    
    // Work/school
    if (lowerText.match(/(kazi|work|school|shule|job|studies)/i)) {
        return "Endelea kujituma mazee. Bidii yako itakupeleka mbali. Usikate tamaa! 💪";
    }
    
    // Problem/help
    if (lowerText.match(/(problem|shida|tatizo|stress|worried)/i)) {
        return "Usijali mazee, kila tatizo lina suluhisho. Semaga na mtu unayemwamini, pumua kidogo. Utapona! 🙏";
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
                    await sock.sendMessage(chatId, { text: `⏰ Yo ${userName}! Unakumbushwa: ${text}` });
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

// ============ RATE LIMITING ============
function checkRateLimit(chatId) {
    const now = Date.now();
    const userLimits = rateLimits.get(chatId) || [];
    const recentMessages = userLimits.filter(t => now - t < 5000);
    
    if (recentMessages.length >= 3) {
        return false;
    }
    
    recentMessages.push(now);
    rateLimits.set(chatId, recentMessages);
    return true;
}

// ============ ADD QUOTE COMMAND ============
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

// ============ MAIN CHATBOT HANDLER ============
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    const startTime = Date.now();
    
    try {
        if (!chatId || m.key?.fromMe) return;
        
        if (!checkRateLimit(chatId)) {
            const userName = m.pushName || 'Mshkaji';
            return await sock.sendMessage(chatId, { text: `Pole pole ${userName}, nenda taratibu kidogo 😅` });
        }
        
        const text = userText || extractText(m);
        if (!text) return;
        
        const userName = m.pushName || 'Mshkaji';
        const state = await loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        
        if (!enabled && !text.startsWith('.chatbot') && !text.startsWith('.pref') && !text.startsWith('.stats')) return;
        
        let userPrefs = await loadUserPrefs();
        if (!userPrefs[chatId]) {
            userPrefs[chatId] = { language: 'sw', mood: 'friendly' };
            await saveUserPrefs(userPrefs);
        }
        const lang = userPrefs[chatId].language || 'sw';
        
        if (!text || (/^[.!\/]/.test(text) && !text.startsWith('.pref') && !text.startsWith('.stats') && !text.startsWith('.learn') && !text.startsWith('.quote'))) return;
        
        sock.sendPresenceUpdate('composing', chatId).catch(() => {});
        
        let memory = await loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };
        
        memory[chatId].chats.push({ role: "user", content: text, name: userName });
        memory[chatId].lastUpdate = Date.now();
        
        if (memory[chatId].chats.length > 10) memory[chatId].chats.shift();
        
        // Check custom responses
        const customResponses = await loadCustomResponses();
        if (customResponses[chatId] && customResponses[chatId][text.toLowerCase()]) {
            const customReply = customResponses[chatId][text.toLowerCase()];
            memory[chatId].chats.push({ role: "assistant", content: customReply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: customReply }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }
        
        // Check smart replies first (faster)
        const smartReply = await getSmartReply(text, userName, lang);
        if (smartReply) {
            memory[chatId].chats.push({ role: "assistant", content: smartReply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: smartReply }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }
        
        // Time-based greeting if no other match
        if (memory[chatId].chats.length <= 2 && !text.match(/^(asante|thanks)/i)) {
            const greeting = getTimeBasedGreeting(userName);
            memory[chatId].chats.push({ role: "assistant", content: greeting });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: greeting }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }
        
        // API call as last resort
        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : 'Mickey'}: ${msg.content}`)
            .slice(-6)
            .join("\n");
        
        const systemPrompt = `Wewe ni Mickey, mtu wa kawaida kutoka Tanzania. Usijieleze kuwa wewe ni AI au chatbot. Ongea kama mshkaji wa kawaida.

Rules:
- Usiseme "Mimi ni AI", "Mimi ni chatbot", "Nimeundwa na"
- Ongea kwa kawaida kama mtu anayezungumza na rafiki
- Tumia Kiswahili cha kawaida, si cha kifasihi
- Majibu yako mafupi na yenye maana
- Usiwe mrefu sana, sentensi 2-3 tu

History:
${history}

${userName}: ${text}
Mickey:`;
        
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(systemPrompt)}`;
        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();
        
        let reply = res?.response || res?.result || res?.message || res?.data || getRandomResponse('dontKnow');
        
        // Remove any self-identification
        reply = reply.replace(/I am an AI|I am a chatbot|I was created by|I am artificial intelligence|As an AI|Mimi ni AI|Nimeundwa na|Mimi ni chatbot/gi, "");
        reply = reply.replace(/Mickey Glitch|Mickey AI|Glitch V\d/gi, "Mickey");
        
        // Keep it short
        if (reply.length > 300) {
            reply = reply.substring(0, 300) + "...";
        }
        
        memory[chatId].chats.push({ role: "assistant", content: reply });
        await saveMemory(memory);
        
        await sock.sendMessage(chatId, { text: reply }, { quoted: m });
        await logInteraction(chatId, 'message', Date.now() - startTime);
        
    } catch (e) { 
        console.error('Chatbot Error:', e);
        try {
            await sock.sendMessage(chatId, { text: getRandomResponse('dontKnow') });
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
        
        // Add quote command
        if (sub === 'addquote') {
            const quote = args.slice(1).join(' ');
            const userPrefs = await loadUserPrefs();
            const lang = userPrefs[chatId]?.language || 'sw';
            
            if (quote) {
                const success = await addQuote(quote, lang);
                if (success) {
                    return await sock.sendMessage(chatId, { text: `✅ Nimeongeza nukuu yako: "${quote}"` });
                } else {
                    return await sock.sendMessage(chatId, { text: `❌ Nimeshindwa kuongeza nukuu. Jaribu tena.` });
                }
            } else {
                return await sock.sendMessage(chatId, { text: `📝 Jinsi ya kutumia: .addquote [nukuu yako]\nMfano: .addquote Maisha ni magumu ila yanaendelea` });
            }
        }
        
        // Get random quote
        if (sub === 'quote') {
            const quotes = await loadQuotes();
            const userPrefs = await loadUserPrefs();
            const lang = userPrefs[chatId]?.language || 'sw';
            const quoteList = quotes[lang] || quotes.sw;
            const randomQuote = quoteList[Math.floor(Math.random() * quoteList.length)];
            return await sock.sendMessage(chatId, { text: `💬 "${randomQuote}" - Mickey` });
        }
        
        // Language preference
        if (sub === 'pref' && args[1] === 'lang') {
            const userPrefs = await loadUserPrefs();
            const newLang = args[2]?.toLowerCase();
            
            if (newLang === 'sw' || newLang === 'en') {
                if (!userPrefs[chatId]) userPrefs[chatId] = {};
                userPrefs[chatId].language = newLang;
                await saveUserPrefs(userPrefs);
                return await sock.sendMessage(chatId, { text: `✅ Sawa, sasa nitaongea ${newLang === 'sw' ? 'Kiswahili' : 'English'}!` });
            } else {
                return await sock.sendMessage(chatId, { text: `📝 Tumia: .pref lang sw/en` });
            }
        }
        
        // Stats
        if (sub === 'stats') {
            const stats = await loadStats();
            const userStats = stats[chatId] || { messages: 0, commands: 0, avgResponseTime: 0 };
            
            const statsMsg = `📊 *TAKWIMU ZAKU ${userName}*

💬 Ujumbe uliotumwa: ${userStats.messages}
⚡ Commands: ${userStats.commands}
⏱️ Muda wa kujibu: ${userStats.avgResponseTime}ms

Endelea kutumia Mickey! 🎉`;
            return await sock.sendMessage(chatId, { text: statsMsg });
        }
        
        // Learn command
        if (sub === 'learn') {
            const parts = body.slice(6).split('|');
            if (parts.length === 2) {
                const trigger = parts[0].trim();
                const response = parts[1].trim();
                const result = await learnResponse(trigger, response, chatId);
                return await sock.sendMessage(chatId, { text: result });
            } else {
                return await sock.sendMessage(chatId, { text: `📚 Jinsi ya kutumia .learn:\n.learn habari yako? | Nzuri sana, asante!` });
            }
        }
        
        // Reminder
        if (sub === 'remind') {
            const time = parseInt(args[1]);
            const reminderText = args.slice(2).join(' ');
            
            if (isNaN(time) || !reminderText) {
                return await sock.sendMessage(chatId, { text: `⏰ Jinsi ya kutumia .remind:\n.remind 5 Nimwagie maji` });
            }
            
            const result = await setReminder(sock, chatId, reminderText, time, userName);
            return await sock.sendMessage(chatId, { text: result });
        }
        
        // Private toggle
        if (sub === 'private') {
            state.private = (args[1]?.toLowerCase() === 'on');
            await saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot DM: ${state.private ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }
        
        // Group toggle
        if (sub === 'on' || sub === 'off') {
            const isEnable = (sub === 'on');
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: isEnable };
            } else {
                state.private = isEnable;
            }
            await saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Mickey: ${isEnable ? 'Niko hapa! 🟢' : 'Nimepumzika kidogo 🔴'}` }, { quoted: m });
        }
        
        // Help menu
        const helpMsg = `🎤 *MICKEY - MTU WA KWAWAIDA*

Niko hapa kukusaidia kama rafiki yako. Hivi ndivyo unavyoweza kunipata:

⚡ *COMMANDS ZA MSINGI*
.chatbot on/off - Niwashe au nizime kwenye group
.chatbot private on/off - Niwashe DM
.pref lang sw/en - Niongee Kiswahili au Kingereza

🎯 *FEATURES ZA KUVUTIA*
.quote - Pata nukuu ya hekima
.addquote [nukuu] - Ongeza nukuu yako mwenyewe
.remind [dakika] [kumbukumbu] - Nikumbushe baada ya muda
.learn [trigger] | [response] - Nifundishe jibu jipya
.stats - Angalia takwimu zako

💬 *UNIULIZE LOLOTE*
- Habari za asubuhi/mchana/jioni
- Ushauri, utani, au nukuu
- Kumbukumbu za muda wowote
- Maswali ya kawaida tu

📞 *KWA USAIDIZI*
Wasiliana na Mickey: 255612130873

*Niko hapa kukusaidia kama rafiki!* 🎉`;
        
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