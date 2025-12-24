const fetch = require('node-fetch');

// Usage: .mickey <text>
// Example: .mickey what is the sunnah for morning?

function extractText(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    // Common fields
    if (typeof value.text === 'string') return value.text.trim();
    if (typeof value.answer === 'string') return value.answer.trim();
    if (typeof value.result === 'string') return value.result.trim();
    if (typeof value.message === 'string') return value.message.trim();
    if (typeof value.data === 'string') return value.data.trim();

    // Try deeper extraction
    const parts = Object.values(value).map(extractText).filter(Boolean);
    if (parts.length) return parts.join('\n');
    return JSON.stringify(value);
  }
  return String(value);
}

async function mickeyCommand(sock, chatId, message) {
  try {
    const text = (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      ''
    ).toString().trim();

    if (!text) {
      await sock.sendMessage(chatId, { text: 'Usage: .mickey <your question about sunnah or Islam>' }, { quoted: message });
      return;
    }

    const query = encodeURIComponent(text.replace(/^\.mickey\s*/i, '').trim());
    const url = `https://zellapi.autos/ai/alquran?text=${query}`;

    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) {
      await sock.sendMessage(chatId, { text: '❌ API error: ' + res.status + ' ' + res.statusText }, { quoted: message });
      return;
    }

    const raw = await res.text();
    let reply = null;

    // Try JSON parse first
    try {
      const j = JSON.parse(raw);
      reply = extractText(j.result) || extractText(j.message) || extractText(j.data) || extractText(j);
    } catch (e) {
      // not JSON
      reply = raw;
    }

    if (!reply || String(reply).trim().length === 0) reply = 'No response from API.';

    // Limit message length to avoid flooding
    const maxLen = 1500;
    let out = String(reply).trim();
    if (out.length > maxLen) out = out.slice(0, maxLen - 3) + '...';

    await sock.sendMessage(chatId, { text: `🤖 Mickey (Sunnah AI)\n\n${out}` }, { quoted: message });
  } catch (err) {
    await sock.sendMessage(chatId, { text: '⚠️ Error: ' + (err.message || err) }, { quoted: message });
  }
}

module.exports = mickeyCommand;
