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
┃ 🖥️ *OS:* ${os.platform()} (${os.arch()})
┃ 🟢 *Hali:* Stable & Active
╰━━━━━━━━━━━━━━━━━━┈⊷`;

        // ────────────────────────────────────────────────
        // MBINU YA LIST BUTTON (Interactive List Message)
        // ────────────────────────────────────────────────
        
        const listMessage = {
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
                            text: "© 2026 Mickey Glitch Tech"
                        },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "single_select",
                                    buttonParamsJson: JSON.stringify({
                                        title: "SELECT HERE ⚡",
                                        sections: [
                                            {
                                                title: "MAIN NAVIGATION",
                                                rows: [
                                                    {
                                                        header: "📜 MENU",
                                                        title: "Show All Commands",
                                                        description: "Displays the bot main menu",
                                                        id: ".menu"
                                                    },
                                                    {
                                                        header: "👤 OWNER",
                                                        title: "Contact Developer",
                                                        description: "Get Mickey's contact info",
                                                        id: ".owner"
                                                    },
                                                    {
                                                        header: "📢 CHANNEL",
                                                        title: "Join Official Channel",
                                                        description: "Get latest bot updates",
                                                        id: ".channel"
                                                    }
                                                ]
                                            },
                                            {
                                                title: "SUPPORT",
                                                rows: [
                                                    {
                                                        header: "🛠️ SCRIPT",
                                                        title: "Get Bot Source Code",
                                                        description: "Github link for Mickey-v3",
                                                        id: ".script"
                                                    }
                                                ]
                                            }
                                        ]
                                    })
                                }
                            ]
                        },
                        contextInfo: {
                            isForwarded: true,
                            forwardingScore: 999,
                            showAdAttribution: true,
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

        // Tuma ujumbe uliokamilika kwa relayMessage
        await conn.relayMessage(chatId, listMessage, {});

    } catch (e) {
        console.error('❌ Alive Error:', e);
        // Fallback ikiwa kitu kitagoma
        await conn.sendMessage(chatId, { text: `🟢 *Bot is Active!*` });
    }
};

module.exports = aliveCommand;
