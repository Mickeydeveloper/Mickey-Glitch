const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

function loadState() {
  try {
    const p = path.join(__dirname, '..', 'data', 'antistatusmention.json')
    if (!fs.existsSync(p)) return { perGroup: {} }
    const raw = fs.readFileSync(p, 'utf8');
    const state = JSON.parse(raw || '{}');
    if (!state.perGroup) state.perGroup = {};
    return state;
  } catch (e) {
    return { perGroup: {} };
  }
}

function saveState(state) {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    // Debounced write to avoid many small disk writes
    const { writeJsonDebounced } = require('../lib/safeWrite')
    writeJsonDebounced(path.join(dataDir, 'antistatusmention.json'), state, 1500)
  } catch (e) {
    console.error('Failed to save antistatusmention state:', e?.message || e);
  }
}

function isEnabledForChat(state, chatId) {
  if (!state) return false;
  if (typeof state.perGroup?.[chatId] === 'boolean') return !!state.perGroup[chatId];
  return false;
}

async function handleAntiStatusMention(sock, chatId, message) {
  try {
    // Only operate in groups on incoming messages
    if (!chatId || !chatId.endsWith('@g.us')) return;
    if (!message?.message) return;
    if (message.key?.fromMe) return; // ignore our own messages

    const state = loadState();
    if (!isEnabledForChat(state, chatId)) return;

    // Normalize bot JID and prepare mention heuristics
    const rawBotId = sock.user?.id || sock.user?.jid || '';
    const botNum = rawBotId.split('@')[0].split(':')[0];

    // Extract text content from many possible message shapes
    const msg = message.message || {};
    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg.documentMessage?.caption ||
      msg.buttonsResponseMessage?.selectedDisplayText ||
      ''
    ).toString();
    if (!text) return;

    // Check if message is a reply to a status
    const ctxs = [
      msg.extendedTextMessage?.contextInfo,
      msg.imageMessage?.contextInfo,
      msg.videoMessage?.contextInfo,
      msg.listResponseMessage?.contextInfo,
      msg.buttonsResponseMessage?.contextInfo,
      msg.documentMessage?.contextInfo
    ].filter(Boolean);

    // If replying to status@broadcast, it's definitely a status mention
    const isStatusReply = ctxs.some(c => 
      c?.remoteJid === 'status@broadcast' || 
      c?.quotedMessage?.key?.remoteJid === 'status@broadcast'
    );

    // Check for actual user mentions (not status spam)
    const mentionedJids = [];
    for (const c of ctxs) {
      if (Array.isArray(c?.mentionedJid)) mentionedJids.push(...c.mentionedJid);
    }
    if (Array.isArray(msg?.mentionedJid)) mentionedJids.push(...msg.mentionedJid);

    // If explicit mentions exist and not a status reply, skip
    if (mentionedJids.length > 0 && !isStatusReply) return;

    // Heuristic detection for status mention spam patterns
    const statusMentionPatterns = [
      /\b(mentioned|mention(?:ed)?)\s+(?:this\s+)?(?:group|chat)/i,
      /status\s+mention/i,
      /you.*mentioned.*in.*status/i,
      /replied.*to.*your.*status/i,
      /react(?:ed|ion).*status/i,
      /viewed.*your.*status/i,
      /group\s+mention/i
    ];

    const isStatusMentionSpam = isStatusReply || statusMentionPatterns.some(p => p.test(text));

    // Fallback heuristic: message contains bot number
    if (!isStatusMentionSpam) {
      const stripped = text.replace(/\s+/g, '');
      if (new RegExp(`@?${botNum}`).test(stripped) && text.length < 150) {
        // Short message with bot mention = likely spam
        // do nothing, not enough evidence
      } else {
        return;
      }
    }

    // Don't delete messages from group admins (safer) or from the bot itself
    const sender = message.key.participant || message.key.remoteJid;
    const senderAdminInfo = await isAdmin(sock, chatId, sender).catch(() => ({ isSenderAdmin: false }));
    if (senderAdminInfo.isSenderAdmin) return;

    // Ensure bot is admin so we can delete
    const botAdminInfo = await isAdmin(sock, chatId, rawBotId).catch(() => ({ isBotAdmin: false }));
    if (!botAdminInfo.isBotAdmin) return;

    // Delete the message
    try {
      const messageKey = message.key;
      await sock.sendMessage(chatId, { delete: messageKey });
      
      console.log('✅ Status mention deleted', { 
        chatId, 
        msgId: messageKey.id, 
        sender,
        detected: isStatusReply ? 'status-reply' : 'pattern-match'
      });

      // Send brief notification
      try {
        const senderName = sender.split('@')[0];
        await sock.sendMessage(chatId, { 
          text: `🚫 *Anti-Status-Mention*\n• Status mention from @${senderName} was removed`
        });
      } catch (notifyErr) {
        // Silent fail on notification
      }

    } catch (deleteErr) {
      console.error('❌ Failed to delete status mention:', deleteErr.message);
    }

  } catch (err) {
    console.error('handleAntiStatusMention error:', err?.message || err);
  }
}

async function groupAntiStatusToggleCommand(sock, chatId, message, args) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, { 
        text: '❌ This command only works in groups.' 
      }, { quoted: message });
    }

    const sender = message.key.participant || message.key.remoteJid;
    const adminInfo = await isAdmin(sock, chatId, sender);
    
    if (!adminInfo.isSenderAdmin && !message.key.fromMe) {
      return sock.sendMessage(chatId, { 
        text: '❌ Only group admins can toggle anti-status-mention.' 
      }, { quoted: message });
    }

    const onoff = (args || '').trim().toLowerCase();
    if (!onoff || !['on', 'off'].includes(onoff)) {
      return sock.sendMessage(chatId, { 
        text: '📌 Usage:\n\n*.antistatusmention on* - Enable\n*.antistatusmention off* - Disable\n\nStatus mention spam will be automatically removed.' 
      }, { quoted: message });
    }

    const state = loadState();
    state.perGroup = state.perGroup || {};
    const isEnabled = onoff === 'on';
    state.perGroup[chatId] = isEnabled;
    saveState(state);

    const statusEmoji = isEnabled ? '✅' : '❌';
    const statusText = isEnabled ? 'ENABLED' : 'DISABLED';
    
    return sock.sendMessage(chatId, { 
      text: `${statusEmoji} *Anti-Status-Mention is ${statusText}*\n\nStatus mention spam will be ${isEnabled ? 'automatically removed' : 'no longer moderated'}.` 
    }, { quoted: message });

  } catch (e) {
    console.error('groupAntiStatusToggleCommand error:', e);
    return sock.sendMessage(chatId, { 
      text: '🚨 Failed to toggle anti-status-mention.' 
    }, { quoted: message });
  }
}

module.exports = { handleAntiStatusMention, groupAntiStatusToggleCommand };
