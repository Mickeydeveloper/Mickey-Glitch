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
    // Prioritize common response fields
    if (value.text && typeof value.text === 'string') return value.text.trim();
    if (value.answer && typeof value.answer === 'string') return value.answer.trim();
    if (value.result && typeof value.result === 'string') return value.result.trim();
    if (value.message && typeof value.message === 'string') return value.message.trim();
    if (value.response && typeof value.response === 'string') return value.response.trim();
    if (value.output && typeof value.output === 'string') return value.output.trim();
    if (value.content && typeof value.content === 'string') return value.content.trim();

    // If data is a string, use it
    if (value.data && typeof value.data === 'string') return value.data.trim();

    // Recursively extract from nested objects/arrays
    const parts = Object.values(value)
      .map(extractText)
      .filter(Boolean);

    if (parts.length > 0) return parts.join('\n');

    // Fallback: stringify (cleaned up)
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

async function mickeyCommand(sock, chatId, message) {
  try {
    // Extract user text from various WhatsApp message types
    const text = (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      ''
    ).trim();

    // Remove command prefix and get the actual query
    const query = text.replace(/^\.mickey\s*/i, '').trim();

    if (!query) {
      await sock.sendMessage(
        chatId,
        { text: 'Usage: .mickey <your question about sunnah or Islam>\nExample: .mickey what is the sunnah for morning?' },
        { quoted: message }
      );
      return;
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://zellapi.autos/ai/alquran?text=${encodedQuery}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(url, { signal: controller.signal });

    clearTimeout(timeoutId);

    if (!res.ok) {
      await sock.sendMessage(
        chatId,
        { text: `❌ API Error: ${res.status} ${res.statusText}` },
        { quoted: message }
      );
      return;
    }

    const raw = await res.text();
    let reply = 'No response from API.';

    // Try to parse as JSON first
    try {
      const json = JSON.parse(raw);

      // Common patterns from similar Islamic/Sunnah APIs:
      // Some return { result: "..." }, { message: "..." }, { data: { answer: "..." } }, etc.
      reply = extractText(json);

      // Extra safety: some APIs wrap in { result: { text: "..." } }
      if (!reply || reply.trim().length === 0) {
        reply = extractText(json.result || json.data || json.message || json.response || json);
      }
    } catch (e) {
      // If not JSON, treat raw text as response (some APIs return plain text)
      reply = raw.trim();
    }

    // Final fallback
    if (!reply || reply.trim().length === 0) {
      reply = 'No valid response received from the API.';
    }

    // Truncate long responses
    const maxLen = 1500;
    let output = reply.trim();
    if (output.length > maxLen) {
      output = output.slice(0, maxLen - 3) + '...';
    }

    await sock.sendMessage(
      chatId,
      { text: `🤖 Mickey (Sunnah AI)\n\n${output}` },
      { quoted: message }
    );
  } catch (err) {
    let errorMsg = '⚠️ An error occurred.';
    if (err.name === 'AbortError') {
      errorMsg = '⚠️ Request timed out (15 seconds).';
    } else if (err.message) {
      errorMsg += ' ' + err.message;
    }

    await sock.sendMessage(
      chatId,
      { text: errorMsg },
      { quoted: message }
    );
  }
}

module.exports = mickeyCommand;