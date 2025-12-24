const fetch = require('node-fetch');

// Usage: .mickey <text>
// Example: .mickey what is the sunnah for morning?

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

    // The API sometimes returns plain text or JSON; try parse JSON first
    const raw = await res.text();
    let reply = null;
    try {
      const j = JSON.parse(raw);
      // Safely extract text from common fields (may be string or nested object)
      const extract = (v) => {
        if (v == null) return null;
        if (typeof v === 'string') return v.trim();
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (Array.isArray(v)) return v.map(extract).filter(Boolean).join('\n');
        if (typeof v === 'object') {
          if (typeof v.text === 'string') return v.text.trim();
          if (typeof v.answer === 'string') return v.answer.trim();
          if (typeof v.result === 'string') return v.result.trim();
          if (typeof v.message === 'string') return v.message.trim();
          if (typeof v.data === 'string') return v.data.trim();
          const parts = Object.values(v).map(extract).filter(Boolean);
          if (parts.length) return parts.join('\n');
          return JSON.stringify(v);
        }
        return String(v);
      };

      reply = extract(j.result) || extract(j.message) || extract(j.data) || extract(j);
    } catch (e) {
      // not JSON, use raw text
      reply = raw;
    }

    if (!reply || String(reply).trim().length === 0) reply = 'No response from API.';

    // Limit message length
    const out = String(reply).trim().slice(0, 1500);
    await sock.sendMessage(chatId, { text: `🤖 Mickey (Sunnah AI)\n\n${out}` }, { quoted: message });
  } catch (err) {
    await sock.sendMessage(chatId, { text: '⚠️ Error: ' + (err.message || err) }, { quoted: message });
  }
}

module.exports = mickeyCommand;
