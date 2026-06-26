/**
 * MICKEY CHATBOT - Enhanced & Shorter Text Output
 * Private: Anyone can toggle
 * Group: Admin only can toggle
 */

const fs = require('fs/promises');
const path = require('path');
const axios = require('axios'); // Upgraded from node-fetch for better stability

// ============ PATHS ============
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

let BOT_NUMBER = null;
let stateCache = null;
const memoryCache = new Map(); // In-memory cache for ultra-fast performance

function setBotNumber(number) {
    BOT_NUMBER = number;
}

function isOwner(userId) {
    if (!BOT_NUMBER) return false;
    return userId.split('@')[0] === BOT_NUMBER.split('@')[0];
}

// ============ DATA FUNCTIONS ============
async function loadState() {
    if (stateCache) return stateCache;
    try {
        const data = await fs.readFile(STATE_PATH, 'utf8');
        stateCache = JSON.parse(data);
    } catch (e) { 
        stateCache = { groups: {}, private: {} }; 
    }
    return stateCache;
}

async function saveState(state) {
    stateCache = state;
    try {
        await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
        await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) { 
        console.error('Save error:', e); 
    }
}

// ============ HUMAN RESPONSES ============
const responses = {
    greetings: ["Oya mambo vipi mazee?", "Niaje mkuu, mambo poa?", "Yo! Niaje, upo freshi?", "Mambo mambo! Unaendeleaje?", "Sema mkuu, niko hapa kusikiliza"],
    howAreYou: ["Poa tu mazee, shukrani. Na wewe?", "Freshi kabisa! Siku inaenda poa, na wewe?", "Nzuri tu mkuu. Wewe unaendelea aje?", "Safi tu. Wewe mambo gani?", "Poa poa. Wewe?"],
    thanks: ["Karibu mazee, raha yangu", "Ahsante, naomba tena", "Karibu sana mkuu", "Sawa kabisa rafiki yako"],
    jokes: ["Simu haicheki... Ina data chache! 😂", "Kwanini tombo anakimbia? Anafuata ndoto zake! 😅", "Kwanini nyoka hajisalimii? Anajisikia mnyama! 🐍", "Mwalimu: 'Nipe sentensi na neno matunda'... Matunda yanauzwa sokoni! 💀"],
    advice: ["Ukiwa na shida, usibebe mzigo peke yako", "Maisha ni mafupi mazee, furahia kila dakika", "Watu watasema mengi, wewe fanya yako tu", "Kupata rafiki wa kweli ni kama dhahabu"],
    love: ["Ah mapenzi! Fanya moyo wako useme", "Mapenzi si mchezo mkuu. Hakikisha unampata anayekufaa", "Moyo unasema nini? Fanya hivyo, usiogope", "Mapenzi yana changamoto zake. Subiri uwe tayari"],
    work: ["Endelea kujituma mazee. Bidii yako itakupeleka mbali", "Kazi ni nzuri, lakini pumzika pia", "Ukiwa na nidhamu, mafanikio yatakujia", "Endelea kujituma, mafanikio yako karibu"],
    problem: ["Usijali mazee, kila tatizo lina suluhisho", "Nimekuelewa. Wakati mgumu hupita", "Shida ni sehemu ya maisha. Usikate tamaa", "Ukipata nafasi, tembea kidogo. Hewa safi inasaidia"],
    dontKnow: ["Sijui mazee, siyo eneo langu", "Hapo nimeshindwa mkuu, samahani", "Samahani, sijui hilo. Mengine nikusaidie?", "Leta swali lingine, hili nimeshindwa"],
    goodbye: ["Kwaheri mazee, tutaonana! 👋", "Bye mkuu, kesho! 😎", "Later mazee, nitarudi!", "Tutaonana baadaye! ✌️"]
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
function detectIntent(text) {
    const lower = text.toLowerCase().trim();
    if (lower.match(/^(mambo|vipi|niaje|sema|yo|hi|hello|hey|sasa|habari|hujambo|ujambo)$/i)) return 'greetings';
    if (lower.match(/^(habari|how are you|unaendelea aje|poa|fresh|hujambo|ujambo|mambo poa|mambo vipi)/i)) return 'howAreYou';
    if (lower.match(/^(asante|thanks|thank you|shukran|ahsante|karibu)/i)) return 'thanks';
    if (lower.match(/(joke|utani|cheka|funny|comedy|aniambie utani|nitanii)/i)) return 'jokes';
    if (lower.match(/(advice|ushauri|nisaidie|shida|tatizo|help|nasaha|mawaidha)/i)) return 'advice';
    if (lower.match(/(mapenzi|love|boyfriend|girlfriend|crush|mpenzi|pendo|nampenda)/i)) return 'love';
    if (lower.match(/(kazi|work|school|shule|job|studies|masomo|biashara)/i)) return 'work';
    if (lower.match(/(problem|tatizo|shida|mgumu|nimeshinda|challenging|ngumu|msongo)/i)) return 'problem';
    if (lower.match(/(kwaheri|bye|goodbye|tutaonana|later|ninaondoka)/i)) return 'goodbye';
    if (text.length < 3) return 'greetings';
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

// ============ CHECK IF USER IS ADMIN ============
async function isGroupAdmin(sock, chatId, senderId) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        return groupMetadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .some(admin => admin.id === senderId);
    } catch (error) {
        return false;
    }
}

