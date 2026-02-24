const moment = require('moment-timezone');
const os = require('os');

/**
 * Formats seconds into a compact d h m s string
 */
const formatUptime = (secs) => {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

const aliveCommand = async (conn, chatId, msg) => {
    try {
        await conn.sendPresenceUpdate('composing', chatId);

        // System & Time Stats
        const tz = process.env.TIMEZONE || 'Africa/Dar_es_Salaam';
        const now = moment().tz(tz);
        
        const stats = {
            uptime: formatUptime(process.uptime()),
            ram: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB / ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
            cpu: os.cpus()[0]?.model.split('@')[0].trim() || 'Generic CPU',
            ping: msg?.messageTimestamp ? `${Date.now() - (msg.messageTimestamp * 1000)}ms` : '---',
            user: msg.pushName || 'User'
        };

        const imageUrl = process.env.AD_IMAGE_URL || 'https://files.catbox.moe/llc9v7.png';
        
        // Refined Caption Construction
        const caption = `╭───────────────╮
  ⚡ *MICKEY GLITCH V3* ⚡
╰───────────────╯

👤 *USER:* \`${stats.user}\`
🕒 *TIME:* \`${now.format('HH:mm:ss')}\`
📅 *DATE:* \`${now.format('DD/MM/YYYY')}\`

*───〔 SYSTEM STATUS 〕───*

🚀 *Ping:* \`${stats.ping}\`
⏳ *Uptime:* \`${stats.uptime}\`
🧠 *RAM:* \`${stats.ram}\`
💻 *OS:* \`${os.platform()} (${os.arch()})\`
🔧 *CPU:* \`${stats.cpu}\`

*Status:* \`Operational 🟢\`
_Fast • Reliable • Powerful_`;

        const messagePayload = {
            image: { url: imageUrl },
            caption: caption,
            footer: 'Mickey Glitch • System Interface',
            buttons: [
                { buttonId: '.menu', buttonText: { displayText: '📜 MENU' }, type: 1 },
                { buttonId: '.ping', buttonText: { displayText: '⚡ PING' }, type: 1 }
            ],
            headerType: 4,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                externalAdReply: {
                    title: 'MICKEY GLITCH ACTIVE',
                    body: `System Uptime: ${stats.uptime}`,
                    thumbnailUrl: imageUrl,
                    sourceUrl: process.env.AD_SOURCE_URL || '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        };

        await conn.sendMessage(chatId, messagePayload, { quoted: msg });

    } catch (error) {
        console.error('❌ Alive Error:', error);
    }
};

module.exports = aliveCommand;
