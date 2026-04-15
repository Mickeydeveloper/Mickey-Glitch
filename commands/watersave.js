const axios = require('axios');

const waterSaveCommand = async (sock, chatId, msg, args) => {
    const query = Array.isArray(args) ? args.join(' ') : args;
    if (!query || !query.includes('|')) {
        return sock.sendMessage(chatId, { text: "❌ Format: .watersave Jina|Prev|Curr|Rate|Fixed|Y-M-D" }, { quoted: msg });
    }

    try {
        const [n, p, c, r, f, d] = query.split('|');
        const saveData = {
            name: n.trim(),
            phone: msg.key.remoteJid.split('@')[0],
            prev: Number(p),
            curr: Number(c),
            rate: Number(r),
            fixed: Number(f),
            date: d.trim()
        };

        const res = await axios.post('https://water-billing-292n.onrender.com/save-record', saveData);
        if (res.data.success) {
            await sock.sendMessage(chatId, { text: `✅ Rekodi ya *${n}* imehifadhiwa kikamilifu!` }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: "❌ Imeshindwa kuhifadhi. Hakikisha server ipo online." }, { quoted: msg });
    }
};

module.exports = waterSaveCommand;
