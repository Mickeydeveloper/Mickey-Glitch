const axios = require('axios');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: IMAGINE (Fixed JSON Link)
 * @author: Quantum Base Developer (TZ)
 */

async function imagineCommand(sock, chatId, m, body) {
    try {
        const text = body.split(' ').slice(1).join(' ');
        if (!text) return await sock.sendMessage(chatId, { text: "⚠️ *Andika maelezo ya picha unayotaka!*" });

        // React na emoji ya brashi ya rangi
        await sock.sendMessage(chatId, { react: { text: '🎨', key: m.key } });

        const apiUrl = `https://api.vreden.my.id/api/v1/artificial/deepai/text2img?prompt=${encodeURIComponent(text)}&shape=square&model=future-architecture-generator`;

        // 1. Ita API kupata JSON data
        const res = await axios.get(apiUrl);
        
        // 2. Toa link ya picha kutoka kwenye JSON (result.output_url)
        const imageUrl = res.data?.result?.output_url;

        if (!imageUrl) {
            console.log("API Response Error:", res.data);
            return await sock.sendMessage(chatId, { text: "❌ *AI imeshindwa kutengeneza picha.* Jaribu tena baadae." });
        }

        // 3. Pakua picha yenyewe kutoka kwenye hiyo output_url
        const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        // 4. Tuma picha kwa user
        await sock.sendMessage(chatId, { 
            image: Buffer.from(imageRes.data),
            caption: `✨ *AI GENERATED IMAGE BY MICKEY* ✨\n\n🎨 *Prompt:* ${text}\n🚀 *Quantum Base Tech V3.0.5*`
        }, { quoted: m });

        // Malizia na Reaction ya mafanikio
        await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('Imagine Error:', err.message);
        await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } });
        await sock.sendMessage(chatId, { text: "🚨 *Connection Error:* API imeshindwa kujibu kwa wakati." });
    }
}

module.exports = {
    name: 'imagine',
    alias: ['ai', 'draw', 'img'],
    category: 'ai',
    execute: imagineCommand
};
