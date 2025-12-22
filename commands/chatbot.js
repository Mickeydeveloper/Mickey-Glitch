// File: islam-autoreply.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Maps
const lastReply = new Map();      // Anti-spam: per user per chat
const chatbotStates = new Map();  // Per-chat state: true = ON, false = OFF, undefined = default (OFF in groups)

// Human-like behavior
const humanDelay = () => Math.floor(Math.random() * 5000) + 2000;
const shouldReply = () => Math.random() < 0.82;  // 82% chance to reply
const replyLate = () => Math.random() < 0.20;    // 20% chance to reply late

// Typing animation
async function showTyping(sock, jid) {
    try {
        if (!jid) return;
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(r => setTimeout(r, humanDelay()));
        await sock.sendPresenceUpdate('available', jid);
    } catch (e) {
        console.debug('Typing indicator failed:', jid);
    }
}

// AI Reply from ZellAPI Islam endpoint
async function getSmartReply(messageText, senderName = "jamaa") {
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
    return null; // Silent if API down
}

// Send reply
async function sendReply(sock, chatId, text, quoted) {
    try {
        await sock.sendMessage(chatId, { text }, { quoted });
    } catch (e) {
        console.error('Send reply failed:', e.message);
    }
}

// Command: .islam on/off/status (admin only in groups)
async function handleChatbotCommand(sock, m) {
    // FIX: Safety check for m.key
    if (!m || !m.key || !m.key.remoteJid) return;

    const chatId = m.key.remoteJid;
    const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim().toLowerCase();
    if (!text.startsWith('.islam')) return;

    const isGroup = chatId.endsWith('@g.us');
    const fromMe = m.key.fromMe;
    const sender = m.key.participant || m.key.remoteJid;

    // Check if user is admin (in groups)
    let isAdmin = fromMe;
    if (isGroup && !fromMe) {
        try {
            const meta = await sock.groupMetadata(chatId);
            const participant = meta.participants.find(p => p.id === sender);
            isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
        } catch (err) {
            console.error('Failed to get group metadata:', err);
        }
    }

    if (isGroup && !isAdmin) {
        await sock.sendMessage(chatId, { text: '⛔ Only admins can turn the Islam AI on or off here 🙏\n⛔ Admin pekee ndio wanaweza washa au zima Islam AI hapa 🙏' }, { quoted: m });
        return;
    }

    const args = text.split(' ');
    const arg = args[1]?.toLowerCase();

    if (arg === 'on') {
        chatbotStates.set(chatId, true);
        await sock.sendMessage(chatId, { 
            text: '✅ *Islam AI is now active!* 🫡\nI will reply when mentioned with beneficial Islamic knowledge 🤲🔥\n\n✅ *Islam AI ameanza kufanya kazi sasa!* 🫡\nNitajibu nikimention na ilmu ya Kiislamu yenye manufaa 🤲🔥' 
        }, { quoted: m });

    } else if (arg === 'off') {
        chatbotStates.set(chatId, false);
        await sock.sendMessage(chatId, { 
            text: '🔇 *Islam AI is resting now...* 😴\nNo mentions, no replies. Peace be upon you 🙏\n\n🔇 *Islam AI amelala sasa...* 😴\nHapana mention, hapana majibu. Amani iwe juu yenu 🙏' 
        }, { quoted: m });

    } else {
        // Show current status
        const isEnabled = chatbotStates.get(chatId) === true;
        const status = isEnabled ? '✅ *ON*' : '🔇 *OFF* (default)';
        const infoEn = isGroup ? 'Ask an admin to turn it on with .islam on' : 'Private chats are always active 🤲';
        const infoSw = isGroup ? 'Mwambie admin awashe kwa .islam on' : 'Private chat ziko active kila wakati 🤲';

        await sock.sendMessage(chatId, { 
            text: `*Islam AI Chatbot Status* | *Hali ya Islam AI Chatbot*\n\nIn this group: ${status}\nDi group hii: \( {status}\n\n \){infoEn}\n${infoSw}\n\nCommands | Amri:\n.islam on → turn on | washa\n.islam off → turn off | zima` 
        }, { quoted: m });
    }
}

// Main response handler
async function handleChatbotResponse(sock, m) {
    try {
        // FIX: Safety check for m and m.key
        if (!m || !m.key || !m.key.remoteJid) return;

        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const fromMe = m.key.fromMe;

        // Determine if chatbot is enabled
        const explicitState = chatbotStates.get(chatId);
        const isEnabled = explicitState === true || (!isGroup && explicitState !== false);

        if (!isEnabled) return; // OFF in this group or disabled

        // Ignore own messages, commands, status
        const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim();
        if (!text || fromMe || text.startsWith('.') || chatId.includes('status')) return;

        // Correct sender ID for anti-spam
        const senderId = isGroup ? m.key.participant : m.key.remoteJid;
        if (!senderId) return;

        // Check if bot is mentioned
        const context = m.message?.extendedTextMessage?.contextInfo;
        const mentionedJid = context?.mentionedJid || [];
        const quotedMention = context?.quotedMessage?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const botJid = sock.user?.id ? sock.user.id.replace(/:\d+/, '') + '@s.whatsapp.net' : null;

        const isMentioned = botJid && (mentionedJid.includes(botJid) || quotedMention.includes(botJid));

        // Reply only if: private chat OR mentioned in group
        if (isGroup && !isMentioned) return;

        // Anti-spam: 6 seconds per user per chat
        const spamKey = `\( {chatId}: \){senderId}`;
        const now = Date.now();
        if ((lastReply.get(spamKey) || 0) + 6000 > now) return;
        lastReply.set(spamKey, now);

        if (!shouldReply()) return; // Human-like: sometimes ignore

        await showTyping(sock, chatId);

        const replyNow = async () => {
            const aiReply = await getSmartReply(text, m.pushName || "Brother");
            if (aiReply) {
                await new Promise(r => setTimeout(r, humanDelay()));
                await sendReply(sock, chatId, aiReply, m);
            }
        };

        if (replyLate()) {
            const delay = 10000 + Math.random() * 20000;
            setTimeout(replyNow, delay);
        } else {
            await replyNow();
        }

    } catch (err) {
        console.error('Chatbot response error:', err);
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};