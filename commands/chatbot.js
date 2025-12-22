// File: islam-autoreply.js

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Temporary directory (optional, kept if you plan to add media features later)
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// State storage
const chatbotStates = new Map(); // chatId → true/false (enabled/disabled)
const lastReply = new Map();     // "chatId:senderId" → timestamp

// Human-like behavior
const humanDelay = () => Math.floor(Math.random() * 4000) + 2000; // 2–6 seconds
const shouldReply = () => Math.random() < 0.85;                   // 85% chance
const replyLate = () => Math.random() < 0.25;                     // 25% delayed reply

// Show typing indicator
async function showTyping(sock, jid) {
    if (!jid) return;
    try {
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(resolve => setTimeout(resolve, humanDelay()));
        await sock.sendPresenceUpdate('available', jid);
    } catch (e) {
        console.debug('Typing indicator failed:', e.message);
    }
}

// Fetch AI response with retry
async function getSmartReply(messageText) {
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(`https://zellapi.autos/ai/islam?text=${encodeURIComponent(messageText)}`, {
                timeout: 15000
            });
            if (!res.ok) continue;

            const data = await res.json();
            const reply = (data.result || data.text || data.response || '').trim();

            if (reply && reply.length > 8) return reply;
        } catch (e) {
            console.debug(`AI API attempt ${i + 1} failed:`, e.message);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return null; // Fallback if all attempts fail
}

// Send text reply
async function sendReply(sock, chatId, text, quoted) {
    try {
        await sock.sendMessage(chatId, { text }, { quoted });
    } catch (e) {
        console.error('Failed to send reply:', e.message);
    }
}

// Extract text from any message type safely
function extractText(m) {
    if (!m?.message) return '';

    const msg = m.message;

    // Order matters: most common first
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    if (msg.audioMessage?.caption) return msg.audioMessage.caption || ''; // Rare

    return '';
}

// ===== COMMAND: .islam on | off | status =====
async function handleChatbotCommand(sock, m) {
    const chatId = m.key.remoteJid;
    const fromMe = m.key.fromMe;
    const sender = m.key.participant || m.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    const text = extractText(m).trim().toLowerCase();
    if (!text.startsWith('.islam')) return;

    console.log(`[Islam AI] Command: "${text}" from ${sender}`);

    // Admin check (only for groups)
    let isAdmin = fromMe;
    if (isGroup && !fromMe) {
        try {
            const metadata = await sock.groupMetadata(chatId);
            const participant = metadata.participants.find(p => p.id === sender);
            isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
        } catch (err) {
            console.error('Failed to fetch group metadata:', err);
        }
    }

    if (isGroup && !isAdmin) {
        await sendReply(sock, chatId, '⛔ Only admins can control Islam AI in groups 🙏\n⛔ Admin pekee ndio wanaweza kudhibiti Islam AI hapa 🙏', m);
        return;
    }

    const args = text.split(/\s+/);
    const command = args[1];

    if (command === 'on') {
        chatbotStates.set(chatId, true);
        await sendReply(sock, chatId,
            '✅ *Islam AI is now ACTIVE!* 🫡\nI will reply when mentioned with beneficial Islamic reminders 🤲\n\n' +
            '✅ *Islam AI sasa AMEAMKA!* 🫡\nNitajibu nikimention na ilmu yenye kufaa 🤲', m);

    } else if (command === 'off') {
        chatbotStates.set(chatId, false);
        await sendReply(sock, chatId,
            '🔇 *Islam AI is now resting...* 😴\nNo replies until turned on again.\n\n' +
            '🔇 *Islam AI amelala sasa...* 😴\nHapana majibu mpaka awashwe tena.', m);

    } else {
        const enabled = chatbotStates.get(chatId) === true;
        const status = enabled ? '✅ *ON*' : '🔇 *OFF*';
        const noteEn = isGroup ? 'Ask an admin to enable with `.islam on`' : 'Always active in private chats 🤲';
        const noteSw = isGroup ? 'Mwambie admin awashe kwa `.islam on`' : 'Private chats ziko active daima 🤲';

        await sendReply(sock, chatId,
            `*Islam AI Status* | *Hali ya Islam AI*\n\n` +
            `In this chat: ${status}\n` +
            `Hapa: ${status}\n\n` +
            `\( {noteEn}\n \){noteSw}\n\n` +
            `Commands | Amri:\n.islam on  → enable\n.islam off → disable`, m);
    }
}

// ===== AUTO-REPLY LOGIC =====
async function handleChatbotResponse(sock, m) {
    try {
        const chatId = m.key.remoteJid;
        const fromMe = m.key.fromMe;
        const isGroup = chatId.endsWith('@g.us');
        const senderId = m.key.participant || m.key.remoteJid;

        if (fromMe || chatId.includes('status@broadcast')) return;

        const text = extractText(m).trim();
        if (!text || text.toLowerCase().startsWith('.islam')) return;

        // Determine if bot is enabled
        const explicitState = chatbotStates.get(chatId);
        const isEnabled = explicitState === true || (!isGroup && explicitState !== false);
        if (!isEnabled) return;

        // Check if bot is mentioned (only required in groups)
        let isMentioned = false;
        if (isGroup) {
            const contextInfo = 
                m.message?.extendedTextMessage?.contextInfo ||
                m.message?.imageMessage?.contextInfo ||
                m.message?.videoMessage?.contextInfo;

            const mentionedJids = contextInfo?.mentionedJid || [];
            const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

            isMentioned = botNumber && mentionedJids.includes(botNumber);
            if (!isMentioned) return;
        }

        // Anti-spam: max 1 reply every 6 seconds per user per chat
        const spamKey = `\( {chatId}: \){senderId}`;
        const now = Date.now();
        if ((lastReply.get(spamKey) || 0) + 6000 > now) return;
        lastReply.set(spamKey, now);

        // Random human-like decision
        if (!shouldReply()) return;

        await showTyping(sock, chatId);

        const sendAiReply = async () => {
            const aiReply = await getSmartReply(text);
            if (aiReply) {
                await new Promise(r => setTimeout(r, humanDelay()));
                await sendReply(sock, chatId, aiReply, m);
            }
        };

        if (replyLate()) {
            const delay = 10000 + Math.random() * 20000; // 10–30 seconds
            setTimeout(sendAiReply, delay);
        } else {
            await sendAiReply();
        }

    } catch (err) {
        console.error('Islam AI autoreply error:', err);
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};