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
    if (!conn) return;

    const start = performance.now();
    try {
        await conn.sendPresenceUpdate('composing', chatId);

        const end = performance.now();
        const ping = (end - start).toFixed(0);
        const totalRam = os.totalmem() / 1024 / 1024 / 1024;
        const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024 / 1024);
        
        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        const caption = `╭━━━〔 *ＭＩＣＫＥＹ-Ｖ３* 〕━━━┈⊷
┃ 👤 *Mtumiaji:* ${msg.pushName || 'User'}
┃ 🕒 *Muda:* ${new Date().toLocaleTimeString('en-GB', {timeZone: 'Africa/Dar_es_Salaam'})}
┃ 🚀 *Ping:* ${ping}ms ⚡
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 *SYSTEM STATUS* 〕━━━┈⊷
┃ ⏳ *Uptime:* ${formatUptime(process.uptime())}
┃ 🧠 *RAM:* ${usedRam.toFixed(1)}GB / ${totalRam.toFixed(0)}GB
┃ 🔧 *CPU:* ${os.cpus()[0]?.model.split('@')[0].trim()}
┃ 🟢 *Hali:* Stable & Active
╰━━━━━━━━━━━━━━━━━━┈⊷`;

        // ────────────────────────────────────────────────
        // MBINU YA BUTTONS YENYE MEDIA (Interactive Message)
        // ────────────────────────────────────────────────
        
        const messageContent = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: "ＭＩＣＫＥＹ 𝐕𝟑 𝐀𝐋𝐈𝐕𝐄",
                            hasMediaAttachment: true,
                            imageMessage: (await conn.prepareWAMessageMedia({ image: { url: imageUrl } }, { upload: conn.waUploadToServer })).imageMessage
                        },
                        body: {
                            text: caption
                        },
                        footer: {
                            text: "© 2026 Mickey Glitch Technology"
                        },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📜 MAIN MENU",
                                        id: ".menu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "👤 OWNER",
                                        id: ".owner"
                                    })
                                },
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📢 JOIN CHANNEL",
                                        url: "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A"
                                    })
                                }
                            ]
                        },
                        contextInfo: {
                            isForwarded: true,
                            forwardingScore: 999,
                            showAdAttribution: true, // Imerudishwa (Restored)
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363398106360290@newsletter',
                                newsletterName: '🅼🅸🅲🅺🅴𝚈-𝐆𝐋𝐈𝐓𝐂𝐇 🚀',
                                serverMessageId: 1
                            }
                        }
                    }
                }
            }
        };

        // Tuma ujumbe uliokamilika
        await conn.relayMessage(chatId, messageContent, {});

    } catch (e) {
        console.error('❌ Alive Error:', e);
        // Fallback ikiwa interactive message itagoma
        await conn.sendMessage(chatId, { image: { url: imageUrl }, caption: "Mickey is Alive!" });
    }
};

module.exports = aliveCommand;