// ============ COMMAND HANDLER (SHORTENED TEXT) ============
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const senderId = m.key.participant || m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const args = (body || '').trim().split(/\s+/);
        const sub = args[1]?.toLowerCase() || ''; 

        const state = await loadState();

        // ============ PRIVATE CHAT (DM) ============
        if (!isGroup) {
            if (sub === 'on') {
                state.private[senderId] = { enabled: true };
                await saveState(state);
                return await sock.sendMessage(chatId, { text: '✅ *Chatbot:* ON (DM)' });
            }
            if (sub === 'off') {
                state.private[senderId] = { enabled: false };
                await saveState(state);
                return await sock.sendMessage(chatId, { text: '❌ *Chatbot:* OFF (DM)' });
            }
            if (sub === 'status') {
                const status = state.private?.[senderId]?.enabled ? '🟢 ON' : '🔴 OFF';
                return await sock.sendMessage(chatId, { text: `📊 *Chatbot Status:* ${status}` });
            }

            return await sock.sendMessage(chatId, { 
                text: `🤖 *Mickey Chatbot*\n• _.chatbot on_ - Washa\n• _.chatbot off_ - Zima\n• _.chatbot status_ - Hali` 
            });
        }

        // ============ GROUP CHAT ============
        const isAdmin = await isGroupAdmin(sock, chatId, senderId);
        const isOwnerUser = isOwner(senderId);

        if (sub === 'on') {
            if (!isAdmin && !isOwnerUser) return await sock.sendMessage(chatId, { text: '❌ Admin pekee anaweza kuwasha.' });
            state.groups[chatId] = { enabled: true };
            await saveState(state);
            return await sock.sendMessage(chatId, { text: '✅ *Chatbot:* ON (Group)' });
        }

        if (sub === 'off') {
            if (!isAdmin && !isOwnerUser) return await sock.sendMessage(chatId, { text: '❌ Admin pekee anaweza kuzima.' });
            state.groups[chatId] = { enabled: false };
            await saveState(state);
            return await sock.sendMessage(chatId, { text: '❌ *Chatbot:* OFF (Group)' });
        }

        if (sub === 'status') {
            const status = state.groups?.[chatId]?.enabled ? '🟢 ON' : '🔴 OFF';
            return await sock.sendMessage(chatId, { text: `📊 *Chatbot Group:* ${status}` });
        }

        return await sock.sendMessage(chatId, { 
            text: `🤖 *Mickey Chatbot (Group)*\n• _.chatbot on_ - Washa (Admin)\n• _.chatbot off_ - Zima (Admin)\n• _.chatbot status_ - Hali` 
        });

    } catch (e) {
        console.error('Command error:', e);
    }
}

// ============ MAIN CHATBOT ============
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        if (!BOT_NUMBER && sock.user) setBotNumber(sock.user.id);

        const text = userText || extractText(m);
        if (!text) return;

        const senderId = m.key.participant || m.key.remoteJid;
        const userName = m.pushName || 'Mshkaji';
        const isGroup = chatId.endsWith('@g.us');

        // Handle .chatbot command
        if (text.startsWith('.chatbot')) {
            return await groupChatbotToggleCommand(sock, chatId, m, text);
        }

        // Check if enabled
        const state = await loadState();
        const enabled = isGroup ? (state.groups?.[chatId]?.enabled || false) : (state.private?.[senderId]?.enabled || false);

        if (!enabled) {
            if (!isGroup && text.length > 0 && !text.startsWith('.')) {
                await sock.sendMessage(chatId, { text: '🔴 Chatbot imezimwa hapa. Tumia _.chatbot on_ kuwasha.' }, { quoted: m });
            }
            return;
        }

        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        // Load Memory from cache
        if (!memoryCache.has(chatId)) memoryCache.set(chatId, []);
        let localMem = memoryCache.get(chatId);

        if (localMem.length > 4) localMem = localMem.slice(-4);

        // 1. Detect Local Intent
        const intent = detectIntent(text);
        if (intent) {
            const reply = getResponse(intent);
            localMem.push({ user: text, bot: reply });
            memoryCache.set(chatId, localMem);
            return await sock.sendMessage(chatId, { text: reply }, { quoted: m });
        }

        // 2. New Conversation Greeting
        if (localMem.length === 0) {
            const greeting = getTimeGreeting();
            localMem.push({ user: text, bot: greeting });
            memoryCache.set(chatId, localMem);
            return await sock.sendMessage(chatId, { text: greeting }, { quoted: m });
        }

        // 3. API Fallback for complex queries (UPDATED API)
        const history = localMem.map(msg => `${msg.user}`).join('\n');
        const prompt = `Wewe ni Mickey, mtu wa kawaida kutoka TZ. Usiseme wewe ni AI au robot. Ongea Kiswahili cha mitaani. Jibu fupi sana (sentensi 1-2).\nHistory:\n${history}\n${userName}: ${text}\nMickey:`;

        // Mpangilio mpya wa API kwa kutumia axios
        const apiUrl = `https://apis.prexzyvilla.site/ai/aichat?prompt=${encodeURIComponent(prompt)}`;

        const response = await axios.get(apiUrl, { timeout: 8000 });
        
        // Kulingana na mifumo mingi ya aina hii, jibu huwa kwenye data.result au data.response
        let reply = response.data?.result || response.data?.response || response.data?.message || getResponse('dontKnow');

        // Clean AI vocabulary
        reply = reply.replace(/I am an AI|I am a chatbot|As an AI|Mimi ni AI|Mimi ni chatbot|Mickey AI/gi, "Mimi ni Mickey");
        if (reply.length > 150) reply = reply.substring(0, 150) + '...';

        localMem.push({ user: text, bot: reply });
        memoryCache.set(chatId, localMem);

        await sock.sendMessage(chatId, { text: reply }, { quoted: m });

    } catch (e) { 
        console.error('Chatbot Error:', e.message);
        try {
            await sock.sendMessage(chatId, { text: getResponse('dontKnow') }, { quoted: m });
        } catch (err) {}
    }
}

module.exports = { 
    handleChatbotMessage,      
    groupChatbotToggleCommand, 
    setBotNumber              
};
