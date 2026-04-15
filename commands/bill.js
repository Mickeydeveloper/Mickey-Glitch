const axios = require('axios');

const billCommand = async (sock, chatId, msg) => {
    const BASE_URL = 'https://water-billing-292n.onrender.com';
    const userPhone = msg.key.remoteJid.split('@')[0];

    try {
        const res = await axios.get(`${BASE_URL}/get-records`);
        const myRecords = (res.data.records || []).filter(r => r.phone && r.phone.includes(userPhone));

        if (myRecords.length > 0) {
            let txt = `*📑 ANKARA ZA MAJI (${userPhone})*\n\n`;
            myRecords.forEach((r, i) => {
                txt += `*${i+1}. Tarehe:* ${r.date}\n   - Matumizi: ${r.usage} units\n   - Deni: TSH ${r.total.toLocaleString()}\n\n`;
            });
            await sock.sendMessage(chatId, { text: txt }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: "❌ Hujasajiliwa kwenye rekodi za ankara." }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: "⚠️ Server inajiamsha, jaribu tena mda mfupi." }, { quoted: msg });
    }
};

module.exports = billCommand;
