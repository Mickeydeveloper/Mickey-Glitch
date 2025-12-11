// File: mickey-autoreply.js
const fetch = require('node-fetch');

const TEMP_DIR = './temp';
require('fs').mkdirSync(TEMP_DIR, { recursive: true });

const lastReply = new Map(); // Anti-spam: per user per chat
const chatbotStates = new Map(); // Per-chat enable/disable

// Human-like delays
const humanDelay = () => Math.floor(Math.random() * 5000) + 2000;
const shouldReply = () => Math.random() < 0.82;     // 82% reply chance
const replyLate = () => Math.random() < 0.20;       // 20% chance to reply 10–30s late

// Typing animation
async function showTyping(sock, jid) {
    try {
        if (!jid) return;
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(r => setTimeout(r, humanDelay()));
        await sock.sendPresenceUpdate('available', jid);
    } catch (e) {
        console.debug('Typing not supported:', jid);
    }
}

// Pure API reply — no fallback text, only real AI response
async function getSmartReply(messageText, senderName = "jamaa") {
    const prompt = `Kama Mickey, msee wa Westlands, mzaliwa wa '98, mjanja na mcheshi sana.
Jibu fupi tu (1-3 sentensi), tumia sheng nyingi, emoji kama 😂😭🤣🙄😏🫵, natural kama msee anachapia kwa group.
Usiseme chochote kuhusu bot au AI.

\( {senderName}: " \){messageText}"

Jibu tu kama Mickey bila intro yoyote:`;

    for (let i = 0; i < 3; i++) { // retry up to 3 times
        try {
            const res = await fetch(`https://okatsu-rolezapiiz.vercel.app/ai/gemini?text=${encodeURIComponent(prompt)}`, {
                timeout: 12000
            });
            if (!res.ok) continue;
            const data = await res.json();
            const reply = (data.result || data.text || "").trim();
            if (reply && reply.length > 5) return reply; // valid reply
        } catch (e) {
            console.debug(`API attempt ${i+1} failed:`, e.message);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return null; // no reply if API completely down
}

// Send only text reply (quoted)
async function sendReply(sock, chatId, text, quoted) {
    try {
        await sock.sendMessage(chatId, { text }, { quoted });
    } catch (e) {
        console.error('Failed to send reply:', e.message);
    }
}

// .chatbot on/off command (admin only in groups)
async function handleChatbotCommand(sock, m) {
    const chatId = m.key.remoteJid;
    const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase();
    if (!text.startsWith('.chatbot')) return;

    const isGroup = chatId.endsWith('@g.us');
    const fromMe = m.key.fromMe;
    const sender = m.key.participant || m.key.remoteJid;

    let isAdmin = fromMe;
    if (isGroup && !fromMe) {
        try {
            const meta = await sock.groupMetadata(chatId);
            isAdmin = meta.participants.find(p => p.id === sender)?.admin;
        } catch {}
    }

    if (isGroup && !isAdmin) {
        await sock.sendMessage(chatId, { text: '⛔ Admins tu wanaeza control hii feature bro' }, { quoted: m });
        return;
    }

    const arg = text.split(' ')[1];

    if (arg === 'on') {
        chatbotStates.set(chatId, true);
        await sock.sendMessage(chatId, { text: '✅ Mickey ako online sasa 😂🫵' }, { quoted: m });
    } else if (arg === 'off') {
        chatbotStates.set(chatId, false);
        await sock.sendMessage(chatId, { text: '🔇 Mickey amelala... 😴' }, { quoted: m });
    } else {
        const status = chatbotStates.get(chatId) !== false ? '✅ ON' : '🔇 OFF';
        await sock.sendMessage(chatId, { text: `*Mickey Mode*: ${status}\n\n.chatbot on → washa\n.chatbot off → zima` }, { quoted: m });
    }
}

// Main handler — replies ONLY on mention (or always in private)
async function handleChatbotResponse(sock, m) {
    try {
        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const fromMe = m.key.fromMe;
        const senderId = m.key.participant || chatId;

        // Chatbot disabled?
        if (chatbotStates.get(chatId) === false) return;

        // Ignore own messages, commands, status
        const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim();
        if (!text || fromMe || text.startsWith('.') || chatId.includes('status')) return;

        // === REPLY CONDITION ===
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const isQuotedMention = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isMentioned = mentioned.includes(botNumber) || isQuotedMention.includes(botNumber);

        // In private → always reply | In group → only when tagged
        if (!isGroup || isMentioned) {
            // Anti-spam: 1 reply per 6 sec per person
            const key = `\( {chatId}: \){senderId}`;
            const now = Date.now();
            if ((lastReply.get(key) || 0) + 6000 > now) return;
            lastReply.set(key, now);

            if (!shouldReply()) return; // skip sometimes → feels human

            await showTyping(sock, chatId);

            const replyNow = async () => {
                const aiReply = await getSmartReply(text, m.pushName || "Bro");
                if (aiReply) {
                    await new Promise(r => setTimeout(r, humanDelay()));
                    await sendReply(sock, chatId, aiReply, m);
                }
            };

            if (replyLate()) {
                const late = 10000 + Math.random() * 20000;
                setTimeout(replyNow, late);
            } else {
                await replyNow();
            }
        }
    } catch (err) {
        console.error('Chatbot error:', err);
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};