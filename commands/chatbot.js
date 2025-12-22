// File: islam-autoreply.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Maps
const lastReply = new Map();
const chatbotStates = new Map();

// Human-like behavior
const humanDelay = () => Math.floor(Math.random() * 5000) + 2000;
const shouldReply = () => Math.random() < 0.82;
const replyLate = () => Math.random() < 0.20;

// Typing animation
async function showTyping(sock, jid) {
    try {
        if (!jid) return;
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(r => setTimeout(r, humanDelay()));
        await sock.sendPresenceUpdate('available', jid);
    } catch (e) {
        console.debug('Typing failed:', e.message);
    }
}

// AI Reply
async function getSmartReply(messageText) {
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(`https://zellapi.autos/ai/islam?text=${encodeURIComponent(messageText)}`, {
                timeout: 12000
            });
            if (!res.ok) continue;
            const data = await res.json();
            const reply = (data.result || data.text || data.response || "").trim();
            if (reply && reply.length > 5) return reply;
        } catch (e) {
            console.debug(`API retry ${i+1} failed:`, e.message);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return null;
}

// Send reply
async function sendReply(sock, chatId, text, quoted) {
    try {
        await sock.sendMessage(chatId, { text }, { quoted });
    } catch (e) {
        console.error('Send failed:', e.message);
    }
}

// ===== COMMAND HANDLER =====
async function handleChatbotCommand(sock, m) {
    if (!m || !m.key || !m.key.remoteJid) return;

    const chatId = m.key.remoteJid;
    const fromMe = m.key.fromMe;

    // IMPROVED: Better text extraction for all message types
    let text = '';
    if (m.message?.conversation) text = m.message.conversation;
    else if (m.message?.extendedTextMessage?.text) text = m.message.extendedTextMessage.text;
    else if (m.message?.imageMessage?.caption) text = m.message.imageMessage.caption;
    else if (m.message?.videoMessage?.caption) text = m.message.videoMessage.caption;
    else return; // Not a text-based message

    text = text.trim().toLowerCase();
    if (!text.startsWith('.islam')) return;

    console.log(`[Islam AI] Command received: ${text} from ${m.key.participant || m.key.remoteJid}`);

    const isGroup = chatId.endsWith('@g.us');
    const sender = m.key.participant || m.key.remoteJid;

    // Admin check
    let isAdmin = fromMe;
    if (isGroup && !fromMe) {
        try {
            const meta = await sock.groupMetadata(chatId);
            const participant = meta.participants.find(p => p.id === sender);
            isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
        } catch (err) {
            console.error('Group metadata error:', err);
        }
    }

    if (isGroup && !isAdmin) {
        await sendReply(sock, chatId, '⛔ Only admins can turn the Islam AI on or off here 🙏\n⛔ Admin pekee ndio wanaweza washa au zima Islam AI hapa 🙏', m);
        return;
    }

    const args = text.split(' ');
    const arg = args[1]?.toLowerCase();

    if (arg === 'on') {
        chatbotStates.set(chatId, true);
        await sendReply(sock, chatId, '✅ *Islam AI is now active!* 🫡\nI will reply when mentioned with beneficial Islamic knowledge 🤲🔥\n\n✅ *Islam AI ameanza kufanya kazi sasa!* 🫡\nNitajibu nikimention na ilmu ya Kiislamu yenye manufaa 🤲🔥', m);

    } else if (arg === 'off') {
        chatbotStates.set(chatId, false);
        await sendReply(sock, chatId, '🔇 *Islam AI is resting now...* 😴\nNo mentions, no replies. Peace be upon you 🙏\n\n🔇 *Islam AI amelala sasa...* 😴\nHapana mention, hapana majibu. Amani iwe juu yenu 🙏', m);

    } else {
        const isEnabled = chatbotStates.get(chatId) === true;
        const status = isEnabled ? '✅ *ON*' : '🔇 *OFF* (default)';
        const infoEn = isGroup ? 'Ask an admin to turn it on with .islam on' : 'Private chats are always active 🤲';
        const infoSw = isGroup ? 'Mwambie admin awashe kwa .islam on' : 'Private chat ziko active kila wakati 🤲';

        await sendReply(sock, chatId, `*Islam AI Chatbot Status* | *Hali ya Islam AI Chatbot*\n\nIn this group: ${status}\nDi group hii: \( {status}\n\n \){infoEn}\n${infoSw}\n\nCommands | Amri:\n.islam on → turn on | washa\n.islam off → turn off | zima`, m);
    }
}

// ===== AUTO REPLY HANDLER =====
async function handleChatbotResponse(sock, m) {
    try {
        if (!m || !m.key || !m.key.remoteJid) return;

        const chatId = m.key.remoteJid;
        const fromMe = m.key.fromMe;
        const isGroup = chatId.endsWith('@g.us');

        // Get message text (same improved method)
        let text = '';
        if (m.message?.conversation) text = m.message.conversation;
        else if (m.message?.extendedTextMessage?.text) text = m.message.extendedTextMessage.text;
        else if (m.message?.imageMessage?.caption) text = m.message.imageMessage.caption || '';
        else if (m.message?.videoMessage?.caption) text = m.message.videoMessage.caption || '';
        else return;

        text = text.trim();
        if (!text || fromMe || text.toLowerCase().startsWith('.islam') || chatId.includes('status')) return;

        // Check if enabled
        const explicitState = chatbotStates.get(chatId);
        const isEnabled = explicitState === true || (!isGroup && explicitState !== false);
        if (!isEnabled) return;

        // Mention check
        const context = m.message?.extendedTextMessage?.contextInfo || m.message?.imageMessage?.contextInfo || m.message?.videoMessage?.contextInfo;
        const mentionedJid = context?.mentionedJid || [];
        const botJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;

        const isMentioned = botJid && mentionedJid.includes(botJid);
        if (isGroup && !isMentioned) return;

        // Anti-spam
        const senderId = isGroup ? m.key.participant : m.key.remoteJid;
        if (!senderId) return;
        const spamKey = `\( {chatId}: \){senderId}`;
        const now = Date.now();
        if ((lastReply.get(spamKey) || 0) + 6000 > now) return;
        lastReply.set(spamKey, now);

        if (!shouldReply()) return;

        await showTyping(sock, chatId);

        const replyNow = async () => {
            const aiReply = await getSmartReply(text);
            if (aiReply) {
                await new Promise(r => setTimeout(r, humanDelay()));
                await sendReply(sock, chatId, aiReply, m);
            }
        };

        if (replyLate()) {
            setTimeout(replyNow, 10000 + Math.random() * 20000);
        } else {
            await replyNow();
        }

    } catch (err) {
        console.error('Chatbot error:', err);
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};