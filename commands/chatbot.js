// File: mickey-autoreply.js
const fetch = require('node-fetch');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const lastReply = new Map(); // Anti-spam per user per chat
const chatbotStates = new Map(); // Per-chat chatbot enabled/disabled state

// Human-like random delay: 2–7 seconds
const humanDelay = () => Math.floor(Math.random() * 5000) + 2000;

// 18% chance to reply late (feels like a real person who doesn't reply to everything)
const shouldReply = () => Math.random() < 0.82;

// 20% chance to reply late (10–30 sec) → super realistic
const replyLate = () => Math.random() < 0.20;

// Show typing animation (works in groups & private)
async function showTyping(sock, jid) {
    try {
        if (!jid) return; // Safety check
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(r => setTimeout(r, humanDelay()));
        await sock.sendPresenceUpdate('available', jid);
    } catch (e) {
        // Silently fail if typing not supported (some clients/groups)
        console.debug('Typing indicator not available for', jid);
    }
}

// Free & fast AI (Gemini-based)
async function getSmartReply(message, name = "jamaa") {
    const prompt = `Kama Mickey, msee wa Westlands, mjanja na mcheshi, umezaliwa 1998.
Jibu fupi tu (1-3 sentensi), tumia sheng, emoji nyingi 😂😭🙄😏🤣, usiseme wewe ni bot.

${name} anasema: "${message}"

Jibu tu kama Mickey bila intro:`;

    try {
        const res = await fetch(`https://okatsu-rolezapiiz.vercel.app/ai/gemini?text=${encodeURIComponent(prompt)}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        return (data.result || data.text || "Wee 😂😂").trim();
    } catch (error) {
        console.error('Chatbot API error:', error.message);
        const fallbacks = [
            "Haha wee 😂", "Ati nini sasa 😅", "Poa tu bro", "Si unajua 😂",
            "Eish 🙄", "Mahn lmao", "Sawa boss", "Haha kwani?", "Wee si umekuja poa 😂"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}


// Always reply with text from API
async function sendTextReply(sock, chatId, text, message) {
    try {
        await sock.sendMessage(chatId, { text }, { quoted: message });
    } catch (error) {
        console.error('Error sending text reply:', error.message);
    }
}

// Command: .chatbot on/off (admin in groups, anyone in private)
async function handleChatbotCommand(sock, chatId, message, match) {
    try {
        const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').toLowerCase();
        if (!text.startsWith('.chatbot')) return;

        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = message.key.fromMe;
        
        // In groups, require admin; in private, allow anyone
        let isAdmin = isOwner;
        if (!isAdmin && isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(chatId);
                const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                isAdmin = admins.includes(senderId);
            } catch (e) {
                console.error('Error checking admin status:', e.message);
                isAdmin = false;
            }
        }

        // In groups: admin only; in private: always allow
        if (isGroup && !isAdmin) {
            await sock.sendMessage(chatId, { text: '⛔ Only group admins can use this command.', quoted: message });
            return;
        }

        const arg = match ? match.trim().toLowerCase() : '';

        if (arg === 'on') {
            chatbotStates.set(chatId, true);
            await sock.sendMessage(chatId, { text: '✅ *Chatbot enabled* — I\'ll respond like a real person now 😂' }, { quoted: message });
            return;
        }
        if (arg === 'off') {
            chatbotStates.set(chatId, false);
            await sock.sendMessage(chatId, { text: '🔇 *Chatbot disabled*' }, { quoted: message });
            return;
        }

        const currentState = chatbotStates.get(chatId) !== false ? '✅ Enabled' : '🔇 Disabled';
        await sock.sendMessage(chatId, { 
            text: `*Chatbot Status*: ${currentState}\n\n*.chatbot on* → enable\n*.chatbot off* → disable` 
        }, { quoted: message });
    } catch (error) {
        console.error('Error in handleChatbotCommand:', error);
    }
}

// Main chatbot function (works in group & private)
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    try {
        // Check if chatbot is enabled for this chat (default: enabled)
        const isChatbotEnabled = chatbotStates.get(chatId) !== false;
        if (!isChatbotEnabled) return;

        const text = userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '';

        // Ignore empty, bot's own messages, status updates
        if (!text || message.key.fromMe || chatId.includes('status')) return;

        // Ignore if this looks like a command (starts with .)
        if (text.startsWith('.')) return;

        // Anti-spam: max 1 reply every 5 seconds per sender per chat
        const spamKey = `${chatId}:${senderId}`;
        const now = Date.now();
        const last = lastReply.get(spamKey) || 0;
        if (now - last < 5000) return;
        lastReply.set(spamKey, now);

        // Decide whether to reply (feels real)
        if (!shouldReply()) return;

        // Show typing indicator (works in both groups & private)
        await showTyping(sock, chatId);

        const replyNow = async () => {
            try {
                const reply = await getSmartReply(text, message.pushName || "Bro");
                await new Promise(r => setTimeout(r, humanDelay()));
                await sendTextReply(sock, chatId, reply, message);
            } catch (error) {
                console.error('Error sending reply:', error.message);
            }
        };

        // Randomly delay reply (10-30 sec) for realism
        if (replyLate()) {
            const delay = 10000 + Math.random() * 20000;
            setTimeout(replyNow, delay).catch(err => console.error('Delayed reply error:', err));
        } else {
            await replyNow();
        }
    } catch (error) {
        console.error('Error in handleChatbotResponse:', error);
    }
}

// Required export format
module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
