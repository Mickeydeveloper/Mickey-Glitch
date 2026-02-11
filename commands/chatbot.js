const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const isAdmin = require('../lib/isAdmin');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');

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
 * AI CALLER - Direct User Prompt Only
 */
async function callAI(userPrompt) {
  try {
    // API URL using Hansa SriHub Copilot API
    const apiUrl = `https://api.srihub.store/ai/copilot?prompt=${encodeURIComponent(userPrompt)}&apikey=dew_DVTcyMksTDO8ZGxBvLAG0y9P8sIj6uRJXHHwWSW5`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(20000) 
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data = await response.json();
    
    // Extract reply from Hansa API response
    const reply = data.result?.reply || data.result || data.reply || data.response || (typeof data === 'string' ? data : null);

    if (!reply) throw new Error('Nilipata data tupu.');

    return reply.trim();
  } catch (err) {
    console.error('AI call failed:', err.message);
    throw err;
  }
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

    const reply = await callAI(userText);
    let cleanReply = reply || "Samahani, siwezi kujibu kwa sasa.";

    await sock.sendMessage(chatId, { text: cleanReply }, { quoted: message });

    // Kumbukumbu (Memory) kwa ajili ya chatbot.json
    state.memory[chatId] = state.memory[chatId] || [];
    state.memory[chatId].push({ role: 'user', content: userText });
    state.memory[chatId].push({ role: 'assistant', content: cleanReply });

    if (state.memory[chatId].length > 10) {
      state.memory[chatId] = state.memory[chatId].slice(-10);
    }

    saveState(state);

  } catch (err) {
    console.error('Chatbot error:', err);
    await sock.sendMessage(chatId, { text: '⚠️ Seva ya AI haipatikani kwa sasa.' }, { quoted: message });
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
  groupChatbotToggleCommand
};
