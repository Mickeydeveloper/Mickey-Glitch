const os = require('os');
const axios = require('axios');
const { performance } = require('perf_hooks');
const { sendButtons } = require('gifted-btns');

/**
 * Water Billing System Command - FIXED VERSION
 */
const waterCommand = async (sock, chatId, msg, args) => {
    if (!sock?.sendMessage) return;

    // FIX: Tunahakikisha args ni array ili .slice() isilete error
    const safeArgs = Array.isArray(args) ? args : [];
    const subCommand = safeArgs[0]?.toLowerCase();
    const query = safeArgs.slice(1).join(' '); // Hapa ndipo palikuwa na error
    
    const BASE_URL = 'https://water-billing-292n.onrender.com';

    try {
        // CASE: .water pekee (Maelekezo)
        if (!subCommand) {
            const helpMsg = `
╭━━〔 *ＷＡＴＥＲ-ＳＹＳＴＥＭ* 〕━━┈⊷
┃ 👤 *User:* ${msg.pushName || 'Client'}
┃ 🏦 *Service:* Water Billing TZ
╰━━━━━━━━━━━━━━━━━━┈⊷

*Zifuatazo ni command unazoweza kutumia:*

💧 *.water ai [text]*
   - Uliza chochote kuhusu maji.
📊 *.water bill*
   - Angalia ankara zako zote.
💾 *.water save [data]*
   - Format: Jina|Prev|Curr|Rate|Fixed|Date
📡 *.water health*
   - Angalia kama system ipo online.

*© 2026 Mickey Tanzanite Era*`.trim();

            return await sendButtons(sock, chatId, {
                title: 'WATER BILLING MENU',
                text: helpMsg,
                footer: 'Quantum Base Developer',
                image: { url: 'https://water-billing-292n.onrender.com/1761205727440.png' },
                buttons: [
                    { id: '.water ai Habari', text: '🤖 AI Chat' },
                    { id: '.water bill', text: '📑 My Bills' },
                    { id: '.water health', text: '📡 Status' }
                ]
            }, { quoted: msg });
        }

        // SWITCH KWA SUB-COMMANDS
        switch (subCommand) {
            case 'ai':
                if (!query) return sock.sendMessage(chatId, { text: "❌ Weka swali! Mfano: .water ai nitalipaje?" }, { quoted: msg });
                const aiRes = await axios.get(`${BASE_URL}/api/chat?text=${encodeURIComponent(query)}`);
                await sock.sendMessage(chatId, { text: `🤖 *Assistant:*\n\n${aiRes.data.reply}` }, { quoted: msg });
                break;

            case 'bill':
                const billRes = await axios.get(`${BASE_URL}/get-records`);
                const userPhone = msg.key.remoteJid.split('@')[0];
                const myRecords = (billRes.data.records || []).filter(r => r.phone && r.phone.includes(userPhone));

                if (myRecords.length > 0) {
                    let txt = `*📑 ANKARA ZA MAJI (${userPhone})*\n\n`;
                    myRecords.forEach((r, i) => {
                        txt += `*${i+1}. Tarehe:* ${r.date}\n   - Usage: ${r.usage} units\n   - Deni: TSH ${r.total.toLocaleString()}\n\n`;
                    });
                    await sock.sendMessage(chatId, { text: txt }, { quoted: msg });
                } else {
                    await sock.sendMessage(chatId, { text: "❌ Hujasajiliwa kwenye rekodi." }, { quoted: msg });
                }
                break;

            case 'health':
                const hRes = await axios.get(`${BASE_URL}/health`);
                await sock.sendMessage(chatId, { text: `🌐 Server: Online\n🗄️ DB: ${hRes.data.mongodb ? 'Connected' : 'Disconnected'}` }, { quoted: msg });
                break;

            default:
                await sock.sendMessage(chatId, { text: "❌ Command haijulikani. Tumia *.water* pekee." }, { quoted: msg });
                break;
        }

    } catch (error) {
        console.error('Water API Error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ Server inapata shida au inawaka (Render Sleep). Jaribu tena.' }, { quoted: msg });
    }
};

module.exports = waterCommand;
