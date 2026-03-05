const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');

const aliveCommand = async (conn, chatId, msg) => {
    try {
        const senderName = msg.pushName || 'User';
        const prefix = '.'; // Badilisha kama unatumia prefix tofauti
        
        // 1. Piga hesabu ya RAM
        const totalRAM = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const freeRAM = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedRAM = (totalRAM - freeRAM).toFixed(2);

        // 2. Pata Uptime
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

        // 3. TAFUTA COMMANDS ZOTE (Auto-Read Folder)
        const cmdFolder = path.join(__dirname, '../commands');
        let commandsList = "";
        let count = 0;

        if (fs.existsSync(cmdFolder)) {
            const files = fs.readdirSync(cmdFolder).filter(file => file.endsWith('.js'));
            count = files.length;

            files.forEach(file => {
                const cmdName = file.replace('.js', '');
                let description = "No description available";

                // Jaribu kusoma maelezo ndani ya kila file (kama yapo)
                try {
                    const content = fs.readFileSync(path.join(cmdFolder, file), 'utf8');
                    // Inatafuta comment inayosema @description au maelezo ya kwanza
                    const descMatch = content.match(/\/\/\s*(.*)/); 
                    if (descMatch && descMatch[1].length < 50) {
                        description = descMatch[1].trim();
                    }
                } catch (e) { }

                commandsList += `┃ ◈ \`${prefix}${cmdName}\`\n┃ ╰┈ *${description}*\n`;
            });
        }

        // 4. Jenga Ujumbe (Muundo uliouomba)
        const finalMessage = `╭━━━〔 *𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑* 〕━━━┈⊷
┃ 👑 *Owner:* Mickey
┃ 👤 *User:* ${senderName}
┃ ⏲️ *Uptime:* ${uptimeString}
┃ 🛡️ *Mode:* public
┃ 🧩 *Prefix:* [ ${prefix} ]
┃ 🧠 *RAM:* ${usedRAM}GB / ${totalRAM}GB
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 *COMMAND LIST* 〕━━━┈⊷
${commandsList}╰━━━━━━━━━━━━━━━━━━┈⊷
*Total:* ${count} Commands`;

        // 5. Tuma kwa Muonekano wa Kadi
        await conn.sendMessage(chatId, {
            text: finalMessage,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈',
                    serverMessageId: 101
                },
                externalAdReply: {
                    title: "ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ꜱʏꜱᴛᴇᴍ",
                    body: `Active Commands: ${count}`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(chatId, { text: "Error loading commands..." });
    }
};

module.exports = aliveCommand;
