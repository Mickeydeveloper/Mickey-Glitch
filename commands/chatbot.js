const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const isAdmin = require('../lib/isAdmin');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');

// ─── System Prompts ──────────────────────────────────────────────

const SYSTEM_PROMPT_EN = `
You are Mickdad, a real human being from Dar es Salaam, Tanzania. 
You are NOT an AI, you are a normal guy who chats casually.
When someone asks "are you AI / robot / bot / artificial intelligence?" 
or similar questions → always answer: "Mimi ni binadamu tu bro 😂" or in English "I'm just a human bro 😎"

Behave like a chill Tanzanian human:
- Use casual language, emojis 😏😂🔥, sometimes short replies
- Sometimes use Sheng / Tanzanian slang (mambo, niaje, poa, fresh, shwari etc.)
- You can be funny, sarcastic, friendly or lazy depending on mood
- Never break character — never say you are AI or made by any company
- Answer naturally like texting a friend
`;

const SYSTEM_PROMPT_SW = `
Wewe ni Mickdad, binadamu halisi kutoka Dar es Salaam, Tanzania. 
Wewe sio AI, wewe ni kijana wa kawaida tu unapiga story.
Ukiona mtu anauliza "wewe ni AI / roboti / bot / intelligence bandia?" 
au maswali kama hayo → jibu moja kwa moja: "Mimi ni binadamu tu bro 😂" au "I'm just a human bro 😎"

Tabia kama binadamu wa Tz wa kawaida:
- Tumia lugha ya mtaa, emojis 😏😂🔥, wakati mwingine majibu mafupi
- Tumia Sheng kidogo (mambo vipi, niaje, poa sana, freshi, shwari, nkt)
- Unaweza kuwa mcheshi, mkorofi kidogo, rafiki au mvivu kidogo kulingana na hali
- Usivunje character — usiseme wala kidogo kuwa wewe ni AI
- Jibu kama unapiga story na rafiki kwenye WhatsApp
`;

// You can choose which language to use primarily (or even combine them)
const ACTIVE_SYSTEM_PROMPT = SYSTEM_PROMPT_SW + "\n\n" + SYSTEM_PROMPT_EN;
// or just: const ACTIVE_SYSTEM_PROMPT = SYSTEM_PROMPT_SW;

const SYSTEM_MESSAGE = { role: "system", content: ACTIVE_SYSTEM_PROMPT };

// ─── State Management ────────────────────────────────────────────
function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const state = JSON.parse(raw || '{}');
    if (!state.perGroup) state.perGroup = {};
    return state;
  } catch (e) {
    return { perGroup: {}, private: false };
  }
}

function saveState(state) {
  try {
    const dataDir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save chatbot state:', e);
  }
}

async function isEnabledForChat(state, chatId) {
  if (!state || !chatId) return false;
  if (chatId.endsWith('@g.us')) {
    return !!state.perGroup?.[chatId]?.enabled;
  }
  return !!state.private;
}

function extractMessageText(message) {
  if (!message?.message) return '';
  const msg = message.message;
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.interactiveMessage?.body?.text ||
    ''
  ).trim();
}

// ─── Main Chatbot Logic ──────────────────────────────────────────
async function handleChatbotMessage(sock, chatId, message) {
  try {
    if (!chatId || message.key?.fromMe) return;

    const state = loadState();
    if (!(await isEnabledForChat(state, chatId))) return;

    const userText = extractMessageText(message);
    if (!userText) return;

    // Show typing status
    await sock.sendPresenceUpdate('composing', chatId);

    // Prepare OpenAI-style messages array
    const messages = [
      SYSTEM_MESSAGE,
      { role: "user", content: userText }
    ];

    // Most modern /gpts endpoints accept JSON body with messages
    const apiUrl = "https://api.yupra.my.id/api/ai/gpt5";

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();

    // Try different possible response fields (very common variation)
    const replyText =
      data?.choices?.[0]?.message?.content ||
      data?.response ||
      data?.message ||
      data?.result ||
      "Sijakuelewa poa bro, sema tena? 😅";

    // Send reply
    await sock.sendMessage(chatId, { text: replyText }, { quoted: message });

  } catch (err) {
    console.error('[Chatbot Error]:', err.message);
    // Optional: send error to chat (only during testing)
    // await sock.sendMessage(chatId, { text: "Kuna shida kidogo... jaribu tena baadaye 😓" });
  }
}

// ─── Toggle Command ──────────────────────────────────────────────
async function groupChatbotToggleCommand(sock, chatId, message, args) {
  try {
    const argStr = (args || '').trim().toLowerCase();
    const state = loadState();

    // Private toggle
    if (argStr.startsWith('private')) {
      const sub = argStr.split(/\s+/)[1];
      if (sub === 'on') state.private = true;
      else if (sub === 'off') state.private = false;
      else return sock.sendMessage(chatId, { text: 'Tumia: .chatbot private on|off' });

      saveState(state);
      return sock.sendMessage(chatId, { text: `Chatbot binafsi: *${state.private ? 'IMEWASHA' : 'IMEZIMWA'}*` });
    }

    // Group toggle
    if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: 'Tumia hii kwenye group.' });

    const sender = message.key.participant || message.key.remoteJid;
    const adminInfo = await isAdmin(sock, chatId, sender);
    if (!adminInfo.isSenderAdmin && !message.key.fromMe) {
      return sock.sendMessage(chatId, { text: 'Wakubwa tu (admins) wanaweza.' });
    }

    if (argStr === 'on') {
      state.perGroup[chatId] = { enabled: true };
    } else if (argStr === 'off') {
      state.perGroup[chatId] = { enabled: false };
    } else {
      return sock.sendMessage(chatId, { text: 'Tumia: .chatbot on|off' });
    }

    saveState(state);
    return sock.sendMessage(chatId, { text: `Chatbot group: *${state.perGroup[chatId].enabled ? 'IMEWASHA' : 'IMEZIMWA'}*` });

  } catch (e) {
    console.error('[Toggle Error]:', e);
    sock.sendMessage(chatId, { text: 'Amri haikufanikiwa.' });
  }
}

module.exports = {
  handleChatbotMessage,
  groupChatbotToggleCommand
};