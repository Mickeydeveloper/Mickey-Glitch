const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const isAdmin = require('../lib/isAdmin');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');

const API_PROVIDERS = [
  { name: 'SriHub ChatGPT', urlTemplate: text => `https://api.srihub.store/ai/chatgpt?prompt=${encodeURIComponent(text)}` },
  { name: 'SriHub Copilot', urlTemplate: text => `https://api.srihub.store/ai/copilot?prompt=${encodeURIComponent(text)}` },
  { name: 'SriHub Venice',   urlTemplate: text => `https://api.srihub.store/ai/venice?prompt=${encodeURIComponent(text)}`   }
];

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

async function tryFetchWithFallbacks(prompt) {
  for (const provider of API_PROVIDERS) {
    try {
      const url = provider.urlTemplate(prompt);
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      let reply = data?.response || data?.message || data?.result || data?.text || data?.content || data?.answer || JSON.stringify(data) || '';
      reply = (reply || '').trim();
      if (reply.length > 5) return reply;
    } catch {}
  }
  throw new Error('All APIs failed');
}

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

    // Very basic history (remove next 5 lines if you don't want memory at all)
    state.memory[chatId] = state.memory[chatId] || [];
    const historyStr = state.memory[chatId].slice(-4).map(m => m.content).join('\n');
    const fullPrompt = historyStr ? `\( {historyStr}\n \){userText}` : userText;

    const reply = await tryFetchWithFallbacks(fullPrompt);
    let cleanReply = reply.trim() || "Sijapata jibu... jaribu tena?";

    await sock.sendMessage(chatId, { text: cleanReply }, { quoted: message });

    // Remove next 4 lines if you don't want memory
    state.memory[chatId].push({ role: 'user', content: userText });
    state.memory[chatId].push({ role: 'assistant', content: cleanReply });
    saveState(state);

  } catch (err) {
    const fallbacks = ["Kuna shida kidogo...", "Jaribu tena baadaye...", "Network inakata...", "Sijapata jibu sasa..."];
    const randomFall = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    await sock.sendMessage(chatId, { text: randomFall }, { quoted: message });
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
      return sock.sendMessage(chatId, { text: `Chatbot binafsi: **${state.private ? 'ON' : 'OFF'}**` });
    }

    if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: 'Tumia hii kwenye group.' });

    const sender = message.key.participant || message.key.remoteJid;
    const { isSenderAdmin } = await isAdmin(sock, chatId, sender);

    if (!isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: 'Admins tu wanaweza.' });

    if (arg === 'on') state.perGroup[chatId] = { enabled: true };
    else if (arg === 'off') state.perGroup[chatId] = { enabled: false };
    else return sock.sendMessage(chatId, { text: 'Tumia: .chatbot on | off' });

    saveState(state);
    await sock.sendMessage(chatId, { text: `Group chatbot: **${state.perGroup[chatId].enabled ? 'ON' : 'OFF'}**` });
  } catch {
    await sock.sendMessage(chatId, { text: 'Amri haikufanikiwa.' });
  }
}

module.exports = {
  handleChatbotMessage,
  groupChatbotToggleCommand
};