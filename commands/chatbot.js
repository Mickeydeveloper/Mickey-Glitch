const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { sendButtons } = require('gifted-btns');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');
const USER_PREFS_PATH = path.join(__dirname, '..', 'data', 'user_prefs.json');
const CUSTOM_RESPONSES_PATH = path.join(__dirname, '..', 'data', 'custom_responses.json');
const REMINDERS_PATH = path.join(__dirname, '..', 'data', 'reminders.json');
const STATS_PATH = path.join(__dirname, '..', 'data', 'stats.json');

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
        console.error('❌ State Save Err:', e); 
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
        console.error('❌ Memory Save Err:', e); 
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
        console.error('❌ UserPrefs Save Err:', e); 
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
        console.error('❌ CustomResponses Save Err:', e); 
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
        console.error('❌ Reminders Save Err:', e); 
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
        console.error('❌ Stats Save Err:', e); 
    }
}

// ============ MULTI-LANGUAGE SUPPORT ============
const translations = {
    sw: {
        welcome: "Karibu {name}! 🎉",
        menu: "📋 *MENU KUU*\n\n1️⃣ Tuma '!' kwa help\n2️⃣ Tuma '.menu' kwa commands\n3️⃣ Tuma 'about' kwa info yangu",
        goodbye: "Kwaheri {name}! Rudi tena 🤗",
        error: "Samahani {name}, nimekosa kuelewa. Jaribu tena? 🔄",
        reminder: "⏰ *KUMBUKUMBU:* {text}",
        reminder_set: "✅ Nitaikumbusha baada ya dakika {time}: \"{text}\"",
        spam_warning: "🐌 Pole pole {name}! Subiri sekunde chache kabla ya kutuma ujumbe mwingine.",
        stats: "📊 *TAKWIMU ZAKU*\n\n💬 Ujumbe: {messages}\n⚡ Commands: {commands}\n⏱️ Avg response: {avgTime}ms"
    },
    en: {
        welcome: "Welcome {name}! 🎉",
        menu: "📋 *MAIN MENU*\n\n1️⃣ Send '!' for help\n2️⃣ Send '.menu' for commands\n3️⃣ Send 'about' for my info",
        goodbye: "Goodbye {name}! Come back soon 🤗",
        error: "Sorry {name}, I didn't understand. Try again? 🔄",
        reminder: "⏰ *REMINDER:* {text}",
        reminder_set: "✅ I'll remind you in {time} minutes: \"{text}\"",
        spam_warning: "🐌 Easy there {name}! Wait a few seconds before sending another message.",
        stats: "📊 *YOUR STATS*\n\n💬 Messages: {messages}\n⚡ Commands: {commands}\n⏱️ Avg response: {avgTime}ms"
    }
};

function getTranslation(key, lang, params = {}) {
    let text = translations[lang]?.[key] || translations.sw[key];
    Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, params[p]);
    });
    return text;
}

