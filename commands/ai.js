const { callAI } = require('./chatbot');

/**
 * AI Command Handler
 * Usage: .ai <question or message>
 * Example: .ai hello
 */
async function aiCommand(sock, chatId, message) {
  try {
    // Guard: Check if socket is ready
    if (!sock || typeof sock.sendMessage !== 'function') {
      return;
    }

    // Extract text from message
    const textBody = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || '';
    
    const userText = textBody.split(" ").slice(1).join(" ").trim();

    if (!userText) {
      await sock.sendMessage(chatId, { 
        text: '🤖 *AI Chat*\n\nExample: *.ai hello*\n\nMeaning:\n*.ai why is sky blue?*'
      }, { quoted: message });
      return;
    }

    // Show typing (with safety check)
    try {
      await sock.sendPresenceUpdate('composing', chatId);
    } catch (e) {
      // Silent - connection might be closing
    }

    // Show thinking reaction
    await sock.sendMessage(chatId, { 
      react: { text: '⏳', key: message.key } 
    });

    try {
      // Call AI API (uses primary + fallback from `commands/chatbot.js`)
      const reply = await callAI(userText);

      // Clean reply
      let cleanReply = reply || "Sorry, I can't answer right now.";

      // Send response
      await sock.sendMessage(chatId, { 
        text: cleanReply 
      }, { quoted: message });

      // Success reaction
      await sock.sendMessage(chatId, { 
        react: { text: '✅', key: message.key } 
      });

    } catch (apiError) {
      console.error('API Error:', apiError.message || apiError);
      
      let errorMsg = '❌ API error, try again after a minute.';
      if (apiError?.message?.includes('timeout')) {
        errorMsg = '⏱️ Timeout - try a simpler question.';
      }
      
      await sock.sendMessage(chatId, { 
        text: errorMsg 
      }, { quoted: message });
    }

  } catch (error) {
    console.error('AI Command Error:', error.message || error);
    await sock.sendMessage(chatId, { 
      text: '🚨 An error occurred, try again.' 
    }, { quoted: message });
  }
}


module.exports = {
  aiCommand
}; 