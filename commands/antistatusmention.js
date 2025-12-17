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

async function handleAntiStatusMention(sock, chatId, message) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return;
    if (!message?.message) return;

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

    // If the message explicitly mentions users, ignore (we only target status-mention spam)
    const mentionedJids = msg.extendedTextMessage?.contextInfo?.mentionedJid || msg.contextInfo?.mentionedJid || [];
    if (Array.isArray(mentionedJids) && mentionedJids.length > 0) return;

    const phraseRegex = /\\b(?:this\\s+group\\s+was\\s+mention(?:ed)?|group\\s+was\\s+mention(?:ed)?|mentioned\\s+this\\s+group|mention(?:ed)?\\s+this\\s+group|status\\s+mention(?:ed)?|mention\\s+status)\\b/i;

    if (!phraseRegex.test(text)) return;

    // Ensure bot is admin so we can delete
    let adminInfo = { isBotAdmin: false };
    try {
      const botId = sock.user?.id || sock.user?.jid || '';
      adminInfo = await isAdmin(sock, chatId, botId);
    } catch (e) {
      // fallthrough
    }
    if (!adminInfo.isBotAdmin) return;

    // Attempt to delete the offending message (best-effort)
    try {
      const delKey = {
        remoteJid: chatId,
        fromMe: false,
        id: message.key.id,
        participant: message.key.participant || message.key.remoteJid
      };
      await sock.sendMessage(chatId, { delete: delKey });
      try { await sock.sendMessage(chatId, { text: '⛔ A status-mention message was removed by anti-status-mention.' }); } catch (e) {}
    } catch (e) {
      console.error('Failed to delete status mention message:', e?.message || e);
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

module.exports = { handleAntiStatusMention, groupAntiStatusToggleCommand };