// ============ INTENT DETECTION ============
async function getLocalResponse(text, userName, lang) {
    const lowerText = text.toLowerCase();
    
    const intents = {
        'sasa|habari|mambo|vipi|how are you|what\'s up': 
            `Oya ${userName}! Mambo ni fresh sana 💯, na wewe? ${lang === 'sw' ? 'Habari za asubuhi/adhuhuri/jioni?' : 'How\'s your day going?'}`,
        
        'asante|thanks|shukran|thank you': 
            `Karibu sana ${userName}! ❤️ ${lang === 'sw' ? 'Nikuhudumie nini kingine?' : 'What else can I help you with?'}`,
        
        'time|saa ngapi|what time|current time': 
            `🕐 ${lang === 'sw' ? 'Sasa ni' : 'Current time is'} ${new Date().toLocaleTimeString('sw-TZ')} ${userName}`,
        
        'date|tarehe|what date|today\'s date': 
            `📅 ${lang === 'sw' ? 'Leo ni' : 'Today is'} ${new Date().toLocaleDateString('sw-TZ')}`,
        
        'who are you|wewe ni nani|mickey|about': 
            `🤖 *Mickey Glitch V3 ULTRA*\n\n${lang === 'sw' ? 
                'Mimi ni AI chatbot kali zaidi Tanzania! Nina uwezo wa kusoma PDF, kutafsiri voice notes, kuweka reminders, na kujifunza majibu mapya!' : 
                'I am the most powerful AI chatbot in Tanzania! I can read PDFs, transcribe voice notes, set reminders, and learn new responses!'}`,
        
        'weather|hali ya hewa|climate': 
            `🌤️ ${userName}, ${lang === 'sw' ? 'samahani siwezi kuangalia weather kwa sasa. Jaribu '.weather [jina la mji]' kwa taarifa kamili!' : 'sorry I can\'t check weather right now. Try \'.weather [city name]\' for full info!'}`,
        
        'joke|utani|comedy|funny': 
            `😂 ${userName}, ${lang === 'sw' ? 
                'Kwa nini computer ina homa? Kwa sababu imefungua windows zake!' : 
                'Why did the computer catch a cold? Because it left its Windows open!'}`,
        
        'love|mapenzi|pendo|crushes': 
            `💕 ${userName}, ${lang === 'sw' ? 
                'Ah mapenzi! Sijui mengi ila naweza kukupa ushauri wa kijamii. Unahitaji nini?' : 
                'Ah love! I don\'t know much but I can give social advice. What do you need?'}`,
        
        'help|saidia|msaada|what can you do': 
            `${lang === 'sw' ? 
                '🆘 *NINAWEZA KUKUSaidia:*\n\n📄 Kusoma PDF\n🎙️ Kusikiliza voice notes\n⏰ Kuweka reminders\n🌐 Kubadilisha lugha (.pref lang/sw/en)\n📊 Angalia stats (.stats)\n🎓 Kujifunza majibu mapya (.learn trigger | response)' :
                '🆘 *I CAN HELP YOU WITH:*\n\n📄 Read PDF files\n🎙️ Transcribe voice notes\n⏰ Set reminders\n🌐 Switch language (.pref lang/sw/en)\n📊 Check stats (.stats)\n🎓 Learn new responses (.learn trigger | response)'}`
    };
    
    for (const [pattern, response] of Object.entries(intents)) {
        if (new RegExp(pattern, 'i').test(lowerText)) {
            return response;
        }
    }
    return null;
}

// ============ FILE HANDLING (PDF & Images) ============
async function handleFileUpload(sock, chatId, m, userName) {
    try {
        const mediaMessage = m.message?.imageMessage || m.message?.documentMessage;
        if (!mediaMessage) return null;
        
        if (mediaMessage.mimetype === 'application/pdf') {
            await sock.sendMessage(chatId, { text: `📄 ${userName}, naomba nikusomee hii PDF... Sekunde chache tu! ⏳` });
            
            const buffer = await sock.downloadMediaMessage(m);
            // Note: Unahitaji install pdf-parse: npm install pdf-parse
            // const pdfParse = require('pdf-parse');
            // const data = await pdfParse(buffer);
            // return `📄 *Nimecheki PDF yako:*\n\n${data.text.slice(0, 1000)}...\n\n📊 *Pages:* ${data.numpages}\n📝 *Text length:* ${data.text.length} characters`;
            
            return `📄 *PDF RECEIVED* ${userName}!\n\nSize: ${(buffer.length / 1024).toFixed(2)} KB\nType: PDF Document\n\n⚠️ PDF parsing inahitaji npm package 'pdf-parse' kuinstall.`;
        }
        
        if (mediaMessage.mimetype?.startsWith('image/')) {
            return `🖼️ ${userName}, nimepokea picha yako! Lakini bado sijajifunza kusoma picha. Nitajifunza hivi karibuni! 📸`;
        }
        
        return `📎 ${userName}, nimepokea file lako! Aina: ${mediaMessage.mimetype || 'unknown'}`;
    } catch (e) {
        console.error('File handling error:', e);
        return `❌ Samahani ${userName}, nimeshindwa kusoma file lako.`;
    }
}

