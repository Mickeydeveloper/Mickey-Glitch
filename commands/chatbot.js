// File: mickey-autoreply.js
const fetch = require('node-fetch');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP(TEMP_DIR, { recursive: true });

const lastReply = new Map(); // Anti-spam per user

// Human-like random delay: 2–7 seconds
const humanDelay = () => Math.floor(Math.random() * 5000) + 2000;

// 18% chance to reply late (feels like a real person who doesn't reply to everything)
const shouldReply = () => Math.random() < 0.82;

// 20% chance to reply late (10–30 sec) → super realistic
const replyLate = () => Math.random() < 0.20;

// Show typing animation
async function showTyping(sock, jid) {
    try {
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(r => setTimeout(r, humanDelay()));
        await sock.sendPresenceUpdate('available', jid);
    } catch (e) {}
}

// Free & fast AI (Gemini-based)
async function getSmartReply(message, name = "jamaa") {
    const prompt = `Kama Mickey, msee wa Westlands, mjanja na mcheshi, umezaliwa 1998.
Jibu fupi tu (1-3 sentensi), tumia sheng, emoji nyingi 😂😭🙄😏🤣, usiseme wewe ni bot.

\( {name} anasema: " \){message}"

Jibu tu kama Mickey bila intro:`;

    try {
        const res = await fetch(`https://api.nyx.my.id/api/ai/gemini?text=${encodeURIComponent(prompt)}`);
        const data = await res.json();
        return data.result?.trim() || "Wee 😂😂";
    } catch {
        const fallbacks = [
            "Haha wee 😂", "Ati nini sasa 😅", "Poa tu bro", "Si unajua 😂",
            "Eish 🙄", "Mahn lmao", "Sawa boss", "Haha kwani?", "Wee si umekuja poa 😂"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// Send voice note (PTT) or fallback to text
async function sendVoiceOrText(sock, jid, text, quoted) {
    const filePath = path.join(TEMP_DIR, `voice_${Date.now()}.mp3`);

    try {
        await new Promise((resolve, reject) => {
            new gTTS(text, 'sw').save(filePath, err => {
                err ? reject(err) : resolve();
            });
        });

        await sock.sendMessage(jid, {
            audio: fs.readFileSync(filePath),
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted });

        setTimeout(() => fs.unlink(filePath, () => {}), 6000);
    } catch {
        await sock.sendMessage(jid, { text }, { quoted });
    }
}

// Command: .autoreply on/off (admin only)
async function handleChatbotCommand(sock, m, prefix) {
    const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '');
    if (!text.toLowerCase().startsWith(prefix + 'autoreply')) return;

    const jid = m.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const sender = m.key.participant || m.key.remoteJid;
    const isAdmin = m.isAdmin || m.isCreator || sender === sock.user.id.split(':')[0] + '@s.whatsapp.net';

    if (!isAdmin && isGroup) {
        return m.reply('Hii command ni ya admin tu boss');
    }

    const arg = text.slice(prefix.length).trim().split(' ')[1];

    if (arg === 'on') {
        global.autoReplyEnabled = true;
        return m.reply('*AutoReply imewezeshwa* — sasa nitareply kila mtu kama msee halisi 😂');
    }
    if (arg === 'off') {
        global.autoReplyEnabled = false;
        return m.reply('AutoReply imezimwa');
    }

    m.reply(`*.autoreply on* → washa auto reply\n*.autoreply off* → zima\n\nSasa niko live kama Mickey wa mtaa 😂`);
}

// Main auto-reply function (works in group & private)
async function handleChatbotResponse(sock, m) {
    // Only run if enabled
    if (!global.autoReplyEnabled) return;

    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';

    // Ignore empty, bot's own messages, status
    if (!text || m.key.fromMe || jid.includes('status')) return;

    // Anti-spam: max 1 reply every 5 seconds per person
    const now = Date.now();
    const last = lastReply.get(sender) || 0;
    if (now - last < 5000) return;
    lastReply.set(sender, now);

    // Decide whether to reply (feels real)
    if (!shouldReply()) return;

    // Show typing
    await showTyping(sock, jid);

    const replyNow = async () => {
        const reply = await getSmartReply(text, m.pushName || "Bro");
        await new Promise(r => setTimeout(r, humanDelay()));
        await sendVoiceOrText(sock, jid, reply, m);
    };

    if (replyLate()) {
        const delay = 10000 + Math.random() * 20000;
        setTimeout(replyNow, delay);
    } else {
        await replyNow();
    }
}

// Required export format
module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};