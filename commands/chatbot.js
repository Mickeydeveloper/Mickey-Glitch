const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const gTTS = require('gtts');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// In-memory storage
const chatMemory = {
    messages: new Map(),      // userJid → [last 20 messages]
    userInfo: new Map(),      // userJid → {name, age, location, ...}
    lastReply: new Map()      // userJid → timestamp (anti-spam)
};

// Load/Save group settings
function loadData() {
    try {
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
    } catch {
        return { groups: [], chatbot: {} };
    }
}
function saveData(data) {
    try {
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Save error:', e.message);
    }
}

// Random delay like a real person (1–7 seconds)
function humanDelay() {
    return Math.floor(Math.random() * 6000) + 1000;
}

// Sometimes "miss" the message and reply late (feels real)
function shouldReplyLate() {
    return Math.random() < 0.15; // 15% chance to delay reply by 10–30 seconds
}

// Show typing + random pause
async function typeAndWait(sock, jid) {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    await new Promise(r => setTimeout(r, humanDelay()));
    await sock.sendPresenceUpdate('available', jid);
}

// Extract user info naturally
function extractUserInfo(text) {
    const info = {};
    const lower = text.toLowerCase();

    if (lower.includes('naito') || lower.includes('jina langu') || lower.includes('my name is')) {
        const match = text.match(/(?:naito|jina langu|my name is)\s+([a-zA-Z]+)/i);
        if (match) info.name = match[1];
    }
    if (lower.includes('nina miaka') || lower.includes('i am') && lower.includes('years')) {
        const age = text.match(/\b(\d{1,2})\s*(?:miaka|years?|yrs?)\b/i);
        if (age) info.age = age[1];
    }
    if (lower.includes('ninaishi') || lower.includes('nimetoka') || lower.includes('from') || lower.includes('live in')) {
        const loc = text.match(/(?:ninaishi|nimetoka|from|live in)\s+([a-zA-Z\s]+)/i);
        if (loc) info.location = loc[1].trim();
    }
    return info;
}

// Check if bot is mentioned or message is reply to bot
function isBotTargeted(m, sock) {
    const botId = sock.user.id;
    const botNumber = botId.split(':')[0];
    const botJids = [
        botId,
        `${botNumber}@s.whatsapp.net`,
        botNumber + '@s.whatsapp.net',
        sock.user.lid || ''
    ];

    // Reply to bot?
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted && botJids.some(j => quoted.includes(j.split('@')[0].split(':')[0]))) {
        return true;
    }

    // Mentioned?
    const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentions.some(jid => botJids.includes(jid.split('@')[0].split(':')[0]))) {
        return true;
    }

    // Tagged with @number in text?
    const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase();
    if (text.includes(`@${botNumber}`)) return true;

    return false;
}

// Main AI call
async function getAIResponse(userMsg, history, userInfo) {
    const prompt = `
Wewe ni Mickey – msee wa kawaida, mjanja, mcheshi, anatumia Kiswahili cha mitaani sana.
Hakuna AI hapa. Unacheza tu kama mtu halisi.

Sheria za Mickey:
- Jibu fupi tu (1-3 sentensi max)
- Tumia emoji kama msee: 😂 😅 🙄 😉 🤣 😭 🥺 🤡 😏
- Usijirekebishe, usiseme "kama AI", usiseme "nimeundwa"
- Kama mtu anakuja kali → rudi kali kidogo tu na emoji
- Kama ni rafiki → kuwa poa, laini
- Kama ni maswali ya ujinga → geuka au tumia "🙄" au "😏 wee"
- Tumia lugha ya mitaani: wee, bro, sawa, poa, dem, mahn, si unajua, lol, lmao

Jina lako: Mickey
Wewe ni mkubwa (umezaliwa 1998)
Unaishi Nairobi (Westlands)

Mazungumzo ya awali:
\( {history.slice(-10).map((m, i) => ` \){i%2===0?'Mtumiaji':'Mickey'}: ${m}`).join('\n')}

Info kuhusu huyu jamaa:
${JSON.stringify(userInfo || {}, null, 2)}

Sasa anasema: ${userMsg}

Jibu kama Mickey tu – bila maelezo, bila sheria, bila intro:
`.trim();

    try {
        const res = await fetch("https://zellapi.autos/ai/chatbot?text=" + encodeURIComponent(prompt));
        const json = await res.json();
        if (!json.result) return null;

        let text = json.result
            .replace(/\(winks?\)/gi, '😉')
            .replace(/\(laughs?\)/gi, '😂')
            .replace(/\(rolls? eyes?\)/gi, '🙄')
            .replace(/\(shrugs?\)/gi, '🤷‍♂️')
            .replace(/Mickey[:\s]/gi, '')
            .replace(/^(Wewe|Mickey|AI|Bot)[:,]\s*/i, '')
            .trim();

        // Final cleanup
        return text || "Wee 😂";
    } catch (e) {
        console.error("AI Error:", e.message);
        return null;
    }
}

