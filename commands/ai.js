const fetch = require('node-fetch');

/**
 * Call AI API with user prompt
 */
async function callAI(userPrompt) {
  try {
    const apiUrl = `https://api.srihub.store/ai/copilot?prompt=${encodeURIComponent(userPrompt)}&apikey=dew_DVTcyMksTDO8ZGxBvLAG0y9P8sIj6uRJXHHwWSW5`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(20000) 
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data = await response.json();
    
    // Extract reply from AI API response
    const reply = data.result?.reply || data.result || data.reply || data.response || (typeof data === 'string' ? data : null);

    if (!reply) throw new Error('Nilipata data tupu.');

    return reply.trim();
  } catch (err) {
    console.error('AI call failed:', err.message);
    throw err;
  }
}

/**
 * AI Command Handler
 * Usage: .ai <question or message>
 * Example: .ai hello
 */
async function aiCommand(sock, chatId, message) {
  try {
    // Extract text from message
    const textBody = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || '';
    
    const userText = textBody.split(" ").slice(1).join(" ").trim();

    if (!userText) {
      return sock.sendMessage(chatId, { 
        text: '🤖 *AI Chat*\n\nMfano: *.ai hello*\n\nYaani:\n*.ai why is sky blue?*'
      }, { quoted: message });
    }

    // Show typing
    await sock.sendPresenceUpdate('composing', chatId);

    // Show thinking reaction
    await sock.sendMessage(chatId, { 
      react: { text: '⏳', key: message.key } 
    });

    try {
      // Call AI API
      const reply = await callAI(userText);

      // Clean reply
      let cleanReply = reply || "Samahani, siwezi kujibu kwa sasa.";

      // Send response
      await sock.sendMessage(chatId, { 
        text: cleanReply 
      }, { quoted: message });

      // Success reaction
      await sock.sendMessage(chatId, { 
        react: { text: '✅', key: message.key } 
      });

    } catch (apiError) {
      console.error('API Error:', apiError.message);
      
      let errorMsg = '❌ Api error, jaribu tena baada ya dakika.';
      if (apiError.message.includes('timeout')) {
        errorMsg = '⏱️ Timeout - jaribu swali rahisi zaidi.';
      }
      
      await sock.sendMessage(chatId, { 
        text: errorMsg 
      }, { quoted: message });
    }

  } catch (error) {
    console.error('AI Command Error:', error);
    await sock.sendMessage(chatId, { 
      text: '🚨 Hitilafu imetokea, jaribu tena.' 
    }, { quoted: message });
  }
}

module.exports = aiCommand; 