const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const isAdmin = require('../lib/isAdmin');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');

// ─── Single API (you can change this URL if needed) ────────────────────────
const API_URL_TEMPLATE = text => `https://api.srihub.store/ai/chatgpt?prompt=${encodeURIComponent(text)}`;

// ─── System Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PREFIX = `
You are Mickdady, msee wa mtaa halisi kutoka Dar es Salaam, Tanzania. 
Wewe ni binadamu 100%, si AI, si bot. 
Ukiona swali kama "wewe ni AI?" au "are you bot/robot?" → jibu: "Mimi ni binadamu tu bro 😂 si AI hata kidogo!"

Vibe: Chill TZ street style – mambo, niaje, poa, fresh, shwari, nkt, emojis 😂🔥💀😏
Jibu kama texting rafiki WhatsApp: mafupi wakati mwingine, Sheng kidogo, funny/friendly/mkorofi kidogo.
Usivunje character – usiseme wewe ni AI au code.
`;

// ─── State + Simple Memory ─────────────────────────────────────────────────
function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false, memory: {} };
    const data = fs.readFileSync(STATE_PATH, 'utf8');
    const state = JSON.parse(data || '{}');
    state.perGroup = state.perGroup || {};
    state.memory = state.memory || {};
    return state;
  } catch {
    return { perGroup: {}, private: false, memory: {} };
  }
}

function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

function extractMessageText(msg) {
  if (!msg?.message) return '';
  const m = msg.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.interactiveMessage?.body?.text ||
    m.listResponseMessage?.description ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    ''
  ).trim();
}

// ─── Main Handler ──────────────────────────────────────────────────────────
async function handleChatbotMessage(sock, chatId, message) {
  try {
    if (!chatId || message.key?.fromMe) return;

    const state = loadState();
    const isGroup = chatId.endsWith('@g.us');
    const enabled = isGroup ? state.perGroup[chatId]?.enabled : state.private;
    if (!enabled) return;

    const userText = extractMessageText(message);
    if (!userText) return;

    await sock.sendPresenceUpdate('composing', chatId);

    // Build full prompt: system + short history + current message
    state.memory[chatId] = state.memory[chatId] || [];
    const historyStr = state.memory[chatId].slice(-4).map(m => 
      m.role === 'user' ? `User: ${m.content}` : `Mickdady: ${m.content}`
    ).join('\n');

    const fullPrompt = `\( {SYSTEM_PREFIX}\n\n \){historyStr ? historyStr + '\n' : ''}User: ${userText}\nMickdady:`;

    // Call the single API
    const url = API_URL_TEMPLATE(fullPrompt);
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`API status ${res.status}`);
    }

    const data = await res.json();
    
    // Try to extract reply (these APIs return different fields)
    let reply = 
      data?.response ||
      data?.message ||
      data?.result ||
      data?.text ||
      data?.content ||
      data?.answer ||
      JSON.stringify(data) ||
      '';

    reply = reply.trim();

    // Clean up a bit
    reply = reply
      .replace(/^Mickdady:\s*/i, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    if (!reply || reply.length < 8) {
      reply = "Aisee bro, nimekosa mawazo kidogo... sema tena? 😅";
    }

    await sock.sendMessage(chatId, { text: reply }, { quoted: message });

    // Save memory
    state.memory[chatId].push({ role: 'user', content: userText });
    state.memory[chatId].push({ role: 'assistant', content: reply });
    saveState(state);

  } catch (err) {
    console.error('[Chatbot Error]', chatId, err.message);
    const fallbacks = [
      "Bro net inakata ama API imechill 😭 Jaribu tena kidogo!",
      "Kuna shida kidogo na connection... Mickdady ako offline sekunde 🔥",
      "Aisee nimehang kidogo 😂 Sema tena tu bro 😏",
      "Hapo nimekosa signal... nikuambie nini kingine?"
    ];
    const randomFall = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    await sock.sendMessage(chatId, { text: randomFall }, { quoted: message });
  }
}

// ─── Toggle Command ────────────────────────────────────────────────────────
async function groupChatbotToggleCommand(sock, chatId, message, args = '') {
  try {
    const arg = args.trim().toLowerCase();
    const state = loadState();

    if (arg.startsWith('private')) {
      const sub = arg.split(/\s+/)[1] || '';
      if (sub === 'on') state.private = true;
      else if (sub === 'off') state.private = false;
      else return sock.sendMessage(chatId, { text: 'Tumia: .chatbot private on | off' });

      saveState(state);
      return sock.sendMessage(chatId, { text: `Chatbot binafsi: **${state.private ? 'IMEWASHA 🔥' : 'IMEZIMWA'}**` });
    }

    if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, { text: 'Amri hii ni ya group tu.' });
    }

    const sender = message.key.participant || message.key.remoteJid;
    const { isSenderAdmin } = await isAdmin(sock, chatId, sender);

    if (!isSenderAdmin && !message.key.fromMe) {
      return sock.sendMessage(chatId, { text: 'Admins pekee wanaweza kuwasha/zima.' });
    }

    if (arg === 'on') {
      state.perGroup[chatId] = { enabled: true };
    } else if (arg === 'off') {
      state.perGroup[chatId] = { enabled: false };
    } else {
      return sock.sendMessage(chatId, { text: 'Tumia: .chatbot on | off' });
    }

    saveState(state);
    await sock.sendMessage(chatId, { text: `Group chatbot: **${state.perGroup[chatId].enabled ? 'IMEWASHA 🔥' : 'IMEZIMWA'}**` });

  } catch (e) {
    console.error('[Toggle Error]', e);
    await sock.sendMessage(chatId, { text: 'Kuna hitilafu kidogo 😓' });
  }
}

module.exports = {
  handleChatbotMessage,
  groupChatbotToggleCommand
};