// Send voice note (with fallback)
async function sendVoiceOrText(sock, jid, text, quoted) {
    const filePath = path.join(__dirname, '..', 'temp', `voice-${Date.now()}.mp3`);

    try {
        await new Promise((resolve, reject) => {
            new gTTS(text, 'sw').save(filePath, err => {
                if (err) return reject(err);
                resolve();
            });
        });

        await sock.sendMessage(jid, {
            audio: { url: filePath },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted });

        // Delete file after 3s
        setTimeout(() => fs.unlink(filePath, () => {}), 3000);
    } catch (e) {
        console.log("TTS failed, sending text");
        await sock.sendMessage(jid, { text }, { quoted });
    }
}

// ==================== EXPORTS ====================

async function handleChatbotCommand(sock, m, prefix) {
    const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim();
    const arg = text.slice(prefix.length).trim();

    if (!text.startsWith(`${prefix}chatbot`)) return;

    const chatId = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const isOwner = sender === sock.user.id;
    const data = loadData();

    // Owner can do anything
    if (isOwner || m.isOwner || m.isAdmin) {
        if (arg === 'on') {
            data.chatbot[chatId] = true;
            saveData(data);
            return m.reply('✅ Chatbot imewezeshwa katika hii group');
        }
        if (arg === 'off') {
            delete data.chatbot[chatId];
            saveData(data);
            return m.reply('❌ Chatbot imezimwa');
        }
    }

    m.reply(`*.chatbot on* → washa\n*.chatbot off* → zima\n\n(Tumia tu kama uko admin au owner)`);
}

async function handleChatbotResponse(sock, m) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase().trim();
    const isGroup = jid.endsWith('@g.us');

    const data = loadData();

    // Private chat = always active
    if (!isGroup) {
        data.chatbot[jid] = true;
    }

    // Group: only if enabled
    if (isGroup && !data.chatbot[jid]) return;

    // Anti-spam: max 1 reply every 4 seconds per user
    const now = Date.now();
    const last = chatMemory.lastReply.get(sender) || 0;
    if (now - last < 4000) return;
    chatMemory.lastReply.set(sender, now);

    // Check if bot is targeted
    const inPrivate = !isGroup;
    const mentionedOrReplied = isBotTargeted(m, sock);

    if (!inPrivate && !mentionedOrReplied) return;

    // Clean message (remove @bot if mentioned)
    let cleanMsg = text.replace(/@\d+@s\.whatsapp\.net, '').replace(/@\d+/, '').trim();
    if (!cleanMsg) return;

    // Initialize memory
    if (!chatMemory.messages.has(sender)) {
        chatMemory.messages.set(sender, []);
        chatMemory.userInfo.set(sender, {});
    }

    // Update user info
    const newInfo = extractUserInfo(cleanMsg);
    if (Object.keys(newInfo).length) {
        chatMemory.userInfo.set(sender, {
            ...chatMemory.userInfo.get(sender),
            ...newInfo
        });
    }

    // Save message
    const history = chatMemory.messages.get(sender);
    history.push(cleanMsg);
    if (history.length > 20) history.shift();
    chatMemory.messages.set(sender, history);

    // Typing...
    await typeAndWait(sock, jid);

    // Sometimes reply late to feel real
    if (shouldReplyLate()) {
        const delay = 10000 + Math.random() * 20000;
        setTimeout(() => sendReply(), delay);
    } else {
        await sendReply();
    }

    async function sendReply() {
        const aiReply = await getAIResponse(
            cleanMsg,
            history,
            chatMemory.userInfo.get(sender)
        );

        if (!aiReply) {
            return sock.sendMessage(jid, { text: "Ati? Sielewi bro 😅" }, { quoted: m });
        }

        // Final human delay before sending
        await new Promise(r => setTimeout(r, humanDelay()));

        await sendVoiceOrText(sock, jid, aiReply, m);
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};