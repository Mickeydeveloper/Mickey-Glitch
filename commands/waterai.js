const axios = require('axios');

const waterAiCommand = async (sock, chatId, msg, args) => {
    const query = Array.isArray(args) ? args.join(' ') : args;
    if (!query) return sock.sendMessage(chatId, { text: "❌ Uliza swali! Mfano: .waterai deni langu ni kiasi gani?" }, { quoted: msg });

    try {
        const res = await axios.get(`https://water-billing-292n.onrender.com/api/chat?text=${encodeURIComponent(query)}`);
        await sock.sendMessage(chatId, { text: `🤖 *Mickey Assistant:*\n\n${res.data.reply}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: "⚠️ Samahani, AI haipatikani kwa sasa." }, { quoted: msg });
    }
};

module.exports = waterAiCommand;
