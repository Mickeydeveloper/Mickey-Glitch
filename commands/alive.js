const moment = require('moment-timezone');
const owners = require('../data/owner.json');

/**
 * Mickey Glitch Alive Command - Interactive Button Version
 */

// Configuration Constants
const BOT_VERSION = 'v3.1.0';
const DEFAULT_OWNER = '255615944741';
const IMAGE_URL = 'https://water-billimg.onrender.com/1761205727440.png';
const TIMEZONE = 'Africa/Nairobi';

const aliveCommand = async (conn, chatId, message) => {
    try {
        const name = message.pushName || 'User';
        const owner = (Array.isArray(owners) && owners[0]) ? owners[0] : DEFAULT_OWNER;
        const uptime = formatUptime(process.uptime());
        const timestamp = moment.tz(TIMEZONE);

        const caption = [
            `*SYSTEM STATUS REPORT*`,
            `\n*Client:* ${name}`,
            `*Status:* Operational`,
            `*Uptime:* ${uptime}`,
            `*Date:* ${timestamp.format('DD MMMM YYYY')}`,
            `*Time:* ${timestamp.format('HH:mm:ss')} (EAT)`,
            `*Owner:* ${owner}`,
            `\n*Mickey Glitch ${BOT_VERSION}*`
        ].join('\n');

        // Kutengeneza Buttons
        const buttons = [
            { buttonId: '.owner', buttonText: { displayText: '👤 Chat with Owner' }, type: 1 },
            { buttonId: '.menu', buttonText: { displayText: '📜 View Menu' }, type: 1 },
            { buttonId: '.ping', buttonText: { displayText: '⚡ Check Speed' }, type: 1 }
        ];

        const messagePayload = {
            image: { url: IMAGE_URL },
            caption: caption,
            footer: '© Powered by Mickey Glitch',
            buttons: buttons,
            headerType: 4,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                showAdAttribution: true,
                externalAdReply: {
                    title: `MICKEY GLITCH ${BOT_VERSION}`,
                    body: "System Active",
                    mediaType: 1,
                    previewType: "PHOTO",
                    thumbnailUrl: IMAGE_URL,
                    sourceUrl: "https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V",
                    renderLargerThumbnail: false
                }
            }
        };

        return await conn.sendMessage(chatId, messagePayload, { quoted: message });

    } catch (error) {
        console.error(`[ALIVE_ERROR] ${new Date().toISOString()}:`, error.message);
        // Fallback: Tuma text pekee kama button zikileta hitilafu
        await conn.sendMessage(chatId, { text: `*Bot is Alive*\nUptime: ${formatUptime(process.uptime())}` });
    }
};

const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
};

module.exports = aliveCommand;
