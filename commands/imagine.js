const axios = require('axios');
const chalk = require('chalk');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @command: IMAGINE (AI Image Generation)
 * @author: Quantum Base Developer (TZ)
 * @api: https://api.vreden.my.id/api/v1/artificial/deepai/text2img
 */

async function imagineCommand(sock, chatId, m, body) {
    try {
        // 1. Pata maelezo (prompt) kutoka kwa user
        // Tunaondoa '.imagine ' (herufi 9) au tumia args kama unayo m-variable
        const text = body.slice(9).trim(); 
        
        if (!text) {
            return await sock.sendMessage(chatId, { text: "⚠️ *Tafadhali andika maelezo ya picha unayotaka kutengeneza!* \n\n*Mfano:* `.imagine simba wa kitanzania amevaa koti la Quantum`" }, { quoted: m });
        }

        // 2. React na emoji kuonyesha bot inafanya kazi
        await sock.sendMessage(chatId, { react: { text: '🎨', key: m.key } });

        // 3. Tuma message ya 'Tafadhali subiri'
        await sock.sendMessage(chatId, { text: `⏳ *Mickey Glitch AI inatengeneza picha yako...*\n\n🎨 *Prompt:* ${text}\n\n*Quantum Base Developer (TZ)*` }, { quoted: m });

        console.log(chalk.cyan(`[AI Imagine] Generating image for prompt: ${text}`));

        // 4. Unganisha na API ya Vreden (DeepAI Text2Img)
        // Tunatumia shape=square na model=future-architecture-generator kama ulivyoomba
        const apiBaseUrl = "https://api.vreden.my.id/api/v1/artificial/deepai/text2img";
        const finalApiUrl = `${apiBaseUrl}?prompt=${encodeURIComponent(text)}&shape=square&model=future-architecture-generator`;

        // 5. Ita API na chukua picha kama Buffer (Arraybuffer)
        const response = await axios.get(finalApiUrl, {
            responseType: 'arraybuffer', // Muhimu ili kupata picha yenyewe
            timeout: 60000 // Weka timeout ya sekunde 60 kwa AI
        });

        // 6. Angalia kama API imerudisha picha
        if (!response.data) {
            throw new Error("API did not return image data.");
        }

        // 7. Tuma picha kwa user
        const captionText = `✨ *AI GENERATED IMAGE BY MICKEY* ✨\n\n🎨 *Prompt:* ${text}\n🚀 *V3.0.5 Quantum Base Tech*`;

        await sock.sendMessage(chatId, { 
            image: Buffer.from(response.data), // Geuza arraybuffer kuwa Buffer
            caption: captionText
        }, { quoted: m });

        console.log(chalk.green(`[AI Imagine] Image sent successfully!`));

        // React na '✅' kuonyesha imekamilika
        await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error(chalk.red('[AI Imagine ERROR]:'), err.message);
        
        // React na '❌' kuonyesha feli
        await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } });

        // Tuma ujumbe wa kosa
        let errorMsg = "❌ *Hitilafu imetokea wakati wa kutengeneza picha.* \n\n*Sababu:* API inaweza kuwa busy au kuna tatizo la mtandao. Jaribu tena baada ya muda kidogo.";
        
        if (err.code === 'ECONNABORTED') {
            errorMsg = "❌ *Hitilafu:* API imechukua muda mrefu sana kujibu (Timeout). Jaribu prompt fupi zaidi au jaribu tena.";
        }

        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
    }
}

// ────────────────────────────────────────────────
// EXPORT KWA AJILI YA AUTO-SYNC (Quantum Style)
// ────────────────────────────────────────────────
module.exports = {
    name: 'imagine',
    alias: ['ai', 'draw', 'paint', 'img'],
    category: 'ai',
    description: 'Tengeneza picha kali kwa kutumia AI (Text-to-Image)',
    execute: imagineCommand
};
