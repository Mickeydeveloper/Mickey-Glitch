const os = require('os');
const settings = require('../settings');
const { A2UI, sendA2UIWidget } = require('../lib/a2ui');

/**
 * Formats seconds into a human-readable string (d h m s)
 */
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}ᴅ`);
    if (h > 0) parts.push(`${h}ʜ`);
    if (m > 0) parts.push(`${m}ᴍ`);
    parts.push(`${s}ꜱ`);

    return parts.join(' ');
};

const getBotName = () => {
    return settings.botName || settings.botname || global.botName || 'Mickey Glitch';
};

/**
 * Generate progress bar
 */
const progressBar = (percentage, length = 10) => {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
};

/**
 * Get formatted date with fancy emojis
 */
const getFormattedDate = () => {
    const now = new Date();
    const days = ['𝐒𝐮𝐧𝐝𝐚𝐲', '𝐌𝐨𝐧𝐝𝐚𝐲', '𝐓𝐮𝐞𝐬𝐝𝐚𝐲', '𝐖𝐞𝐝𝐧𝐞𝐬𝐝𝐚𝐲', '𝐓𝐡𝐮𝐫𝐬𝐝𝐚𝐲', '𝐅𝐫𝐢𝐝𝐚𝐲', '𝐒𝐚𝐭𝐮𝐫𝐝𝐚𝐲'];
    const months = ['𝐉𝐚𝐧', '𝐅𝐞𝐛', '𝐌𝐚𝐫', '𝐀𝐩𝐫', '𝐌𝐚𝐲', '𝐉𝐮𝐧', '𝐉𝐮𝐥', '𝐀𝐮𝐠', '𝐒𝐞𝐩', '𝐎𝐜𝐭', '𝐍𝐨𝐯', '𝐃𝐞𝐜'];

    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
};

/**
 * Main command handler
 */
const aliveCommand = async (sock, chatId, message) => {
    try {
        const botName = getBotName();
        const formattedDate = getFormattedDate();

        const time = new Date().toLocaleTimeString('en-US', { 
            timeZone: 'Africa/Dar_es_Salaam', 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const totalRam = os.totalmem();
        const freeRam = os.freemem();
        const usedRam = totalRam - freeRam;
        const processRam = process.memoryUsage().rss / Math.pow(1024, 3);
        const totalRamGb = totalRam / Math.pow(1024, 3);
        const usedRamGb = usedRam / Math.pow(1024, 3);
        const freeRamGb = freeRam / Math.pow(1024, 3);
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);
        const ramBar = progressBar(parseFloat(ramPercent), 12);

        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model?.split('@')[0].trim() || 'Generic CPU';
        const cpuCores = cpus.length || 1;

        const uptime = formatUptime(process.uptime());
        const platformNames = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' };
        const platform = platformNames[os.platform()] || os.platform();
        const arch = os.arch();
        const botUptime = global.botStartTime
            ? formatUptime(Math.max(0, Math.floor((Date.now() - global.botStartTime) / 1000)))
            : uptime;
        const health = ramPercent < 70 ? '🟢 Status: Healthy' : ramPercent < 85 ? '🟡 Status: Memory use is elevated' : '🔴 Status: High memory use';

        const imageUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/chatbot.png';

        const statusMessage = `🚀 *${botName} Status*

*— USER INFO —*
👤 *Name:* ${message.pushName || 'Guest'}
📅 *Date:* ${formattedDate}
🕐 *Time:* ${time} EAT
✅ *Status:* Online

*— BOT RUNTIME —*
🤖 *Bot Uptime:* ${botUptime}
🖥️ *Server Uptime:* ${uptime}

*— SYSTEM —*
💾 *System RAM:* ${ramPercent}% (${usedRamGb.toFixed(1)} / ${totalRamGb.toFixed(1)}GB)
📊 ${ramBar}
🧠 *Bot RAM:* ${processRam.toFixed(2)}GB
🖥️ *CPU:* ${cpuModel.split(' ').slice(0, 2).join(' ')} (${cpuCores} cores)
💿 *OS:* ${platform} (${arch})

*— HEALTH —*
${health}
💡 *Free RAM:* ${freeRamGb.toFixed(2)}GB

_Mickey Glitch Technology™_`;

        const footer = '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲';

        const a2ui = new A2UI();
        const title = a2ui.text(`${botName} Status`, { variant: 'h1' });
        const statusImage = a2ui.image(imageUrl, { variant: 'header', fit: 'cover' });
        const userSection = a2ui.column([
            a2ui.text('User info', { variant: 'h2' }),
            a2ui.text(`Name: ${message.pushName || 'Guest'}\nDate: ${formattedDate}\nTime: ${time} EAT\nStatus: Online`)
        ]);
        const runtimeSection = a2ui.column([
            a2ui.text('Bot runtime', { variant: 'h2' }),
            a2ui.text(`Bot uptime: ${botUptime}\nServer uptime: ${uptime}`)
        ]);
        const systemSection = a2ui.column([
            a2ui.text('System', { variant: 'h2' }),
            a2ui.text(`System RAM: ${ramPercent}% (${usedRamGb.toFixed(1)} / ${totalRamGb.toFixed(1)}GB)\n${ramBar}\nBot RAM: ${processRam.toFixed(2)}GB\nCPU: ${cpuModel.split(' ').slice(0, 2).join(' ')} (${cpuCores} cores)\nOS: ${platform} (${arch})`)
        ]);
        const healthSection = a2ui.column([
            a2ui.text('Health', { variant: 'h2' }),
            a2ui.text(`${health.replace(/[🟢🟡🔴] /u, '')}\nFree RAM: ${freeRamGb.toFixed(2)}GB`, { variant: 'caption' })
        ]);
        a2ui.root([title, statusImage, userSection, runtimeSection, systemSection, healthSection]);

        const nativeButtons = [
            { name: 'quick_reply', params: { display_text: '⦂ Menu', id: '.menu' } },
            { name: 'quick_reply', params: { display_text: '📡 Ping', id: '.ping' } },
            { name: 'quick_reply', params: { display_text: '👑 Owner', id: '.owner' } }
        ];

        try {
            await sendA2UIWidget(sock, chatId, {
                a2ui,
                bodyText: statusMessage,
                footer,
                buttons: nativeButtons,
                contextInfo: { expiration: 7776000 },
                quoted: message
            });
        } catch (e) {
            console.error('[alive] A2UI send failed:', e && e.message ? e.message : e);
            try {
                await sock.sendMessage(chatId, { text: statusMessage }, { quoted: message });
            } catch (ee) {
                console.error('[alive] fallback send failed', ee && ee.message ? ee.message : ee);
            }
        }

    } catch (error) {
        console.error('Critical Error in Alive Command:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ Imeshindikana kupata hali ya mfumo kwa sasa. Tafadhali jaribu tena.'
            }, { quoted: message });
        } catch (e) { }
    }
};

module.exports = aliveCommand;