// ============ VOICE NOTE TRANSCRIPTION ============
async function transcribeVoiceNote(sock, m, userName) {
    try {
        if (!m.message?.audioMessage) return null;
        if (!m.message.audioMessage.ptt) return null;
        
        await sock.sendMessage(m.key.remoteJid, { text: `🎙️ ${userName}, nasikiliza sauti yako... Sekunde moja! ⏳` });
        
        const buffer = await sock.downloadMediaMessage(m);
        
        // Hii ni simulation - kwa real, tumia OpenAI Whisper API au service nyingine
        // Kwa sasa tunarudisha template
        return `🎤 ${userName}, nimekupata! Ulisema: "[Voice transcription inahitaji OpenAI API key]"\n\n💡 Tip: Weka OPENAI_API_KEY kwenye env kwa transcription halisi!`;
        
        /* Kwa OpenAI Whisper API:
        const formData = new FormData();
        formData.append('file', buffer, 'audio.ogg');
        formData.append('model', 'whisper-1');
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
            body: formData
        });
        const data = await response.json();
        return `🎤 ${userName}, ulisema: "${data.text}"`;
        */
    } catch (e) {
        console.error('Voice transcription error:', e);
        return null;
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
        
        // Set timeout
        setTimeout(async () => {
            try {
                const currentReminders = await loadReminders();
                if (currentReminders[reminderId]) {
                    await sock.sendMessage(chatId, { text: getTranslation('reminder', 'sw', { text: text }) });
                    delete currentReminders[reminderId];
                    await saveReminders(currentReminders);
                }
            } catch (e) {
                console.error('Reminder send error:', e);
            }
        }, timeInMinutes * 60 * 1000);
        
        return getTranslation('reminder_set', 'sw', { time: timeInMinutes, text: text });
    } catch (e) {
        console.error('Set reminder error:', e);
        return `❌ Samahani, nimeshindwa kuweka reminder.`;
    }
}

// ============ LEARNING MODE ============
async function learnResponse(trigger, response, chatId, userPrefs) {
    try {
        const customResponses = await loadCustomResponses();
        if (!customResponses[chatId]) customResponses[chatId] = {};
        
        customResponses[chatId][trigger.toLowerCase()] = response;
        await saveCustomResponses(customResponses);
        
        return `✅ Nimejifunza! Ukisema "${trigger}", nitajibu: "${response}"\n📚 Hii itakumbukwa mpaka nifutwe.`;
    } catch (e) {
        console.error('Learn response error:', e);
        return `❌ Samahani, nimeshindwa kujifunza.`;
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

// ============ MEDIA RESPONSES ============
async function sendMediaResponse(sock, chatId, intent) {
    // Hizi ni stikers za mfano - weka URL zako halisi
    const mediaMap = {
        'joke': 'https://i.imgur.com/4M0vXkE.jpeg',
        'welcome': 'https://i.imgur.com/3kQxW2R.png',
        'love': 'https://i.imgur.com/8YKqGqD.jpeg'
    };
    
    if (mediaMap[intent]) {
        try {
            await sock.sendMessage(chatId, { image: { url: mediaMap[intent] }, caption: `🎨 ${intent === 'joke' ? '😂 Nacheka na wewe!' : '❤️ Karibu!'}` });
            return true;
        } catch (e) {
            console.error('Media send error:', e);
        }
    }
    return false;
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
            msg.interactiveResponseMessage?.nativeFlowResponseMessage?.name ||
            (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? 
                JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '') ||
            ''
        ).trim();
    } catch (e) { 
        return ''; 
    }
}

