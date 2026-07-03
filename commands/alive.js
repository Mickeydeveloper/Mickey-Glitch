const os = require('os');
const { performance } = require('perf_hooks');
const { sendInteractiveMessage } = require('gifted-btns');
const fs = require('fs');
const path = require('path');
const { MBuilder } = require('../lib/mbuilder'); // Imeongezwa kwa ajili ya ALRICH

/**
 * Formats seconds into a human-readable string (d h m s)
 */
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}${d === 1 ? 'ᴅ' : 'ᴅ'}`);
    if (h > 0) parts.push(`${h}${h === 1 ? 'ʜ' : 'ʜ'}`);
    if (m > 0) parts.push(`${m}${m === 1 ? 'ᴍ' : 'ᴍ'}`);
    parts.push(`${s}${s === 1 ? 'ꜱ' : 'ꜱ'}`);

    return parts.join(' ');
};

/**
 * Get bot name from config
 */
const getBotName = () => {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath));
            return config.botName || '𝐌𝐈𝐂𝐊𝐄𝐘-𝐕𝟑';
        }
    } catch (e) {}
    return '𝐌𝐈𝐂𝐊𝐄𝐘-𝐕𝟑';
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
 * Get system load average
 */
const getSystemLoad = () => {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    return {
        '1m': (loadAvg[0] / cpuCount * 100).toFixed(1),
        '5m': (loadAvg[1] / cpuCount * 100).toFixed(1),
        '15m': (loadAvg[2] / cpuCount * 100).toFixed(1)
    };
};

/**
 * Get network stats
 */
const getNetworkStats = () => {
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'N/A';
    let macAddress = 'N/A';

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ipAddress = iface.address;
                macAddress = iface.mac;
                break;
            }
        }
        if (ipAddress !== 'N/A') break;
    }

    return { ipAddress, macAddress };
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
    const startTime = performance.now();

    try {
        // System Calculations
        const botName = getBotName();
        const formattedDate = getFormattedDate();

        const time = new Date().toLocaleTimeString('en-US', { 
            timeZone: 'Africa/Dar_es_Salaam', 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const latency = (performance.now() - startTime).toFixed(0);
        const pingEmoji = latency < 100 ? '🟢' : latency < 200 ? '🟡' : '🔴';

        const totalRam = os.totalmem() / Math.pow(1024, 3);
        const usedRam = process.memoryUsage().heapUsed / Math.pow(1024, 3);
        const freeRam = totalRam - usedRam;
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);
        const ramBar = progressBar(parseFloat(ramPercent), 12);

        const cpuModel = os.cpus()[0]?.model.split('@')[0].trim() || 'Generic CPU';
        const cpuCores = os.cpus().length;
        const cpuLoad = getSystemLoad();

        const network = getNetworkStats();
        const uptime = formatUptime(process.uptime());
        const platform = os.platform() === 'linux' ? '🐧 𝐋𝐢𝐧𝐮𝐱' : os.platform() === 'win32' ? '🪟 𝐖𝐢𝐧𝐝𝐨𝐰𝐬' : '📱 𝐀𝐧𝐝𝐫𝐨𝐢𝐝';
        const arch = os.arch() === 'x64' ? '64-ʙɪᴛ' : os.arch();

        // Node.js version
        const nodeVersion = process.version.replace('v', '');

        // Get bot uptime
        const botStartTime = global.botStartTime || Date.now();
        const botUptime = formatUptime(Math.floor((Date.now() - botStartTime) / 1000));

        const imageUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png';

        const statusMessage = `🚀 *${botName} Status*

*— USER INFO —*
👤 *Name:* ${message.pushName || 'Guest'}
📅 *Date:* ${formattedDate}
🕐 *Time:* ${time} EAT
⚡ *Ping:* ${latency}ms ${pingEmoji}

*— BOT RUNTIME —*
🤖 *Bot Uptime:* ${botUptime}
🖥️ *Server Uptime:* ${uptime}

*— SYSTEM —*
💾 *RAM:* ${ramPercent}% (${usedRam.toFixed(1)}GB)
📊 ${ramBar}
🖥️ *CPU:* ${cpuModel.split(' ').slice(0, 2).join(' ')} (${cpuCores} cores)
🐧 *OS:* ${platform} (${arch})
📍 *IP:* \`${network.ipAddress}\`

*— HEALTH —*
${ramPercent < 70 ? '🟢 Status: Perfect' : ramPercent < 85 ? '🟡 Status: Stable' : '🔴 Status: Heavy'}
💡 *Free:* ${freeRam.toFixed(2)}GB

_Mickey Glitch Technology™_`;

        // Huundaji wa payload ya ALRICH kwa ajili ya maandishi ya ujumbe
        let richTextPayload = { text: statusMessage };
        const aiRich = MBuilder.buildAIRich(statusMessage);
        if (aiRich) {
            richTextPayload = aiRich;
        }

        await sendInteractiveMessage(sock, chatId, {
            ...richTextPayload,
            contextInfo: {
                mentionedJid: [chatId],
                externalAdReply: {
                    title: `🚀 ${botName} | 𝐎𝐍𝐋𝐈𝐍𝐄`,
                    body: '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲',
                    thumbnailUrl: imageUrl,
                    sourceUrl: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            },
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📜 𝐌𝐄𝐍𝐔', 
                        id: '.menu' 
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '📡 𝐒𝐏𝐄𝐄𝐃', 
                        id: '.ping' 
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '👑 𝐎𝐖𝐍𝐄𝐑', 
                        id: '.owner' 
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ 
                        display_text: '⚡ 𝐑𝐔𝐍𝐓𝐈𝐌𝐄', 
                        id: '.runtime' 
                    })
                }
            ]
        }, { quoted: message });

    } catch (error) {
        console.error('Critical Error in Alive Command:', error);
        try {
            let errorText = '❌ *System Error:* Unable to fetch status.\n```' + error.message + '```';
            const aiRichError = MBuilder.buildAIRich(errorText);
            
            await sock.sendMessage(chatId, aiRichError ? aiRichError : { text: errorText }, { quoted: message });
        } catch (e) { }
    }
};

module.exports = aliveCommand;
