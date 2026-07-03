const fs = require('fs');
const path = require('path');
const axios = require('axios');
const settings = require('../settings');
const { isAdmin } = require('../lib/isAdmin');

const CHATBOT_DATA_PATH = path.join(process.cwd(), 'data', 'chatbot.json');

const defaultChatbotData = {
  perGroup: {},
  private: false
};

const loadChatbotData = () => {
  try {
    if (!fs.existsSync(CHATBOT_DATA_PATH)) {
      fs.writeFileSync(CHATBOT_DATA_PATH, JSON.stringify(defaultChatbotData, null, 2));
      return { ...defaultChatbotData };
    }
    const raw = fs.readFileSync(CHATBOT_DATA_PATH, 'utf8');
    return raw.trim() ? JSON.parse(raw) : { ...defaultChatbotData };
  } catch (error) {
    console.error('loadChatbotData error:', error);
    return { ...defaultChatbotData };
  }
};

const saveChatbotData = (data) => {
  try {
    fs.writeFileSync(CHATBOT_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('saveChatbotData error:', error);
  }
};

const getSenderId = (message) => {
  return message.key.participant || message.key.remoteJid || '';
};

const isOwner = (message) => {
  const sender = getSenderId(message);
  const ownerJid = `${settings.ownerNumber}@s.whatsapp.net`;
  return message.key.fromMe || sender === ownerJid;
};

const getChatbotStatus = (chatId) => {
  const data = loadChatbotData();
  return {
    group: Boolean(data.perGroup[chatId]),
    private: Boolean(data.private)
  };
};

const buildChatbotStatusText = (chatId) => {
  const status = getChatbotStatus(chatId);
  return `🤖 *Chatbot Status*

` +
    `• Group chatbot for this chat: ${status.group ? '✅ Enabled' : '❌ Disabled'}
` +
    `• Private chatbot: ${status.private ? '✅ Enabled' : '❌ Disabled'}

` +
    `Usage:
` +
    `- .chatbot on -> Enable chatbot in this group
` +
    `- .chatbot off -> Disable chatbot in this group
` +
    `- .chatbot private on -> Enable chatbot in private chats
` +
    `- .chatbot private off -> Disable chatbot in private chats
` +
    `- .chatbot status -> Show current chatbot mode`;
};

const groupChatbotToggleCommand = async (sock, chatId, message, userMessage) => {
  const isGroupChat = chatId.endsWith('@g.us');
  const args = userMessage.trim().split(/\s+/).slice(1);
  const action = args[0]?.toLowerCase() || '';
  const value = args[1]?.toLowerCase() || '';
  const data = loadChatbotData();

  if (!action || action === 'status' || action === 'help') {
    return await sock.sendMessage(chatId, { text: buildChatbotStatusText(chatId) }, { quoted: message });
  }

  if (action === 'private') {
    if (!isOwner(message)) {
      return await sock.sendMessage(chatId, { text: '❌ Only the bot owner can change private chatbot mode.' }, { quoted: message });
    }

    if (!value || !['on', 'off'].includes(value)) {
      return await sock.sendMessage(chatId, { text: 'Usage: .chatbot private on|off' }, { quoted: message });
    }

    data.private = value === 'on';
    saveChatbotData(data);

    return await sock.sendMessage(chatId, { text: `✅ Private chatbot is now *${data.private ? 'enabled' : 'disabled'}*. ${data.private ? 'Chatbot replies are active in private chats.' : 'Private chatbot replies are turned off.'}` }, { quoted: message });
  }

  if (!isGroupChat) {
    return await sock.sendMessage(chatId, { text: '⚠️ Use `.chatbot private on|off` in private chat to control private chatbot mode.' }, { quoted: message });
  }

  const senderId = getSenderId(message);
  const adminCheck = await isAdmin(sock, chatId, senderId).catch(() => ({ isSenderAdmin: false }));
  if (!adminCheck.isSenderAdmin && !isOwner(message)) {
    return await sock.sendMessage(chatId, { text: '❌ Only group admins can enable or disable chatbot in this group.' }, { quoted: message });
  }

  let target = action;
  if (['on', 'off'].includes(action)) {
    target = action;
  } else if (action === 'group' && ['on', 'off'].includes(value)) {
    target = value;
  } else {
    return await sock.sendMessage(chatId, { text: 'Usage: .chatbot on|off or .chatbot private on|off' }, { quoted: message });
  }

  data.perGroup[chatId] = target === 'on';
  saveChatbotData(data);

  return await sock.sendMessage(chatId, { text: `✅ Group chatbot is now *${data.perGroup[chatId] ? 'enabled' : 'disabled'}* for this chat.` }, { quoted: message });
};

const handleChatbotMessage = async (sock, chatId, message, userMessage) => {
  const isGroupChat = chatId.endsWith('@g.us');
  const data = loadChatbotData();
  const isGroupActive = Boolean(data.perGroup[chatId]);
  const isPrivateActive = Boolean(data.private);

  if (isGroupChat && !isGroupActive) return;
  if (!isGroupChat && !isPrivateActive) return;

  const stickerMessage = message.message?.stickerMessage;
  const rawText = (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    ''
  ).trim();

  if (!rawText && !stickerMessage) return;

  if (stickerMessage) {
    await sock.sendMessage(chatId, { text: 'opindi' }, { quoted: message });
    return true;
  }

  const prompt = rawText;
  if (!prompt) return false;

  const apiUrl = `https://prexzyapis.com/ai/ai4chat?prompt=${encodeURIComponent(prompt)}`;

  const setTyping = async (state) => {
    try {
      if (typeof sock.sendPresenceUpdate === 'function') {
        await sock.sendPresenceUpdate(state, chatId);
      }
    } catch (err) {
      // ignore presence update errors
    }
  };

  try {
    await setTyping('composing');
    await sock.sendPresenceUpdate('composing', chatId).catch(() => {});
    await sock.sendMessage(chatId, { react: { text: '🧠', key: message.key } }).catch(() => {});

    const response = await axios.get(apiUrl, { timeout: 15000 });
    const json = response.data;
    const reply = json?.data?.response || json?.response || 'Samahani, sijapata jibu kutoka kwa AI.';

    await sock.sendMessage(chatId, {
      text: `╭━〔 *CHATBOT* 〕━
┃
┃ ${reply.trim()}
┃
╰━━━━━━━━━━━━━`
    }, { quoted: message });
  } catch (error) {
    console.error('Chatbot API error:', error);
    await sock.sendMessage(chatId, {
      text: '❌ *Chatbot imeshindwa kupata jibu. Jaribu tena baadae.*'
    }, { quoted: message });
    return true;
  } finally {
    await setTyping('paused');
  }
};

module.exports = {
  handleChatbotMessage,
  groupChatbotToggleCommand
};
