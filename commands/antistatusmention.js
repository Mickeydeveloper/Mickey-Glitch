const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

function loadState() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'antistatusmention.json'), 'utf8');
    const state = JSON.parse(raw);
    if (!state.perGroup) state.perGroup = {};
    return state;
  } catch (e) {
    return { perGroup: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'antistatusmention.json'), JSON.stringify(state, null, 2));
}

function isEnabledForChat(state, chatId) {
  if (!state) return false;
  if (typeof state.perGroup?.[chatId] === 'boolean') return !!state.perGroup[chatId];
  return false;
}

async function handleAntiStatusMention(sock, chatId, message) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return;
    const state = loadState();
    if (!isEnabledForChat(state, chatId)) return;

    // Get message text (from conversation, caption, etc.)
    const msg = message.message || {};
    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      ''
    ).trim();

    if (!text) return;

    // Improved regex to catch exact spam patterns like:
    // "@ This group was mentioned."
    // "This group was mention"
    // "this group was mentioned"
    // and similar variations
    const phraseRegex = /\b(?:@?\s*this\s+group\s+was\s+mention(?:ed)?|this\s+group\s+was\s+mention(?:ed)?|group\s+was\s+mention(?:ed)?|mentioned\s+this\s+group)\b/i;

    if (!phraseRegex.test(text)) return;

    // Check if bot is admin before deleting
    try {
      const adminInfo = await isAdmin(sock, chatId, sock.user?.id || sock.user?.jid || '');
      if (!adminInfo.isBotAdmin) return;
    } catch (e) {
      // Continue anyway if check fails
    }

    // Delete the message
    try {
      const participant = message.key.participant || message.key.remoteJid;
      await sock.sendMessage(chatId, {
        delete: {
          remoteJid: chatId,
          fromMe: false,
          id: message.key.id,
          participant
        }
      });

      // Optional notification
      await sock.sendMessage(chatId, {
        text: '⛔ Status-mention spam message removed.'
      }, { quoted: message });
    } catch (e) {
      // Ignore errors during deletion
    }
  } catch (err) {
    console.error('handleAntiStatusMention error:', err?.message || err);
  }
}

async function groupAntiStatusToggleCommand(sock, chatId, message, args) {
  try {
    if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: 'This command only works in groups.' }, { quoted: message });

    const sender = message.key.participant || message.key.remoteJid;
    const adminInfo = await isAdmin(sock, chatId, sender);
    if (!adminInfo.isSenderAdmin && !message.key.fromMe) {
      return sock.sendMessage(chatId, { text: 'Only group admins can use this command.' }, { quoted: message });
    }

    const onoff = (args || '').trim().toLowerCase();
    if (!onoff || !['on', 'off'].includes(onoff)) {
      return sock.sendMessage(chatId, { text: 'Usage: .antistatus on|off' }, { quoted: message });
    }

    const state = loadState();
    state.perGroup = state.perGroup || {};
    state.perGroup[chatId] = onoff === 'on';
    saveState(state);

    return sock.sendMessage(chatId, {
      text: `Anti-status-mention is now ${state.perGroup[chatId] ? 'ENABLED' : 'DISABLED'} in this group.`
    }, { quoted: message });
  } catch (e) {
    console.error('groupAntiStatusToggleCommand error:', e);
    return sock.sendMessage(chatId, { text: 'Error toggling anti-status-mention.' }, { quoted: message });
  }
}

module.exports = { handleAntiStatusMention, groupAntiStatusToggleCommand };
