const axios = require('axios');

/**
 * ai.js - Mickey AI Assistant (Stylish Version)
 */
const aiCommand = async (sock, chatId, msg, args) => {
    // Hakikisha query inapokelewa kama string
    const query = Array.isArray(args) ? args.join(' ') : args;
    
    if (!query) {
        return sock.sendMessage(chatId, { 
            text: '╭━━━〔 *MICKEY AI* 〕━━━┈⊷\n┃\n┃ 📝 *Usage:* `.ai [swali lako]`\n┃ 💡 *Example:* `.ai habari yako?`\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
        }, { quoted: msg });
    }

    // Onyesha reaction ya kufikiri
    await sock.sendMessage(chatId, { react: { text: '🧠', key: msg.key } }).catch(() => {});

    try {
        const res = await axios.get(`https://water-billing-292n.onrender.com/api/chat?text=${encodeURIComponent(query)}`);
        
        const responseText = 
            `╭━━━━〔 *AI RESPONSE* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ ${res.data.reply}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
        
        // Success reaction
        await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } }).catch(() => {});

    } catch (e) {
        console.error("AI Error:", e.message);
        await sock.sendMessage(chatId, { 
            text: '⚠️ *Samahani, Mickey AI haipatikani kwa sasa. Jaribu baadae kidogo.*' 
        }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }).catch(() => {});
    }
};

module.exports = aiCommand;
