const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const isAdmin = require('../lib/isAdmin');
const { OPENAI_CONFIG } = require('../config');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const OPENAI_API_KEY = OPENAI_CONFIG.apiKey;
const OPENAI_MODEL = OPENAI_CONFIG.model || 'gpt-3.5-turbo';
const SYSTEM_PROMPT = OPENAI_CONFIG.systemPrompt || 'You are a helpful WhatsApp chatbot assistant. Be concise and friendly.';

if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured in config.js. Chatbot will not work.');
}

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

async function callOpenAI(prompt, conversationHistory = []) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-4),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    if (!reply.trim()) {
      throw new Error('Empty response from OpenAI');
    }

    return reply.trim();
  } catch (err) {
    console.error('OpenAI API call failed:', err.message);
    throw err;
  }
}

async function handleChatbotMessage(sock, chatId, message) {
  try {
    if (!chatId || message.key?.fromMe || !OPENAI_API_KEY) return;

    const state = loadState();
    const isGroup = chatId.endsWith('@g.us');
    const enabled = isGroup ? state.perGroup[chatId]?.enabled : state.private;
    if (!enabled) return;

    const userText = extractMessageText(message);
    if (!userText) return;

    await sock.sendPresenceUpdate('composing', chatId);

    // Load conversation history
    state.memory[chatId] = state.memory[chatId] || [];
    const conversationHistory = state.memory[chatId].slice(-6);

    // Get response from OpenAI
    const reply = await callOpenAI(userText, conversationHistory);
    let cleanReply = reply || "Sijakamatia jibu sasa... Jaribu tena baadaye.";

    await sock.sendMessage(chatId, { text: cleanReply }, { quoted: message });

    // Update conversation history
    state.memory[chatId].push({ role: 'user', content: userText });
    state.memory[chatId].push({ role: 'assistant', content: cleanReply });
    
    // Keep history manageable (keep last 20 messages)
    if (state.memory[chatId].length > 20) {
      state.memory[chatId] = state.memory[chatId].slice(-20);
    }
    
    saveState(state);

  } catch (err) {
    console.error('Chatbot error:', err);
    const fallbacks = ["Kuna shida kidogo...", "Jaribu tena baadaye...", "Sijakamatia jibu...", "Network inakata..."];
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