const os = require('os');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require('axios');

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
    console.log('[alive] invoked for', chatId, 'from', message.key?.participant || message.key?.remoteJid);

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

        const network = getNetworkStats();
        const uptime = formatUptime(process.uptime());
        const platform = os.platform() === 'linux' ? '🐧 𝐋𝐢𝐧𝐮𝐱' : os.platform() === 'win32' ? '🪟 𝐖𝐢𝐧𝐝𝐨𝐰𝐬' : '📱 𝐀𝐧𝐝𝐫𝐨𝐢ډ';
        const arch = os.arch() === 'x64' ? '64-ʙɪᴛ' : os.arch();

        const botStartTime = global.botStartTime || Date.now();
        const botUptime = formatUptime(Math.floor((Date.now() - botStartTime) / 1000));

        const imageUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/chatbot.png';

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

        const footer = '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲';

        const fetchBuffer = async (url) => {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            return Buffer.from(res.data);
        };

        async function resizeImg(buffer, width = 300, height = 300) {
            try {
                const sharp = require('sharp');
                return await sharp(buffer).resize(width, height, { fit: 'cover' }).toBuffer();
            } catch {
                return buffer;
            }
        }

        const nativeButtons = [
            { buttonId: '.menu', buttonText: { displayText: '⦂ Menu' }, type: 1 },
            { buttonId: '.ping', buttonText: { displayText: '📡 Ping' }, type: 1 },
            { buttonId: '.owner', buttonText: { displayText: '👑 Owner' }, type: 1 }
        ];

        const sendNativeButtonV2 = async () => {
            let thumbnailBuffer = null;
            if (imageUrl) {
                try {
                    const buf = await fetchBuffer(imageUrl);
                    thumbnailBuffer = await resizeImg(buf, 300, 300);
                } catch (e) {
                    console.error('[alive] thumbnail fetch failed', e && e.message ? e.message : e);
                }
            }

            const contextInfo = {
                forwardingScore: 999,
                isForwarded: true,
            };
            const mentionJid = message.key?.participant || message.key?.remoteJid;
            if (mentionJid) contextInfo.mentionedJid = [mentionJid];

            const msg = generateWAMessageFromContent(chatId, {
                buttonsMessage: {
                    contentText: statusMessage,
                    footerText: footer,
                    headerType: 6,
                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        name: botName,
                        address: 'Status',
                        jpegThumbnail: thumbnailBuffer
                    },
                    viewOnce: true,
                    contextInfo,
                    buttons: nativeButtons
                }
            }, { userJid: (sock && sock.user && sock.user.id) || '' });

            await sock.relayMessage(chatId, msg.message, {
                messageId: msg.key.id,
                additionalNodes: [
                    {
                        tag: 'biz',
                        attrs: {},
                        content: [
                            {
                                tag: 'interactive',
                                attrs: { type: 'native_flow', v: '1' },
                                content: [
                                    {
                                        tag: 'native_flow',
                                        attrs: { v: '9', name: 'mixed' }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
        };

        try {
            await sendNativeButtonV2();
        } catch (e) {
            console.error('[alive] sendNativeButtonV2 failed:', e && e.message ? e.message : e);
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
                text: '❌ *System Error:* Unable to fetch status.\n```' + error.message + '```' 
            }, { quoted: message });
        } catch (e) { }
    }
};

module.exports = aliveCommand;