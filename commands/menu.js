/**
 * @project: MICKEY GLITCH V3.0.5 (FIXED MENU WITH CTX / STANDARD SEND)
 * @author: Quantum Base Developer (TZ)
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// ==============================================
// 📊 SYSTEM STATS & MENU HELPERS
// ==============================================
const getSystemStats = () => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h`,
        memoryUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
    };
};

const getGreeting = (hour) => {
    if (hour >= 0 && hour <= 4) return { text: 'Usiku sana', emoji: '🌙' };
    if (hour >= 5 && hour <= 11) return { text: 'Asubuhi', emoji: '☀️' };
    if (hour >= 12 && hour <= 16) return { text: 'Mchana', emoji: '🎉' };
    if (hour >= 17 && hour <= 18) return { text: 'Jioni', emoji: '🌤️' };
    return { text: 'Usiku', emoji: '🌙' };
};

// ==============================================
// 🚀 FIXED MENU COMMAND (USING CTX / SAFE SEND)
// ==============================================
const menuCommand = async (ctx) => {
    try {
        // Support zote mbili: zikiwa 'ctx' au '(sock, chatId, m)'
        const sock = ctx.sock || ctx;
        const chatId = ctx.chat || ctx.from || (arguments[1] ? arguments[1] : null);
        const m = ctx.m || ctx.msg || (arguments[2] ? arguments[2] : ctx);

        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        const userName = m.pushName || 'User';
        const greeting = getGreeting(hour);
        const stats = getSystemStats();

        const date = now.format('DD MMMM YYYY'); 
        const time = now.format('HH:mm:ss');

        // Ujumbe Mkuu
        let text = `*-Question*\n`;
        text += `> _Dibenci oleh parah idiot adalah harga yang harus kamu bayar karena tidak menjadi salah satu dari mereka._\n`;
        text += `> 「 ⓘ. Mickey Glitch V3.0.5 」\n\n`;
        text += `Hõlá *${userName}*, habari ya ${greeting.text} ${greeting.emoji}\n`;
        text += `📅 *Date:* ${date}\n`;
        text += `🕒 *Time:* ${time}\n\n`;
        
        text += `▢ *INFORMÇÃO*\n`;
        text += ` ├─ ▢ *Author*: MickeyGlitch\n`;
        text += ` ├─ ▢ *Prefix*: Multi\n`;
        text += ` ├─ ▢ *Uptime*: ${stats.uptime}\n`;
        text += ` └─ ▢ *RAM Used*: ${stats.memoryUsed} MB\n\n`;
        text += `*MickeyGlitch 🦠*`;

        // Tumia njia salama ya Picha na Text badala ya relayMessage iliyoharibika
        const imageBuffer = { url: "https://files.catbox.moe/o8202x.jpg" }; // au tumia buffer yako ya picha

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: text,
            contextInfo: {
                externalAdReply: {
                    title: "Mickey Glitch | ONLINE",
                    body: "Status: Connected & Ready",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: false
                }
            }
        }, { quoted: m });

    } catch (e) {
        console.error('Menu Fix Error:', e);
    }
};

module.exports = menuCommand;