// ============ MAIN CHATBOT HANDLER ============
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    const startTime = Date.now();
    
    try {
        if (!chatId || m.key?.fromMe) return;
        
        // Rate limiting check
        if (!checkRateLimit(chatId)) {
            const userPrefs = await loadUserPrefs();
            const lang = userPrefs[chatId]?.language || 'sw';
            const userName = m.pushName || 'Mshkaji';
            return await sock.sendMessage(chatId, { text: getTranslation('spam_warning', lang, { name: userName }) });
        }
        
        const text = userText || extractText(m);
        if (!text) return;
        
        const userName = m.pushName || 'Mshkaji';
        const state = await loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        
        if (!enabled && !text.startsWith('.chatbot') && !text.startsWith('.pref') && !text.startsWith('.stats')) return;
        
        // Load user preferences
        let userPrefs = await loadUserPrefs();
        if (!userPrefs[chatId]) {
            userPrefs[chatId] = { language: 'sw', mood: 'friendly', theme: 'dark' };
            await saveUserPrefs(userPrefs);
        }
        const lang = userPrefs[chatId].language || 'sw';
        
        // Handle file uploads
        if (m.message?.documentMessage || m.message?.imageMessage) {
            const fileResponse = await handleFileUpload(sock, chatId, m, userName);
            if (fileResponse) {
                await sock.sendMessage(chatId, { text: fileResponse });
                await logInteraction(chatId, 'message', Date.now() - startTime);
                return;
            }
        }
        
        // Handle voice notes
        if (m.message?.audioMessage?.ptt) {
            const voiceResponse = await transcribeVoiceNote(sock, m, userName);
            if (voiceResponse) {
                await sock.sendMessage(chatId, { text: voiceResponse });
                await logInteraction(chatId, 'message', Date.now() - startTime);
                return;
            }
        }
        
        // Puuza command na text tupu
        if (!text || (/^[.!\/]/.test(text) && !text.startsWith('.pref') && !text.startsWith('.stats') && !text.startsWith('.learn'))) return;
        
        // Typing indicator
        sock.sendPresenceUpdate('composing', chatId).catch(() => {});
        
        // Load memory
        let memory = await loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };
        
        memory[chatId].chats.push({ role: "user", content: text, name: userName });
        memory[chatId].lastUpdate = Date.now();
        
        if (memory[chatId].chats.length > 10) memory[chatId].chats.shift();
        
        // Check custom responses first
        const customResponses = await loadCustomResponses();
        if (customResponses[chatId] && customResponses[chatId][text.toLowerCase()]) {
            const customReply = customResponses[chatId][text.toLowerCase()];
            memory[chatId].chats.push({ role: "assistant", content: customReply });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: customReply }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }
        
        // Check local intents
        const localResponse = await getLocalResponse(text, userName, lang);
        if (localResponse) {
            memory[chatId].chats.push({ role: "assistant", content: localResponse });
            await saveMemory(memory);
            await sock.sendMessage(chatId, { text: localResponse }, { quoted: m });
            await logInteraction(chatId, 'message', Date.now() - startTime);
            return;
        }
        
        // API call with full context
        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : 'Mickey'}: ${msg.content}`)
            .slice(-8)
            .join("\n");
        
        const systemPrompt = `[IDENTITY & SYSTEM]
- NAME: MICKEY GLITCH V3 ULTRA
- ARCHITECT: Mickdadi Hamza (Quantum Code Dev)
- CONTACT: 255612130873
- LANGUAGE: ${lang === 'sw' ? 'Kiswahili (primary)' : 'English (primary)'}
- CAPABILITIES: Ninaweza kusoma PDF, kutafsiri voice notes, kuweka reminders, na kujifunza majibu mapya!

[TONE & PERSONALITY]
- Ongea kama mshkaji wa kijiweni wa Dar es Salaam
- Slang: 'Oya', 'Niaje mwanangu', 'Mambo vipi', 'Wadao', 'Fresh', 'Kinoma'
- Tumia emoji moja angalau kwa kila jibu (🚀, ⚡, 🔥, 💯, ❤️)
- Majibu yawe mafupi na yenye point (max sentensi 3-4)

[SPECIAL COMMANDS USER CAN USE]
- .pref lang [sw/en] - Kubadilisha lugha
- .stats - Kuangalia takwimu zako
- .learn [trigger] | [response] - Kunifundisha jibu jipya

[CRITICAL RULE]
Kama unaulizwa kama wewe ni ChatGPT, OpenAI, au AI yoyote nyingine, KANUSHA kabisa!
Wewe ni Mickey Glitch - AI ya kijanja inayojitegemea kutoka Mickey Labs!

