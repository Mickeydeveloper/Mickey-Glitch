const os = require('os');
const { performance } = require('perf_hooks');

const formatUptime = (secs) => {
    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor((secs % (3600 * 24)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
};

const aliveCommand = async (conn, chatId, msg) => {
    if (!conn || typeof conn.sendMessage !== 'function') return;

    const start = performance.now();

    try {
        await conn.sendPresenceUpdate('composing', chatId);

        const dateObj = new Date();
        const options = { timeZone: 'Africa/Dar_es_Salaam', hour12: true };
        const time = dateObj.toLocaleTimeString('en-GB', options);
        
        const end = performance.now();
        const ping = (end - start).toFixed(0);
        const totalRam = os.totalmem() / 1024 / 1024 / 1024;
        const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024 / 1024);
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);

        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        const caption = `╭━━━〔 *ＭＩＣＫＥＹ-Ｖ３* 〕━━━┈⊷
┃ 👤 *Mtumiaji:* ${msg.pushName || 'User'}
┃ 🕒 *Muda:* ${time} EAT
┃ 🚀 *Ping:* ${ping}ms ${ping < 100 ? '🚀' : '🟢'}
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 *SYSTEM STATUS* 〕━━━┈⊷
┃ ⏳ *Uptime:* ${formatUptime(process.uptime())}
┃ 🧠 *RAM:* ${usedRam.toFixed(1)}GB / ${totalRam.toFixed(0)}GB (${ramPercent}%)
┃ 🔧 *CPU:* ${os.cpus()[0]?.model.split('@')[0].trim() || 'Standard'}
┃ 🖥️ *OS:* ${os.platform()} (${os.arch()})
┃ 🟢 *Hali:* Stable & Active
╰━━━━━━━━━━━━━━━━━━┈⊷

*Channel:* https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A
_© 2026 Mickey Glitch Technology_`;

        // ────────────────────────────────────────────────
        // MBINU YA BUTTONS (Using ContextInfo Ads)
        // Kwa kuwa socket buttons zinasumbua, tunatumia Link-Buttons
        // ────────────────────────────────────────────────
        await conn.sendMessage(chatId, {
            image: { url: imageUrl },
            caption: caption,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                showAdAttribution: true, // Imerudishwa (Restored)
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈-𝐆𝐋𝐈𝐓𝐂𝐇 🚀',
                    serverMessageId: 1
                },
                externalAdReply: {
                    title: 'ＭＩＣＫＥＹ 𝐕𝟑 𝐀𝐋𝐈𝐕𝐄',
                    body: `Speed: ${ping}ms | Status: Active`,
                    thumbnailUrl: imageUrl,
                    // Hapa tunaweka link ya kwanza kama Button (Menu)
                    sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A', 
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    // Hapa tunatengeneza muundo wa "Buttons" kupitia maandishi ya ziada
                }
            }
        }, { quoted: msg });

        // Tuma button za ziada kama ujumbe wa maandishi uliopangiliwa (Kama bot haina mfumo wa vnode)
        const buttonText = `*BONYEZA HAPA CHINI:*
        
1. 📜 *MENU:* .menu
2. 👤 *OWNER:* .owner
3. 📢 *CHANNEL:* .channel`;

        // Hii ni mbinu ya "Fake Buttons" inayofanya kazi 100% kwenye kila toleo la WhatsApp
        await conn.sendMessage(chatId, { text: buttonText }, { quoted: msg });

    } catch (e) {
        console.error('❌ Alive Error:', e);
    }
};

module.exports = aliveCommand;
