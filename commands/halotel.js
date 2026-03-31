const { sendButtons, getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ────────────────────────────────────────────────
// CONFIGURATION (Boresha hapa)
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    MIN_GB: 10,
    SELLER_NUMBER: '255615944741',
    SELLER_NAME: 'MICKDADI HAMZA SALIM',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    AUDIO: 'https://files.catbox.moe/t80fnj.mp3',
    FOOTER: 'Mickey Glitch Technology © 2026',
    TEMP_DIR: path.join(__dirname, '../temp')
};

if (!fs.existsSync(CONFIG.TEMP_DIR)) fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });

const SELLER_JID = `${CONFIG.SELLER_NUMBER}@s.whatsapp.net`;

// ────────────────────────────────────────────────
// UTILS (Improved Logic)
// ────────────────────────────────────────────────
const formatTSh = (n) => new Intl.NumberFormat('en-TZ').format(n);

function normalizeNumber(num) {
    if (!num) return '';
    let cleaned = num.replace(/\D/g, ''); 
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.slice(1);
    else if (cleaned.length === 9) cleaned = '255' + cleaned;
    return cleaned;
}

// Optimized PTT conversion
async function toPTT(buffer, ext) {
    const tmp = path.join(CONFIG.TEMP_DIR, `${Date.now()}_in.${ext}`);
    const out = path.join(CONFIG.TEMP_DIR, `${Date.now()}_out.opus`);
    try {
        await fs.promises.writeFile(tmp, buffer);
        await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', ['-y', '-i', tmp, '-vn', '-acodec', 'libopus', '-ab', '128k', '-ar', '48000', out]);
            ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg error')));
            ff.on('error', reject);
        });
        return await fs.promises.readFile(out);
    } finally {
        [tmp, out].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    }
}

// ────────────────────────────────────────────────
// MAIN COMMAND (Modern UI)
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        // Group restriction with style
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '🔒 *SECURITY ALERT*\n\nHabari! Kwa usalama wa muamala wako, tafadhali agiza bundle kupitia *Private Message (DM)* pekee.'
            }, { quoted: message });
        }

        const fullText = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const matches = fullText.match(/\d+/g); 

        // --- MENU UI ---
        if (!matches || matches.length < 2) {
            const menu = `🌐 *HALOTEL DATA HUB* 🇹🇿\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💰 *OFFER:* TSh ${formatTSh(CONFIG.PRICE_PER_GB)} / 1GB\n` +
                `📉 *MINIMUM:* ${CONFIG.MIN_GB} GB\n\n` +
                `📝 *JINSI YA KUAGIZA:*\n` +
                `Andika: \`.halotel <KIASI> <NAMBA>\`\n\n` +
                `💡 *MFANO:* \`.halotel 10 0612xxxxxx\`\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `*Powered by Mickey Glitch*`;
            
            return await sock.sendMessage(chatId, { 
                image: { url: CONFIG.BANNER }, 
                caption: menu 
            }, { quoted: message });
        }

        let gbAmount = parseInt(matches[0]);
        let phoneNumber = normalizeNumber(matches[1]);

        // Validation UI
        if (gbAmount < CONFIG.MIN_GB) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *KOSA LA KIWANGO*\n\nSamahani, kiwango cha chini ni *${CONFIG.MIN_GB}GB*.\nJaribu tena na kiasi kuanzia ${CONFIG.MIN_GB}.` 
            }, { quoted: message });
        }

        if (phoneNumber.length !== 12) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *NAMBA BATILI*\n\nNamba ya simu uliyoweka haijakamilika au imekosewa. Hakikisha ni namba ya Halotel.` 
            }, { quoted: message });
        }

        const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
        const orderRef = `HTL-${Math.random().toString(36).toUpperCase().substring(2, 7)}`;

        // --- INVOICE UI (CARD STYLE) ---
        const invoice = `💳 *INVOICE: #${orderRef}*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📦 *HUDUMA:* Halotel Data\n` +
            `📊 *KIASI:* ${gbAmount} GB\n` +
            `💵 *GHARAMA:* TSh ${formatTSh(totalCost)}\n` +
            `📱 *LENGO:* ${phoneNumber}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🏦 *MAELEKEZO YA MALIPO:*\n` +
            `Lipa *TSh ${formatTSh(totalCost)}* kwenda:\n\n` +
            `👤 *JINA:* ${CONFIG.SELLER_NAME}\n` +
            `📞 *NAMBA:* ${CONFIG.SELLER_NUMBER}\n\n` +
            `_Bonyeza kitufe hapo chini kutuma uthibitisho._`;

        const buttons = [{
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: "💳 THIBITISHA MALIPO",
                url: `https://wa.me/${CONFIG.SELLER_NUMBER}?text=NIMELIPA+ODA+%23${orderRef}+TSh${totalCost}+KWA+${gbAmount}GB+KWENDA+${phoneNumber}`
            })
        }];

        let banner = await getBuffer(CONFIG.BANNER).catch(() => null);

        // Sending with Ad Reply (Professional Look)
        await sock.sendMessage(chatId, {
            text: invoice,
            footer: CONFIG.FOOTER,
            buttons: buttons,
            headerType: 4,
            contextInfo: {
                externalAdReply: {
                    title: `HALOTEL ORDER: ${gbAmount}GB`,
                    body: `Total: TSh ${formatTSh(totalCost)}`,
                    thumbnail: banner,
                    sourceUrl: `https://wa.me/${CONFIG.SELLER_NUMBER}`,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // Background Audio (Silent Error Handling)
        setTimeout(async () => {
            try {
                const { data } = await axios.get(CONFIG.AUDIO, { responseType: 'arraybuffer' });
                const ptt = await toPTT(Buffer.from(data), 'mp3');
                await sock.sendMessage(chatId, { 
                    audio: ptt, 
                    mimetype: 'audio/ogg; codecs=opus', 
                    ptt: true 
                }, { quoted: message });
            } catch (e) { /* ignore audio fail */ }
        }, 1000);

        // Alert Seller
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *Oda Mpya Imerekodiwa!*\n\n🆔 ID: #${orderRef}\n📊 Kiasi: ${gbAmount}GB\n📱 Simu: ${phoneNumber}\n💰 Thamani: TSh ${formatTSh(totalCost)}`
        });

    } catch (error) {
        console.error('Core Error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ *System Error:* Jaribu tena hivi punde.' });
    }
}

module.exports = halotelCommand;
