const os = require('os');
const axios = require('axios');
const { performance } = require('perf_hooks');
const { sendButtons } = require('gifted-btns');

/**
 * Water Billing System Command for Mickey Glitch
 */
const waterCommand = async (sock, chatId, msg, args) => {
    if (!sock?.sendMessage) return;

    const subCommand = args[0]?.toLowerCase();
    const query = args.slice(1).join(' ');
    const BASE_URL = 'https://water-billing-292n.onrender.com';
    
    // Auth Details (Kama API inahitaji login session, hapa utahitaji kuset headers)
    const AUTH_INFO = {
        email: "mickidadyhamza@gmail.com",
        password: "MICKEY24@"
    };

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
   - Hifadhi rekodi (Admin Only).
   - _Format: Jina|Prev|Curr|Rate|Fixed|Date_
📡 *.water health*
   - Angalia kama system ipo online.
💰 *.water stats*
   - Angalia summary ya mapato.

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
                if (!query) return sock.sendMessage(chatId, { text: "❌ Tafadhali weka swali lako baada ya .water ai" }, { quoted: msg });
                const aiRes = await axios.get(`${BASE_URL}/api/chat?text=${encodeURIComponent(query)}`);
                await sock.sendMessage(chatId, { text: `🤖 *Mickey Assistant:*\n\n${aiRes.data.reply}` }, { quoted: msg });
                break;

            case 'bill':
            case 'ankara':
                const billRes = await axios.get(`${BASE_URL}/get-records`);
                const userPhone = msg.key.remoteJid.split('@')[0];
                const myRecords = billRes.data.records.filter(r => r.phone.includes(userPhone));

                if (myRecords.length > 0) {
                    let txt = `*📑 ANKARA ZA MAJI (${userPhone})*\n\n`;
                    myRecords.forEach((r, i) => {
                        txt += `*${i+1}. Tarehe:* ${r.date}\n   - Matumizi: ${r.usage} units\n   - Deni: TSH ${r.total.toLocaleString()}\n\n`;
                    });
                    await sock.sendMessage(chatId, { text: txt }, { quoted: msg });
                } else {
                    await sock.sendMessage(chatId, { text: "❌ Hujasajiliwa kwenye rekodi za ankara." }, { quoted: msg });
                }
                break;

            case 'save':
                if (!query.includes('|')) return sock.sendMessage(chatId, { text: "❌ Format: .water save Jina|Prev|Curr|Rate|Fixed|Y-M-D" }, { quoted: msg });
                const [n, p, c, r, f, d] = query.split('|');
                const saveData = { name: n.trim(), phone: msg.key.remoteJid.split('@')[0], prev: Number(p), curr: Number(c), rate: Number(r), fixed: Number(f), date: d.trim() };
                
                const saveRes = await axios.post(`${BASE_URL}/save-record`, saveData);
                if (saveRes.data.success) {
                    await sock.sendMessage(chatId, { text: `✅ Rekodi ya *${n}* imehifadhiwa!` }, { quoted: msg });
                }
                break;

            case 'health':
                const start = performance.now();
                const hRes = await axios.get(`${BASE_URL}/health`);
                const lat = (performance.now() - start).toFixed(0);
                const hMsg = `*STATUS YA SYSTEM*\n\n🌐 Server: Online\n📡 Latency: ${lat}ms\n🗄️ MongoDB: ${hRes.data.mongodb ? 'Connected' : 'Error'}`;
                await sock.sendMessage(chatId, { text: hMsg }, { quoted: msg });
                break;

            case 'stats':
                // Hii endpoint inahitaji login session kawaida, hapa tunacheki kama ipo public
                try {
                    const sRes = await axios.get(`${BASE_URL}/get-payment-stats`);
                    const sTxt = `*📊 PAYMENT STATS*\n\n💰 Total: TSH ${sRes.data.totalAmount.toLocaleString()}\n✅ Paid: ${sRes.data.completedPayments}\n⏳ Pending: ${sRes.data.pendingPayments}`;
                    await sock.sendMessage(chatId, { text: sTxt }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(chatId, { text: "⚠️ Statas zinahitaji Admin Login kwenye API." }, { quoted: msg });
                }
                break;

            default:
                await sock.sendMessage(chatId, { text: "❌ Command haijulikani. Tumia *.water* kuona maelekezo." }, { quoted: msg });
                break;
        }

    } catch (error) {
        console.error('Water API Error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ Server ipo "offline" au Render inajiamsha. Jaribu tena baada ya sekunde 30.' }, { quoted: msg });
    }
};

module.exports = waterCommand;
