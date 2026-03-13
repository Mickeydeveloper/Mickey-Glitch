const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Tumia library ya Gemini
const isAdmin = require('../lib/isAdmin');

// Weka API Key yako ya Gemini hapa au kwenye mazingira yako (env)
const genAI = new GoogleGenerativeAI('GEMINI_KEY_HAPA');

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
    m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption ||
    m.videoMessage?.caption || m.documentMessage?.caption || m.interactiveMessage?.body?.text ||
    ''
  ).trim();
}

/**
 * AI CALLER - Sasa inatumia Gemini
 */
async function callAI(userPrompt, history = []) {
  try {
    const systemInstruction = `Wewe ni Mickdady Hamza, developer kutokea Tanzania. 
    - Jibu kama binadamu (usiwe roboti). 
    - Ukiulizwa jina: "Mimi ni Mickdady Hamza, developer kutokea Tanzania."
    - Ukiulizwa wewe ni nani: "Mimi ni binadamu."
    - Tumia Kiswahili cha mtaani/kifupi (mfano: 'vp', 'sawa', 'bdo', 'uko') pale inapofaa ili usikike kama kijana wa bongo.
    - Kuwa msaidizi, mwenye adabu, na jibu kwa ufupi lakini kwa ufasaha.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const chat = model.startChat({
      history: history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(userPrompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini Error:", err);
    return "Samahani, seva imegoma kidogo. Mickdady Hamza hapa, vipi unaendeleaje?";
  }
}

async function handleChatbotMessage(sock, chatId, message) {
  try {
    const state = loadState();
    const isGroup = chatId.endsWith('@g.us');
    if (!(isGroup ? state.perGroup[chatId]?.enabled : state.private)) return;

    const userText = extractMessageText(message);
    if (!userText) return;

    await sock.sendPresenceUpdate('composing', chatId);

    const history = state.memory[chatId] || [];
    const reply = await callAI(userText, history);

    await sock.sendMessage(chatId, { text: reply }, { quoted: message });

    // Update memory (hifadhi mwisho 10 tu ili kuepuka mzigo)
    state.memory[chatId] = [...history, { role: 'user', content: userText }, { role: 'assistant', content: reply }].slice(-10);
    saveState(state);
  } catch (err) {
    console.error('Chatbot error:', err);
  }
}

async function groupChatbotToggleCommand(sock, chatId, message, args = '') {
  const arg = args.trim().toLowerCase();
  const state = loadState();

  if (arg.startsWith('private')) {
    const sub = arg.split(/\s+/)[1] || '';
    state.private = (sub === 'on');
    saveState(state);
    return sock.sendMessage(chatId, { text: `Chatbot binafsi: *${state.private ? 'ON' : 'OFF'}*` });
  }

  // ... (Sema code nyingine ya toggle kama ilivyo hapo awali)
  if (arg === 'on') state.perGroup[chatId] = { enabled: true };
  else if (arg === 'off') state.perGroup[chatId] = { enabled: false };
  saveState(state);
  await sock.sendMessage(chatId, { text: `Group chatbot sasa ni: *${state.perGroup[chatId]?.enabled ? 'ON' : 'OFF'}*` });
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand, callAI };