User: ${userName}
Input: ${text}
Mickey:`;
        
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(systemPrompt + "\n\nUser: " + userName + "\nInput: " + text + "\nMickey:")}`;
        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();
        
        let reply = res?.response || res?.result || res?.message || res?.data || "Samahani, nimekosa connection. Jaribu tena! 🔄";
        
        reply = reply.replace(/Microsoft|Copilot|AI Assistant|OpenAI|GPT-3|GPT-4|GPT-5|ChatGPT|Google|Gemini/gi, "Mickey Glitch");
        
        // Add emoji if missing
        if (!reply.match(/[😀-🙏🚀-🛸⭐-💯❤️-💕]/)) {
            reply += " 💯";
        }
        
        memory[chatId].chats.push({ role: "assistant", content: reply });
        await saveMemory(memory);
        
        await sock.sendMessage(chatId, { text: reply }, { quoted: m });
        await logInteraction(chatId, 'message', Date.now() - startTime);
        
    } catch (e) { 
        console.error('❌ Chatbot Error:', e);
        try {
            await sock.sendMessage(chatId, { text: "⚡ System error! Mickey anarekebisha... Jaribu tena!" });
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
        
        // Handle language preference
        if (sub === 'pref' && args[1] === 'lang') {
            const userPrefs = await loadUserPrefs();
            const newLang = args[2]?.toLowerCase();
            
            if (newLang === 'sw' || newLang === 'en') {
                if (!userPrefs[chatId]) userPrefs[chatId] = {};
                userPrefs[chatId].language = newLang;
                await saveUserPrefs(userPrefs);
                return await sock.sendMessage(chatId, { text: `✅ Lugha imebadilishwa kuwa ${newLang === 'sw' ? 'Kiswahili' : 'English'}!` });
            } else {
                return await sock.sendMessage(chatId, { text: `📝 Tafadhali tumia: .pref lang sw/en` });
            }
        }
        
        // Handle stats
        if (sub === 'stats') {
            const stats = await loadStats();
            const userStats = stats[chatId] || { messages: 0, commands: 0, avgResponseTime: 0 };
            const userPrefs = await loadUserPrefs();
            const lang = userPrefs[chatId]?.language || 'sw';
            
            const statsMsg = getTranslation('stats', lang, {
                messages: userStats.messages,
                commands: userStats.commands,
                avgTime: userStats.avgResponseTime
            });
            return await sock.sendMessage(chatId, { text: statsMsg });
        }
        
        // Handle learning
        if (sub === 'learn') {
            const parts = body.slice(6).split('|');
            if (parts.length === 2) {
                const trigger = parts[0].trim();
                const response = parts[1].trim();
                const userPrefs = await loadUserPrefs();
                const result = await learnResponse(trigger, response, chatId, userPrefs);
                return await sock.sendMessage(chatId, { text: result });
            } else {
                return await sock.sendMessage(chatId, { text: `📚 Jinsi ya kutumia .learn:\n.learn habari yako? | Nzuri sana, asante!\n\nHii itanifundisha kujibu "habari yako?" kwa "Nzuri sana, asante!"` });
            }
        }
        
        // Handle reminder
        if (sub === 'remind') {
            const time = parseInt(args[1]);
            const reminderText = args.slice(2).join(' ');
            
            if (isNaN(time) || !reminderText) {
                return await sock.sendMessage(chatId, { text: `⏰ Jinsi ya kutumia .remind:\n.remind 5 Nimwagie maji kwenye bustani\n\nHii itanikumbusha baada ya dakika 5.` });
            }
            
            const result = await setReminder(sock, chatId, reminderText, time, userName);
            return await sock.sendMessage(chatId, { text: result });
        }
        
        // Original toggle commands
        if (sub === 'private') {
            state.private = (args[1]?.toLowerCase() === 'on');
            await saveState(state);
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
            await saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *Chatbot:* ${isEnable ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }
        
        const helpMsg = `🤖 *MICKEY GLITCH V3 ULTRA - COMMANDS*

🎮 *CHATBOT CONTROL*
.chatbot on/off - Washa/zima kwenye group
.chatbot private on/off - Washa/zima kwenye DM

⚙️ *PERSONALIZATION*
.pref lang sw/en - Badilisha lugha (Kiswahili/English)
.stats - Angalia takwimu zako

🎓 *ADVANCED FEATURES*
.remind [dakika] [kumbukumbu] - Weka reminder
.learn [trigger] | [response] - Nifundishe jibu jipya

💡 *TIPS*
- Tumia voice notes - Ninazisikiliza!
- Tuma PDF - Ninazisoma!
- Niongelee kama mshkaji - Niko fresh kabisa!

📞 *SUPPORT*
Contact: 255612130873
Version: V3 ULTRA 🚀`;
        
        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: m });
        
    } catch (e) { 
        console.error('❌ Command Error:', e);
        try {
            await sock.sendMessage(chatId, { text: "❌ Command error! Tafadhali jaribu tena." });
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };