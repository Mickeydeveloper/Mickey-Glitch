/**
 * PING & SYSTEM COMMANDS - MICKEY GLITCH
 * Optimized UI/UX - Clean & Fast (Native Button V2 Muundo)
 */

const os = require('os');
const { performance } = require('perf_hooks');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// CONFIGURATION
const CONFIG = {
    FOOTER: '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲',
    BANNER: 'https://github.com/Mickeymozy/Mickey-Vip/blob/main/chatbot.png?raw=true'
};

// ============================================================
// 🎨 FORMATTING FUNCTIONS
// ============================================================

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}ᴅ`);
    if (hours > 0) parts.push(`${hours}ʜ`);
    if (minutes > 0) parts.push(`${minutes}ᴍ`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}

function getSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus() || [];
    let cpuLoad = 10.0;
    try {
        const loadAvg = os.loadavg();
        cpuLoad = Math.min(100, Math.max(0, (loadAvg[0] / cpus.length) * 100)) || 12.5;
    } catch (e) {}

    return {
        cpu: { cores: cpus.length, load: cpuLoad },
        memory: { used: usedMem, total: totalMem, percent: memPercent },
        os: { uptime: os.uptime() },
        process: { uptime: process.uptime() }
    };
}

// ============================================================
// 🖥️ PING COMMAND
// ============================================================

async function pingCommand(sock, chatId, message) {
    try {
        const start = performance.now();
        const info = getSystemInfo();
        const latency = Math.round(performance.now() - start);

        const time = new Date().toLocaleTimeString('en-US', { 
            timeZone: 'Africa/Dar_es_Salaam', 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const botUptime = formatUptime(info.process.uptime);
        const pingEmoji = latency < 100 ? '🟢' : latency < 200 ? '🟡' : '🔴';

        // Muonekano ulioboreshwa (Clean & Premium Layout)
        const text = `📡 *Mickey Glitch Speedtest*

*— PERFORMANCE —*
⚡ *Ping:* ${latency}ms ${pingEmoji}
⏱️ *Uptime:* ${botUptime}
🕐 *Time:* ${time} EAT

*— SERVER STATS —*
🖥️ *CPU:* ${info.cpu.cores} Cores
💾 *RAM:* ${formatBytes(info.memory.used)} / ${formatBytes(info.memory.total)} (${info.memory.percent.toFixed(1)}%)

_Mickey Glitch Technology™_`;

        const nativeButtons = [
            { buttonId: '.menu', buttonText: { displayText: '⦂ Menu' }, type: 1 },
            { buttonId: '.owner', buttonText: { displayText: '👑 Owner' }, type: 1 }
        ];

        await sendNativeButtonV2(sock, chatId, message, text, CONFIG.FOOTER, "📡 LATENCY CHECK", nativeButtons);

    } catch (error) {
        console.error('Ping Error:', error);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Tafadhali jaribu tena.' 
            }, { quoted: message });
        } catch (e) {}
    }
}

// Muundo ule ule kamili wa kutuma picha na button kama kwenye alive
async function sendNativeButtonV2(sock, chatId, message, textBody, footerText, headerName, buttonsList) {
    try {
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

        let thumbnailBuffer = null;
        if (CONFIG.BANNER) {
            try {
                const buf = await fetchBuffer(CONFIG.BANNER);
                thumbnailBuffer = await resizeImg(buf, 300, 300);
            } catch (e) {
                console.error('[ping] thumbnail fetch failed', e && e.message ? e.message : e);
            }
        }

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
        };
        const mentionJid = message?.key?.participant || message?.key?.remoteJid;
        if (mentionJid) contextInfo.mentionedJid = [mentionJid];

        const msg = generateWAMessageFromContent(chatId, {
            buttonsMessage: {
                contentText: textBody,
                footerText: footerText,
                headerType: 6,
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: headerName,
                    address: 'Speedtest',
                    jpegThumbnail: thumbnailBuffer
                },
                viewOnce: true,
                contextInfo,
                buttons: buttonsList
            }
        }, { userJid: (sock && sock.user && sock.user.id) || '', quoted: message || undefined });

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key?.id || sock.generateMessageID(),
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
    } catch (err) {
        console.error('sendNativeButtonV2 error inside ping:', err);
        await sock.sendMessage(chatId, { text: textBody }, { quoted: message });
    }
}

module.exports = pingCommand;
