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
        text: '🤖 *AI Chat*\n\nMfano: *.ai hello*\n\nYaani:\n*.ai why is sky blue?*'
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
      console.error('API Error:', apiError.message || apiError);
      
      let errorMsg = '❌ Api error, jaribu tena baada ya dakika.';
      if (apiError?.message?.includes('timeout')) {
        errorMsg = '⏱️ Timeout - jaribu swali rahisi zaidi.';
      }
      
      await sock.sendMessage(chatId, { 
        text: errorMsg 
      }, { quoted: message });
    }

  } catch (error) {
    console.error('AI Command Error:', error.message || error);
    await sock.sendMessage(chatId, { 
      text: '🚨 Hitilafu imetokea, jaribu tena.' 
    }, { quoted: message });
  }
}


/**
 * Voice-specific wrapper that accepts plain text extracted from a voice
 * message.  Main handler is reused, so we just build a fake message object.
 *
 * @param {import('@whiskeysockets/baileys').AnyWASocket} sock
 * @param {string} chatId
 * @param {string} senderId  // not used currently, kept for compatibility
 * @param {string} voiceText text already converted from speech
 * @param {object} message   // original message object (used for quoting)
 */
async function aiVoiceCommand(sock, chatId, senderId, voiceText, message) {
  // build a minimal message object to trick aiCommand into working
  const fake = {
    message: { conversation: `.ai ${voiceText}` },
    key: message.key
  };
  return aiCommand(sock, chatId, fake);
}

module.exports = {
  aiCommand,
  aiVoiceCommand
}; 