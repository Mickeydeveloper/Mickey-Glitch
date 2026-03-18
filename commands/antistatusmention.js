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
    const { writeJsonDebounced } = require('../lib/safeWrite')
    writeJsonDebounced(path.join(dataDir, 'antistatusmention.json'), state, 1500)
  } catch (e) {
    console.error('Failed to save antistatusmention state:', e?.message || e);
  }
}

function isEnabledForChat(state, chatId) {
  if (!state) return false;
  return !!state.perGroup?.[chatId];
}

async function handleAntiStatusMention(sock, chatId, message) {
  try {
    if (!chatId || !chatId.endsWith('@g.us')) return;
    if (!message?.message) return;
    if (message.key?.fromMe) return; 

    const state = loadState();
    if (!isEnabledForChat(state, chatId)) return;

    const msg = message.message || {};
    
    // 1. Pata text kutoka kwenye aina zote za meseji
    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.documentMessage?.caption ||
      ''
    ).toString();

    // 2. Angalia kama ni reply ya status moja kwa moja
    const contextInfo = msg.extendedTextMessage?.contextInfo || 
                        msg.imageMessage?.contextInfo || 
                        msg.videoMessage?.contextInfo;

    const isStatusReply = contextInfo?.remoteJid === 'status@broadcast' || 
                          contextInfo?.quotedMessage?.key?.remoteJid === 'status@broadcast';

    // 3. REGEX Maalum kwa ajili ya "@ This group was mentioned" (Kama kwenye picha)
    const statusMentionPatterns = [
      /mentioned\s+this\s+group/i,
      /this\s+group\s+was\s+mentioned/i, // Hii ndio muhimu zaidi kwa picha uliyotuma
      /status\s+mention/i,
      /viewed\s+your\s+status/i,
      /replied\s+to\s+your\s+status/i
    ];

    const isSpamPattern = statusMentionPatterns.some(p => p.test(text));

    // Kama ni spam au ni reply ya status, ifute
    if (isStatusReply || isSpamPattern) {
      const sender = message.key.participant || message.key.remoteJid;
      
      // Hakikisha bot ni admin kabla ya kufuta
      const botId = sock.user?.id || sock.user?.jid;
      const botAdminInfo = await isAdmin(sock, chatId, botId).catch(() => ({ isBotAdmin: false }));
      
      if (!botAdminInfo.isBotAdmin) return; // Kama bot sio admin, hawezi kufuta

      // Kama aliyetuma ni admin, usimfute (Optional: Unaweza kuitoa hii kama unataka kufuta kila mtu)
      const senderAdminInfo = await isAdmin(sock, chatId, sender).catch(() => ({ isSenderAdmin: false }));
      if (senderAdminInfo.isSenderAdmin) return;

      // FUTA MESEJI HARAKA
      await sock.sendMessage(chatId, { delete: message.key });
      
      console.log(`✅ Futa Status Mention kutoka: ${sender}`);

      // Tuma onyo fupi (Optional)
      await sock.sendMessage(chatId, { 
        text: `🚫 *Anti-Status-Mention*\nUjumbe wa spam umefutwa.` 
      });
    }

  } catch (err) {
    console.error('handleAntiStatusMention error:', err);
  }
}

// Command ya kuwasha/kuzima (Toggle)
async function groupAntiStatusToggleCommand(sock, chatId, message, args) {
  try {
    const onoff = (args || '').trim().toLowerCase();
    if (!onoff || !['on', 'off'].includes(onoff)) {
      return sock.sendMessage(chatId, { text: '📌 Tumia: *.antistatusmention on/off*' });
    }

    const state = loadState();
    const isEnabled = onoff === 'on';
    state.perGroup[chatId] = isEnabled;
    saveState(state);

    return sock.sendMessage(chatId, { 
      text: `✅ *Anti-Status-Mention* sasa imewekwa: *${isEnabled ? 'ON' : 'OFF'}*` 
    });

  } catch (e) {
    console.error(e);
  }
}

module.exports = { handleAntiStatusMention, groupAntiStatusToggleCommand };
