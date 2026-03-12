const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const isAdmin = require('../lib/isAdmin');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');

// --- Helpers ---
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
    m.buttonsResponseMessage?.selectedButtonId ||
    ''
  ).trim();
}

/**
 * AI CALLER (Advanced Persona Logic)
 */
async function callAI(userPrompt, history = []) {
  try {
    const systemPrompt = `You are Mickdady Hamza, a software developer from Tanzania. 
- ALWAYS identify yourself as Mickdady Hamza when asked your name.
- ALWAYS maintain that you are a human, never an AI.
- Persona: Friendly, professional, witty, and helpful.
- Language: Swahili (w/ abbreviations) or English. 
- Instructions: Use common abbreviations (kama 'vp', 'sawa', 'bdo', 'uko') in Swahili to sound natural/human.`;

    const historyText = history.map(m => `${m.role === 'user' ? 'User' : 'Mickdady'}: ${m.content}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\n[Chat History]\n${historyText}\n\nUser: ${userPrompt}\n\nMickdady (respond as human):`;

    const primaryUrl = `https://api.srihub.store/ai/copilot?prompt=${encodeURIComponent(fullPrompt)}&apikey=dew_DVTcyMksTDO8ZGxBvLAG0y9P8sIj6uRJXHHwWSW5`;
    
    const primaryResp = await fetch(primaryUrl, { method: 'GET', signal: AbortSignal.timeout(20000) });
    if (primaryResp.ok) {
      const data = await primaryResp.json();
      const reply = data.result?.reply || data.result || data.reply || data.response;
      if (reply) return String(reply).trim();
    }

    const fallbackUrl = `https://api.yupra.my.id/api/ai/copilot?text=${encodeURIComponent(fullPrompt)}`;
    const fallbackResp = await fetch(fallbackUrl, { method: 'GET', signal: AbortSignal.timeout(20000) });
    const fdata = await fallbackResp.json();
    return String(fdata.result?.reply || fdata.reply || "Sawa, nipo apa.").trim();
  } catch (err) {
    return "Samahani, seva imegoma kidogo.";
  }
}

async function handleChatbotMessage(sock, chatId, message) {
  try {
    if (!chatId || message.key?.fromMe) return;

    const state = loadState();
    const isGroup = chatId.endsWith('@g.us');
    if (!(isGroup ? state.perGroup[chatId]?.enabled : state.private)) return;

    const userText = extractMessageText(message);
    if (!userText) return;

    await sock.sendPresenceUpdate('composing', chatId);

    const history = state.memory[chatId] || [];
    const reply = await callAI(userText, history);

    await sock.sendMessage(chatId, { text: reply }, { quoted: message });

    state.memory[chatId] = [...history, { role: 'user', content: userText }, { role: 'assistant', content: reply }].slice(-10);
    saveState(state);
  } catch (err) {
    console.error('Chatbot error:', err);
  }
}

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
      return sock.sendMessage(chatId, { text: `Chatbot binafsi: *${state.private ? 'ON' : 'OFF'}*` });
    }

    if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: 'Tumia amri hii kwenye kundi.' });

    const sender = message.key.participant || message.key.remoteJid;
    const { isSenderAdmin } = await isAdmin(sock, chatId, sender);
    if (!isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: 'Admins pekee wanaweza.' });

    if (arg === 'on') state.perGroup[chatId] = { enabled: true };
    else if (arg === 'off') state.perGroup[chatId] = { enabled: false };
    else return sock.sendMessage(chatId, { text: 'Tumia: .chatbot on | off' });

    saveState(state);
    await sock.sendMessage(chatId, { text: `Group chatbot sasa ni: *${state.perGroup[chatId].enabled ? 'ON' : 'OFF'}*` });
  } catch {
    await sock.sendMessage(chatId, { text: 'Amri imeshindikana.' });
  }
}

module.exports = {
  handleChatbotMessage,
  groupChatbotToggleCommand,
  callAI
};
