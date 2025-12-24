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
    let reply = raw;
    try {
      const j = JSON.parse(raw);
      reply = j.result || j.message || j.data || JSON.stringify(j);
    } catch (e) {
      // not JSON, use raw text
    }

    if (!reply || reply.length === 0) reply = 'No response from API.';

    await sock.sendMessage(chatId, { text: `🤖 Mickey (Sunnah AI)\n\n${reply}` }, { quoted: message });
  } catch (err) {
    await sock.sendMessage(chatId, { text: '⚠️ Error: ' + (err.message || err) }, { quoted: message });
  }
}

module.exports = mickeyCommand;
