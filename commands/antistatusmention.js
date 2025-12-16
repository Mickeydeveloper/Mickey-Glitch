// Store warn counts in memory
const statusWarnCounts = new Map();

// Settings storage
let antiStatusSettings = {
  status: 'off',
  action: 'delete',
  warn_limit: 3
};

async function initAntiStatusMentionDB() {
  console.log('AntiStatusMention initialized');
}

async function getAntiStatusMentionSettings() {
  try {
    return antiStatusSettings;
  } catch (error) {
    console.error('Error getting anti-status-mention settings:', error);
    return { 
      status: 'off', 
      action: 'delete', 
      warn_limit: 3
    };
  }
}

async function updateAntiStatusMentionSettings(updates) {
  try {
    antiStatusSettings = { ...antiStatusSettings, ...updates };
    return antiStatusSettings;
  } catch (error) {
    console.error('Error updating anti-status-mention settings:', error);
    return null;
  }
}

function getStatusWarnCount(userJid) {
  return statusWarnCounts.get(userJid) || 0;
}

function incrementStatusWarnCount(userJid) {
  const current = getStatusWarnCount(userJid);
  statusWarnCounts.set(userJid, current + 1);
  return current + 1;
}

function resetStatusWarnCount(userJid) {
  statusWarnCounts.delete(userJid);
}

function clearAllStatusWarns() {
  statusWarnCounts.clear();
}

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
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'data', 'antistatusmention.json'), JSON.stringify(state, null, 2));
  } catch (e) {
    // ignore write errors
  }
}

function isEnabledForChat(state, chatId) {
  if (!state) return false;
  if (typeof state.perGroup?.[chatId] === 'boolean') return !!state.perGroup[chatId];
  return false;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function handleAntiStatusMention(sock, chatId, message) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return;
    const state = loadState();
    if (!isEnabledForChat(state, chatId)) return;

    const msg = message.message || {};
    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      ''
    ).toString();
    if (!text) return;

    const mentionedJids = msg.extendedTextMessage?.contextInfo?.mentionedJid || msg.contextInfo?.mentionedJid || [];
    if (Array.isArray(mentionedJids) && mentionedJids.length > 0) return;

    const phraseRegex = /\b(?:this\s+group\s+was\s+mention(?:ed)?|group\s+was\s+mention(?:ed)?|mentioned\s+this\s+group|mention(?:ed)?\s+this\s+group|status\s+mention(?:ed)?|mention\s+status)\b/i;

    if (phraseRegex.test(text)) {
      try {
        const adminInfo = await isAdmin(sock, chatId, sock.user?.id || sock.user?.jid || '');
        if (!adminInfo.isBotAdmin) return;
      } catch (e) {
        // continue
      }

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
        try {
          await sock.sendMessage(chatId, { text: '⛔ A status-mention message was removed by anti-status-mention.' }, { quoted: message });
        } catch (e) {}
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.error('handleAntiStatusMention error:', err?.message || err);
  }
}

async function groupAntiStatusToggleCommand(sock, chatId, message, args) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: 'This command only works in groups.' }, { quoted: message });
    const sender = message.key.participant || message.key.remoteJid;
    const adminInfo = await isAdmin(sock, chatId, sender);
    if (!adminInfo.isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: 'Only group admins can toggle anti-status-mention.' }, { quoted: message });

    const onoff = (args || '').trim().toLowerCase();
    if (!onoff || !['on', 'off'].includes(onoff)) {
      return sock.sendMessage(chatId, { text: 'Usage: .antistatusmention on|off' }, { quoted: message });
    }
    const state = loadState();
    state.perGroup = state.perGroup || {};
    state.perGroup[chatId] = onoff === 'on';
    saveState(state);
    return sock.sendMessage(chatId, { text: `Anti-status-mention is now ${state.perGroup[chatId] ? 'ON' : 'OFF'} for this group.` }, { quoted: message });
  } catch (e) {
    console.error('groupAntiStatusToggleCommand error:', e);
    return sock.sendMessage(chatId, { text: 'Failed to toggle anti-status-mention.' }, { quoted: message });
  }
}

module.exports = {
  initAntiStatusMentionDB,
  getAntiStatusMentionSettings,
  updateAntiStatusMentionSettings,
  getStatusWarnCount,
  incrementStatusWarnCount,
  resetStatusWarnCount,
  clearAllStatusWarns,
  handleAntiStatusMention,
  groupAntiStatusToggleCommand
};
