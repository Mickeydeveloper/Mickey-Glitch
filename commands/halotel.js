const { sendButtons, getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ────────────────────────────────────────────────
// CONFIGURATION
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
// UTILS
// ────────────────────────────────────────────────
const formatTSh = (n) => new Intl.NumberFormat('en-TZ').format(n);

function normalizeNumber(num) {
    if (!num) return '';
    let cleaned = num.replace(/\D/g, ''); 
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.slice(1);
    if (cleaned.length === 9) cleaned = '255' + cleaned;
    return cleaned;
}

async function toPTT(buffer, ext) {
    const tmp = path.join(CONFIG.TEMP_DIR, `${Date.now()}.${ext}`);
    const out = `${tmp}.opus`;
    try {
        await fs.promises.writeFile(tmp, buffer);
        return await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', ['-y', '-i', tmp, '-vn', '-c:a', 'libopus', '-b:a', '128k', out]);
            ff.on('close', async (code) => {
                if (code !== 0) return reject(new Error('FFmpeg error'));
                resolve(await fs.promises.readFile(out));
            });
            ff.on('error', reject);
        });
    } finally {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        if (fs.existsSync(out)) fs.unlinkSync(out);
    }
}

// ────────────────────────────────────────────────
// MAIN COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '👋 *Habari!* Kwa usalama, tafadhali agiza bundle DM (Private Message).'
            }, { quoted: message });
        }

        const fullText = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        
        // --- SMART EXTRACTION ---
        // Hii inatafuta namba zote, hata kama zimeambatana na herufi (kama gb10)
        const matches = fullText.match(/\d+/g); 

        if (!matches || matches.length < 2) {
            const menu = `🚀 *HALOTEL DATA SHOP* 🇹🇿\n\n` +
                `*Bei:* TSh ${formatTSh(CONFIG.PRICE_PER_GB)} / 1GB\n` +
                `*Kiwango cha Chini:* ${CONFIG.MIN_GB}GB\n\n` +
                `💡 *Jinsi ya kuagiza:*\n` +
                `Andika: \`.halotel <GB> <Namba>\`\n\n` +
                `✅ *Mfano:* \`.halotel gb10 0612xxxxxx\``;
            return await sock.sendMessage(chatId, { text: menu }, { quoted: message });
        }

        // Namba ya kwanza ni GB (hata ikiwa gb10, itachukua 10)
        // Namba ya pili ni Simu
        let gbAmount = parseInt(matches[0]);
        let phoneNumber = normalizeNumber(matches[1]);

        // Validation
        if (gbAmount < CONFIG.MIN_GB) {
            return await sock.sendMessage(chatId, { 
                text: `⚠️ *Kosa:* Kiwango cha chini ni *${CONFIG.MIN_GB}GB*. Wewe umeweka *${gbAmount}GB*.` 
            }, { quoted: message });
        }

        if (phoneNumber.length < 12) {
            return await sock.sendMessage(chatId, { text: `⚠️ *Kosa:* Namba ya simu (${matches[1]}) siyo sahihi.` });
        }

        const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
        const orderRef = `HTL-${Math.random().toString(36).toUpperCase().substring(2, 7)}`;

        const orderInfo = `✨ *INVOICE: #${orderRef}* ✨\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📦 *Bidhaa:* Halotel Data\n` +
            `📊 *Kiasi:* ${gbAmount} GB\n` +
            `💵 *Malipo:* TSh ${formatTSh(totalCost)}\n` +
            `📱 *Namba:* ${phoneNumber}\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `*MALIPO:* Lipa kiasi cha *TSh ${formatTSh(totalCost)}* kwenda:\n` +
            `👤 *Jina:* ${CONFIG.SELLER_NAME}\n` +
            `📞 *Namba:* ${CONFIG.SELLER_NUMBER}\n\n` +
            `_Bonyeza button hapo chini kuthibitisha:_`;

        const buttons = [{
            urlButton: {
                displayText: '💳 Thibitisha Malipo',
                url: `https://wa.me/${CONFIG.SELLER_NUMBER}?text=Nime lipa+${orderRef}+TSh${totalCost}+kwa+${gbAmount}GB+kwenda+${phoneNumber}`
            }
        }];

        let banner = null;
        try { banner = await getBuffer(CONFIG.BANNER); } catch (e) {}

        await sendButtons(sock, chatId, orderInfo, CONFIG.FOOTER, buttons, message, {
            contextInfo: {
                externalAdReply: {
                    title: `AGIZO: ${gbAmount}GB | #${orderRef}`,
                    body: `Jumla: TSh ${formatTSh(totalCost)}`,
                    thumbnail: banner,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });

        // Response ya sauti (Background)
        setTimeout(async () => {
            try {
                const { data } = await axios.get(CONFIG.AUDIO, { responseType: 'arraybuffer' });
                const ptt = await toPTT(Buffer.from(data), 'mp3');
                await sock.sendMessage(chatId, { audio: ptt, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
            } catch (err) {}
        }, 1500);

        // Seller Alert
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *ODA MPYA*\nRef: #${orderRef}\nKiasi: ${gbAmount}GB\nSimu: ${phoneNumber}\nThamani: TSh ${formatTSh(totalCost)}`
        });

    } catch (error) {
        console.error('Crash Protection:', error);
        await sock.sendMessage(chatId, { text: '❌ Samahani, jaribu tena baadaye.' });
    }
}

module.exports = halotelCommand;
