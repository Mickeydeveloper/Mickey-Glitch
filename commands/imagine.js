const axios = require('axios');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: IMAGINE (Fixed Image View)
 */

async function imagineCommand(sock, chatId, m, body) {
    try {
        const text = body.split(' ').slice(1).join(' ');
        if (!text) return await sock.sendMessage(chatId, { text: "⚠️ Andika maelezo ya picha!" });

        await sock.sendMessage(chatId, { react: { text: '🎨', key: m.key } });

        const apiUrl = `https://api.vreden.my.id/api/v1/artificial/deepai/text2img?prompt=${encodeURIComponent(text)}&shape=square&model=future-architecture-generator`;

        // 1. Pata data kwa njia ya arraybuffer
        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 100000,
            headers: {
                'Accept': 'image/*,application/json' // Omba picha kwanza
            }
        });

        // 2. Check kama kilichorudi ni picha kweli (Mime Type check)
        const contentType = response.headers['content-type'];
        
        if (contentType && contentType.includes('image')) {
            // Kama ni picha, itume kama Buffer
            await sock.sendMessage(chatId, { 
                image: Buffer.from(response.data),
                caption: `✨ *AI GENERATED IMAGE*\n\n🎨 *Prompt:* ${text}\n🚀 *Mickey Glitch V3.0.5*`
            }, { quoted: m });
            
            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });
        } else {
            // Kama API imerudisha JSON badala ya picha (Error)
            const errorData = JSON.parse(Buffer.from(response.data).toString());
            console.log("API Error:", errorData);
            await sock.sendMessage(chatId, { text: "❌ API imeshindwa kutengeneza picha kwa sasa. Jaribu prompt nyingine." });
        }

    } catch (err) {
        console.error('Imagine Error:', err.message);
        await sock.sendMessage(chatId, { text: "🚨 Connection error! Jaribu tena baada ya muda kidogo." });
    }
}

module.exports = {
    name: 'imagine',
    alias: ['ai', 'draw'],
    category: 'ai',
    execute: imagineCommand
};
