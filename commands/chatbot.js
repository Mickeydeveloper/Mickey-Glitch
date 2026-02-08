const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const isAdmin = require('../lib/isAdmin');
const { OPENAI_CONFIG } = require('../config');

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
// Hizi API hazihitaji Key kwa sasa kulingana na muundo wako
const SYSTEM_PROMPT = OPENAI_CONFIG.systemPrompt || 'You are a helpful WhatsApp chatbot assistant. Be concise and friendly and you name is Mickey .';

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
 * AI CALLER - Inatumia API zako mpya
 */
async function callAI(userPrompt) {
  try {
    // Tumeunganisha System Prompt na User Prompt kwa sababu API hizi ni rahisi
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${userPrompt}`;
    
    // Unaweza kubadilisha hapa kati ya Gemini au GPT
    // API 1 (Gemini): https://gemini-1-5-flash.bjcoderx.workers.dev/?text=
    // API 2 (GPT): https://gpt-3-5.apis-bj-devs.workers.dev/?prompt=
    const apiUrl = `https://gemini-1-5-flash.bjcoderx.workers.dev/?text=${encodeURIComponent(fullPrompt)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(20000) // 20 seconds timeout
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data = await response.json();
    
    // Kulingana na API nyingi za aina hii, jibu huwa kwenye .result au .response au .reply
    // Kama API inarudisha text tupu, tutatumia data moja kwa moja
    const reply = data.result || data.response || data.reply || (typeof data === 'string' ? data : null);

    if (!reply) throw new Error('Nilipata data tupu kutoka kwa AI.');

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

    // Pata jibu kutoka kwenye API mpya
    const reply = await callAI(userText);
    let cleanReply = reply || "Samahani, seva imeshindwa kujibu kwa sasa.";

    await sock.sendMessage(chatId, { text: cleanReply }, { quoted: message });

    // Kumbukumbu (Memory) - API hizi hazina memory ya asili, tunaiweka hapa kwa ajili ya file tu
    state.memory[chatId] = state.memory[chatId] || [];
    state.memory[chatId].push({ role: 'user', content: userText });
    state.memory[chatId].push({ role: 'assistant', content: cleanReply });

    if (state.memory[chatId].length > 10) state.memory[chatId].slice(-10);

    saveState(state);

  } catch (err) {
    console.error('Chatbot error:', err);
    const fallbacks = ["Network inasumbua kidogo...", "AI seva iko bize, jaribu tena.", "Sijakamatia jibu sasa hivi."];
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
      return sock.sendMessage(chatId, { text: `Chatbot binafsi sasa ni: *${state.private ? 'ON' : 'OFF'}*` });
    }

    if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: 'Amri hii ni ya kwenye makundi tu.' });

    const sender = message.key.participant || message.key.remoteJid;
    const { isSenderAdmin } = await isAdmin(sock, chatId, sender);

    if (!isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: 'Admins pekee ndio wanaweza kubadili hili.' });

    if (arg === 'on') state.perGroup[chatId] = { enabled: true };
    else if (arg === 'off') state.perGroup[chatId] = { enabled: false };
    else return sock.sendMessage(chatId, { text: 'Tumia: .chatbot on | off' });

    saveState(state);
    await sock.sendMessage(chatId, { text: `Group chatbot sasa ni: *${state.perGroup[chatId].enabled ? 'ON' : 'OFF'}*` });
  } catch {
    await sock.sendMessage(chatId, { text: 'Amri imefeli.' });
  }
}

module.exports = {
  handleChatbotMessage,
  groupChatbotToggleCommand
};
