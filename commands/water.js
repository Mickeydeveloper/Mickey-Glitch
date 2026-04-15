const axios = require('axios');
const { sendButtons } = require('gifted-btns');

/**
 * Water Billing System - Smart Command Handler
 */
const waterCommand = async (sock, chatId, msg, args) => {
    if (!sock?.sendMessage) return;

    // 1. Tunasafisha args (hakikisha ni array)
    const safeArgs = Array.isArray(args) ? args : [];
    
    // 2. Tunatafuta sub-command (mfano: 'ai', 'bill', 'health')
    const subCommand = safeArgs[0]?.toLowerCase();
    
    // 3. Tunachukua maneno yaliyobaki (mfano: baada ya 'ai')
    const query = safeArgs.slice(1).join(' '); 
    
    const BASE_URL = 'https://water-billing-292n.onrender.com';

    try {
        // --- LOGIC YA KUTAMBUA COMMAND ---
        
        // IKIWA NI '.water' PEKEE (Bila sub-command)
        if (!subCommand) {
            const helpMsg = `
╭━━〔 *ＷＡＴＥＲ-ＳＹＳＴＥＭ* 〕━━┈⊷
┃ 👤 *User:* ${msg.pushName || 'Client'}
┃ 🏦 *Service:* Water Billing TZ
╰━━━━━━━━━━━━━━━━━━┈⊷

*Zifuatazo ni command unazoweza kutumia:*

💧 *.water ai [text]* - Uliza AI
📊 *.water bill* - Angalia ankara
📡 *.water health* - System Status
💾 *.water save* - Hifadhi rekodi

*© 2026 Mickey Tanzanite Era*`.trim();

            return await sendButtons(sock, chatId, {
                title: 'WATER BILLING MENU',
                text: helpMsg,
                footer: 'Mickdad Hamza Salim - Dev',
                image: { url: 'https://water-billing-292n.onrender.com/1761205727440.png' },
                buttons: [
                    { id: '.water ai Habari', text: '🤖 AI Chat' },
                    { id: '.water bill', text: '📑 My Bills' },
                    { id: '.water health', text: '📡 Status' }
                ]
            }, { quoted: msg });
        }

        // IKIWA KUNA SUB-COMMAND (mfano .water ai)
        if (subCommand === 'ai') {
            if (!query) return sock.sendMessage(chatId, { text: "❌ Andika swali lako baada ya .water ai" }, { quoted: msg });
            const aiRes = await axios.get(`${BASE_URL}/api/chat?text=${encodeURIComponent(query)}`);
            return await sock.sendMessage(chatId, { text: `🤖 *Mickey Assistant:*\n\n${aiRes.data.reply}` }, { quoted: msg });
        }

        if (subCommand === 'bill' || subCommand === 'ankara') {
            const billRes = await axios.get(`${BASE_URL}/get-records`);
            const userPhone = msg.key.remoteJid.split('@')[0];
            const myRecords = (billRes.data.records || []).filter(r => r.phone && r.phone.includes(userPhone));

            if (myRecords.length > 0) {
                let txt = `*📑 ANKARA ZA MAJI (${userPhone})*\n\n`;
                myRecords.forEach((r, i) => {
                    txt += `*${i+1}. Tarehe:* ${r.date}\n   - Usage: ${r.usage} units\n   - Deni: TSH ${r.total.toLocaleString()}\n\n`;
                });
                return await sock.sendMessage(chatId, { text: txt }, { quoted: msg });
            } else {
                return await sock.sendMessage(chatId, { text: "❌ Hujasajiliwa kwenye rekodi za ankara." }, { quoted: msg });
            }
        }

        if (subCommand === 'health') {
            const hRes = await axios.get(`${BASE_URL}/health`);
            return await sock.sendMessage(chatId, { text: `🌐 Server: Online\n🗄️ MongoDB: ${hRes.data.mongodb ? 'Connected' : 'Error'}` }, { quoted: msg });
        }

        // Ikiwa ameandika .water [kitu kisichojulikana]
        await sock.sendMessage(chatId, { text: "❌ Sub-command hiyo haipo. Tumia *.water* kuona menu." }, { quoted: msg });

    } catch (error) {
        console.error('API Error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ Hitilafu! Server inaweza kuwa imelala. Jaribu tena baada ya muda mfupi.' }, { quoted: msg });
    }
};

module.exports = waterCommand;
