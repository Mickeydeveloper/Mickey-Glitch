const axios = require('axios');

/**
 * Get Profile Picture - ULTRA VERSION (Fix for Privacy/Error)
 * Inatumia Jid check kulazimisha server kutoa picha
 */
const getProfilePictureCommand = async (sock, m, args) => {
    if (!m || !m.key || !m.key.remoteJid) return;

    const chatId = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    try {
        let target = sender;

        if (args && args.length > 0) {
            let num = args[0].replace(/[^0-9]/g, '');
            if (num.length >= 9) target = num + '@s.whatsapp.net';
        } else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant;
        }

        const targetNum = target.split('@')[0];
        let profileUrl = null;

        // --- FIXED LOGIC: On-Demand Metadata Update ---
        try {
            // Hatua ya 1: Lazimisha bot "kuikumbuka" hii namba (Inasaidia bypass makosa mengi)
            await sock.onWhatsApp(target); 
            
            // Hatua ya 2: Jaribu kupata picha (High Resolution)
            profileUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            // Hatua ya 3: Fallback ya haraka kwa kutumia wa.me kama Baileys ikigoma
            try {
                const { data } = await axios.get(`https://wa.me/${targetNum}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
                    timeout: 5000
                });
                const match = data.match(/property="og:image" content="([^"]+)"/);
                if (match) profileUrl = match[1].replace(/&amp;/g, '&');
            } catch (err) {
                profileUrl = null;
            }
        }

        // Check kama picha ni ile ya default (Placeholder)
        if (!profileUrl || profileUrl.includes('default-user') || profileUrl.includes('privacy')) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Imeshindikana kwa namba ${targetNum}*\n\n*Sababu zinazoweza kuwa:* \n1. Bot imefikia kikomo cha maombi (Rate limit).\n2. Namba haina picha kabisa.\n3. WhatsApp inazuia kuona picha mpaka uwe na chat nae.`
            }, { quoted: m });
        }

        // Download na kutuma
        const res = await axios.get(profileUrl, { responseType: 'arraybuffer', timeout: 10000 });
        
        await sock.sendMessage(chatId, {
            image: Buffer.from(res.data),
            caption: `✅ *DP Imepatikana!*\n👤 @${targetNum}`,
            mentions: [target]
        }, { quoted: m });

    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu ya mfumo!' }, { quoted: m });
    }
};

module.exports = getProfilePictureCommand;
