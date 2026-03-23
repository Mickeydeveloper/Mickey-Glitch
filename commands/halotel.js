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

// Hakikisha folder la temp lipo (Ensure temp dir exists)
if (!fs.existsSync(CONFIG.TEMP_DIR)) fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });

const SELLER_JID = `${CONFIG.SELLER_NUMBER}@s.whatsapp.net`;

// ────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────
const formatTSh = (n) => new Intl.NumberFormat('en-TZ').format(n);

/**
 * Inasafisha namba iwe format ya 255... (Normalizes number to 255 format)
 */
function normalizeNumber(num) {
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.slice(1);
    if (cleaned.startsWith('7') || cleaned.startsWith('6')) cleaned = '255' + cleaned;
    return cleaned;
}

async function toPTT(buffer, ext) {
    const tmp = path.join(CONFIG.TEMP_DIR, `${Date.now()}.${ext}`);
    const out = `${tmp}.opus`;

    try {
        await fs.promises.writeFile(tmp, buffer);
        return await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', [
                '-y', '-i', tmp,
                '-vn', '-c:a', 'libopus', '-b:a', '128k',
                '-vbr', 'on', out
            ]);

            ff.on('error', reject);
            ff.on('close', async (code) => {
                if (code !== 0) return reject(new Error(`FFmpeg failed with code ${code}`));
                try {
                    const data = await fs.promises.readFile(out);
                    resolve(data);
                } catch (e) { reject(e); }
            });
        });
    } finally {
        // Futa mafaili kila mara (Always cleanup)
        [tmp, out].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    }
}

// ────────────────────────────────────────────────
// MAIN COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        // 1. DM Check
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '👋 *Habari!* Kwa usalama, fanya oda yako DM (For security, please order in DM).'
            }, { quoted: message });
        }

        const text = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const args = text.split(/\s+/).slice(1);

        // 2. Menu Display
        if (args.length < 2) {
            const menu = `🚀 *HALOTEL DATA SHOP* 🇹🇿\n\n` +
                `*Bei:* TSh ${formatTSh(CONFIG.PRICE_PER_GB)} / 1GB\n` +
                `*Kiwango cha Chini:* ${CONFIG.MIN_GB}GB\n\n` +
                `💡 *Jinsi ya kuagiza (How to order):*\n` +
                `\`.halotel <GB> <Namba>\`\n\n` +
                `✅ *Mfano:* \`.halotel 20 0612XXXXXX\``;

            return await sock.sendMessage(chatId, { text: menu }, { quoted: message });
        }

        // 3. Validation
        let gbAmount = parseInt(args[0]);
        let rawNumber = args[1];
        let phoneNumber = normalizeNumber(rawNumber);

        if (isNaN(gbAmount) || gbAmount < CONFIG.MIN_GB) {
            return await sock.sendMessage(chatId, { text: `⚠️ *Kosa:* Kiwango cha chini ni *${CONFIG.MIN_GB}GB*.` });
        }
        if (phoneNumber.length < 12) {
            return await sock.sendMessage(chatId, { text: `⚠️ *Kosa:* Namba ya Halotel siyo sahihi.` });
        }

        const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
        const orderRef = `HTL-${Math.random().toString(36).toUpperCase().substring(2, 7)}`;

        // 4. Invoice Content
        const orderInfo = `✨ *INVOICE: #${orderRef}* ✨\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📦 *Bidhaa:* Halotel Data\n` +
            `📊 *Kiasi:* ${gbAmount} GB\n` +
            `💵 *Malipo:* TSh ${formatTSh(totalCost)}\n` +
            `📱 *Namba:* ${phoneNumber}\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `*MAALUMLU:* Lipa kiasi cha *TSh ${formatTSh(totalCost)}* kwenda:\n` +
            `👤 *Jina:* ${CONFIG.SELLER_NAME}\n` +
            `📞 *Namba:* ${CONFIG.SELLER_NUMBER}\n\n` +
            `_Bonyeza kitufe hapo chini kuthibitisha malipo:_`;

        const buttons = [{
            urlButton: {
                displayText: '💳 Confirm Payment',
                url: `https://wa.me/${CONFIG.SELLER_NUMBER}?text=Nime lipa+${orderRef}+kiasi cha+${totalCost}+kwa+${gbAmount}GB+kwenda+${phoneNumber}`
            }
        }];

        let banner = null;
        try { banner = await getBuffer(CONFIG.BANNER); } catch (e) { console.log("Banner fetch failed"); }

        // 5. Send Professional Order
        await sendButtons(sock, chatId, orderInfo, CONFIG.FOOTER, buttons, message, {
            contextInfo: {
                externalAdReply: {
                    title: `ORDER: ${gbAmount}GB | TSh ${formatTSh(totalCost)}`,
                    body: `Ref ID: #${orderRef}`,
                    thumbnail: banner,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });

        // 6. Audio Background Task
        setTimeout(async () => {
            try {
                const { data } = await axios.get(CONFIG.AUDIO, { responseType: 'arraybuffer' });
                const ptt = await toPTT(Buffer.from(data), 'mp3');
                await sock.sendMessage(chatId, { audio: ptt, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
            } catch (err) { console.error('Audio Sys Error:', err.message); }
        }, 1000);

        // 7. Notify Seller
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *ODA MPYA (NEW ORDER)*\n\n` +
                `🆔 *Ref:* #${orderRef}\n` +
                `📦 *Bundle:* ${gbAmount}GB\n` +
                `💰 *Pesa:* TSh ${formatTSh(totalCost)}\n` +
                `📱 *Target:* ${phoneNumber}`
        });

    } catch (error) {
        console.error('Final Crash Protection:', error);
        await sock.sendMessage(chatId, { text: '❌ Samahani, mfumo una tatizo. Jaribu baadaye.' });
    }
}

module.exports = halotelCommand;
