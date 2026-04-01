const { sendButtons } = require('gifted-btns');
const { getBuffer } = require('../lib/myfunc');
const settings = require('../settings');
const { setPendingHalotelOrder, clearPendingHalotelOrder } = require('../lib/halotelSession');
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
    else if (cleaned.length === 9) cleaned = '255' + cleaned;
    return cleaned;
}

async function toPTT(buffer, ext) {
    const tmp = path.join(CONFIG.TEMP_DIR, `${Date.now()}_in.${ext}`);
    const out = path.join(CONFIG.TEMP_DIR, `${Date.now()}_out.opus`);
    try {
        await fs.promises.writeFile(tmp, buffer);
        await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', ['-y', '-i', tmp, '-vn', '-acodec', 'libopus', '-ab', '128k', out]);
            ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg error')));
            ff.on('error', reject);
        });
        return await fs.promises.readFile(out);
    } finally {
        [tmp, out].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    }
}

// ────────────────────────────────────────────────
// MAIN COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, message, userMessage = '') {
    try {
        // Halotel pay-list callback handling: pay_<network>_<orderRef>
        const payload = (userMessage || '').toString().trim();
        if (payload.startsWith('pay_')) {
            const parts = payload.split('_');
            const network = parts[1] || '';
            const orderRef = parts.slice(2).join('_') || 'unknown';
            const methods = {
                halo: `Halopesa: Tuma pesa kwa namba *${CONFIG.SELLER_NUMBER}* ili kumaliza malipo.\nTuma ujumbe: HALO ${orderRef} kama inahitajika.`,
                voda: `M-Pesa (Vodacom): Tuma pesa kwa namba *07xxxxxxx*.\nAngalia Maelekezo ya M-Pesa kwa usalama.`,
                tigo: `Tigo Pesa: Tuma pesa kwa namba *0711765335*.\nTumia maelekezo ya Tigo Pesa kwa uthibitisho.`
            };
            const methodText = methods[network] || 'Chagua njia sahihi ya malipo katika menu.';

            const response = await sock.sendMessage(chatId, {
                text: `✅ *UTACHAGUA UTOAJI WA MALIPO*

*Order:* #${orderRef}
*Njia:* ${network.toUpperCase()}

${methodText}

Mara baada ya malipo, tuma screenshot au ujumbe kwa muuzaji ili kuthibitisha.`
            }, { quoted: message });

            // Clear stored pending ref once payment method is selected
            clearPendingHalotelOrder(chatId);
            return response;
        }

        // Usalama wa Group
        if (chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '🔒 *USALAMA KWANZA*\n\nHabari! Tafadhali agiza bundle kupitia *Private Message (DM)* kwa usalama wa muamala wako.'
            }, { quoted: message });
        }

        const fullText = (userMessage || message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const matches = fullText.match(/\d+/g); 

        // --- MENU YA AWALI (KAMA HAKUNA DATA) ---
        if (!matches || matches.length < 2) {
            const menu = `🌐 *HALOTEL DATA SHOP* 🇹🇿\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💰 *BEI:* TSh ${formatTSh(CONFIG.PRICE_PER_GB)} / 1GB\n` +
                `📉 *MINIMUM:* ${CONFIG.MIN_GB} GB\n` +
                `⚡ *HARAKA:* Huduma Kwa Wateja Binafsi & Biashara\n\n` +
                `📝 *JINSI YA KUAGIZA:*\n` +
                `1) Chagua kivungo hapa chini\n` +
                `2) Au andika: \.halotel <GB> <NAMBA>\n` +
                `3) Fuata maagizo ya malipo\n\n` +
                `💡 *MFANO:* \.halotel 10 0615xxxxxx\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `*${CONFIG.FOOTER}*`;
            
            return await sendButtons(sock, chatId, {
                title: '🌐 HALOTEL DATA SHOP',
                text: menu,
                footer: CONFIG.FOOTER,
                image: { url: CONFIG.BANNER },
                buttons: [
                    { id: '.halotel 10 0615xxxxxx', text: '⚡ Agiza 10GB' },
                    { id: '.halotel 20 0615xxxxxx', text: '🔥 Agiza 20GB' },
                    { id: '.help', text: '🆘 Msaada' }
                ]
            }, { quoted: message });
        }

        let gbAmount = parseInt(matches[0]);
        let phoneNumber = normalizeNumber(matches[1]);

        // Validations
        if (gbAmount < CONFIG.MIN_GB) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *KOSA:* Kiwango cha chini ni *${CONFIG.MIN_GB}GB*.\nJaribu tena na kiasi kikubwa zaidi.` 
            }, { quoted: message });
        }

        if (phoneNumber.length !== 12) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *KOSA:* Namba ya simu (${matches[1]}) siyo sahihi. Hakikisha ni namba ya Halotel.` 
            }, { quoted: message });
        }

        const totalCost = gbAmount * CONFIG.PRICE_PER_GB;
        const orderRef = `HTL-${Math.random().toString(36).toUpperCase().substring(2, 7)}`;
        setPendingHalotelOrder(chatId, orderRef);

        // --- 1. TUMA INVOICE (CARD STYLE) ---
        const invoice = `💳 *INVOICE: #${orderRef}*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📦 *HUDUMA:* Halotel Data\n` +
            `📊 *KIASI:* ${gbAmount} GB\n` +
            `💵 *GHARAMA:* TSh ${formatTSh(totalCost)}\n` +
            `📱 *LENGO:* ${phoneNumber}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🚨 *MAELEKEZO:* Chagua njia ya malipo hapo chini ili kupata namba ya kulipia.`;

        let banner = await getBuffer(CONFIG.BANNER).catch(() => null);

        await sock.sendMessage(chatId, {
            text: invoice,
            contextInfo: {
                externalAdReply: {
                    title: `AGIZO: ${gbAmount}GB | #${orderRef}`,
                    body: `Jumla: TSh ${formatTSh(totalCost)}`,
                    thumbnail: banner,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        // --- 2. TUMA MENU YA MALIPO (INTERACTIVE LIST) ---
        const sections = [
            {
                title: "CHAGUA MTANDAO WA KULIPIA",
                rows: [
                    { 
                        title: "Halopesa", 
                        rowId: `pay_halo_${orderRef}`, 
                        description: `Lipa TSh ${formatTSh(totalCost)} kwenda ${CONFIG.SELLER_NUMBER}` 
                    },
                    { 
                        title: "M-Pesa (Vodacom)", 
                        rowId: `pay_voda_${orderRef}`, 
                        description: `Lipa TSh ${formatTSh(totalCost)} kwenda 07xxxxxxx` 
                    },
                    { 
                        title: "Tigo Pesa", 
                        rowId: `pay_tigo_${orderRef}`, 
                        description: `Lipa TSh ${formatTSh(totalCost)} kwenda 06xxxxxxx` 
                    }
                ]
            }
        ];

        const listMessage = {
            text: "👇 *BONYEZA KITUFE HAPA CHINI:*",
            footer: CONFIG.FOOTER,
            title: "💳 CHAGUA NJIA YA MALIPO",
            buttonText: "CHAGUA MTANDAO",
            sections
        };

        await sock.sendMessage(chatId, listMessage, { quoted: message });

        // --- 3. AUDIO RESPONSE (OPTIONAL) ---
        setTimeout(async () => {
            try {
                const { data } = await axios.get(CONFIG.AUDIO, { responseType: 'arraybuffer' });
                const ptt = await toPTT(Buffer.from(data), 'mp3');
                await sock.sendMessage(chatId, { audio: ptt, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
            } catch (e) {}
        }, 2000);

        // Alert kwa Muuzaji
        await sock.sendMessage(SELLER_JID, {
            text: `🔔 *ODA MPYA!*\nRef: #${orderRef}\nKiasi: ${gbAmount}GB\nSimu: ${phoneNumber}\nThamani: TSh ${formatTSh(totalCost)}`
        });

    } catch (error) {
        console.error('Core Error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ *System Error:* Jaribu tena hivi punde.' });
    }
}

module.exports = halotelCommand;
